import { db } from "@/server/db/client";
import { conflict, notFound, validationFailed } from "@/server/errors";
import { recordModerationEventTx } from "@/server/modules/admin/audit";
import type { StaffViewer } from "@/server/modules/admin/guard";
import type { InterestStatus } from "@/generated/prisma/enums";

/**
 * Interest curation.
 *
 * Members can add their own interests, which is what keeps the taxonomy alive —
 * and also what fills it with near-duplicates ("boardgames", "Board Gaming").
 * Left alone, those fragment the matching signal: two people who share a passion
 * score as strangers because they typed it differently.
 *
 * So the important action here is not approve or reject, it is **merge**.
 */

export interface InterestAdminQuery {
  q?: string;
  status?: InterestStatus;
  customOnly?: boolean;
  limit?: number;
}

export async function listInterestsForAdmin(query: InterestAdminQuery = {}) {
  const limit = Math.min(query.limit ?? 100, 300);
  const needle = query.q?.trim();

  const interests = await db.interest.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customOnly ? { isCustom: true } : {}),
      ...(needle
        ? {
            OR: [
              { label: { contains: needle, mode: "insensitive" as const } },
              { slug: { contains: needle, mode: "insensitive" as const } },
              { category: { contains: needle, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { usageCount: "desc" }],
    take: limit,
    select: {
      id: true,
      slug: true,
      label: true,
      category: true,
      description: true,
      aliases: true,
      isCustom: true,
      status: true,
      usageCount: true,
      createdAt: true,
      _count: { select: { users: true, bunches: true } },
    },
  });

  return interests.map((i) => ({
    id: i.id,
    slug: i.slug,
    label: i.label,
    category: i.category,
    description: i.description,
    aliases: i.aliases,
    isCustom: i.isCustom,
    status: i.status,
    usageCount: i.usageCount,
    memberCount: i._count.users,
    bunchCount: i._count.bunches,
    createdAt: i.createdAt.toISOString(),
  }));
}

export async function setInterestStatus(
  actor: StaffViewer,
  interestId: string,
  status: Extract<InterestStatus, "APPROVED" | "REJECTED">,
  reason: string,
): Promise<void> {
  const interest = await db.interest.findUnique({
    where: { id: interestId },
    select: { id: true, label: true, status: true },
  });
  if (!interest) throw notFound("No such interest.");
  if (interest.status === status) throw conflict("Already in that state.");

  await db.$transaction(async (tx) => {
    await tx.interest.update({ where: { id: interestId }, data: { status } });
    await recordModerationEventTx(tx, {
      actor,
      action: status === "APPROVED" ? "INTEREST_APPROVED" : "INTEREST_REJECTED",
      targetType: "INTEREST",
      targetId: interestId,
      reason,
      metadata: { label: interest.label, from: interest.status },
    });
  });
}

export interface UpdateInterestInput {
  label?: string;
  category?: string;
  description?: string | null;
  aliases?: string[];
}

export async function updateInterest(
  actor: StaffViewer,
  interestId: string,
  input: UpdateInterestInput,
): Promise<void> {
  const interest = await db.interest.findUnique({
    where: { id: interestId },
    select: { id: true, label: true },
  });
  if (!interest) throw notFound("No such interest.");

  await db.$transaction(async (tx) => {
    await tx.interest.update({
      where: { id: interestId },
      data: {
        ...(input.label ? { label: input.label.trim() } : {}),
        ...(input.category ? { category: input.category.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
        ...(input.aliases
          ? {
              aliases: [
                ...new Set(
                  input.aliases.map((a) => a.trim().toLowerCase()).filter(Boolean),
                ),
              ],
            }
          : {}),
      },
    });
    await recordModerationEventTx(tx, {
      actor,
      action: "INTEREST_UPDATED",
      targetType: "INTEREST",
      targetId: interestId,
      reason: "Edited",
      metadata: { changes: input as Record<string, unknown> },
    });
  });
}

/**
 * Folds `sourceId` into `targetId`.
 *
 * Every member and bunch tagged with the source is retagged to the target, the
 * source's label is kept as an alias so searching for it still works, and the
 * source row is removed. Where someone already holds both, the stronger of the
 * two strengths wins rather than the merge silently downgrading them.
 */
export async function mergeInterests(
  actor: StaffViewer,
  sourceId: string,
  targetId: string,
  reason: string,
): Promise<{ movedMembers: number; movedBunches: number }> {
  if (sourceId === targetId) {
    throw validationFailed("An interest can't be merged into itself.");
  }

  const [source, target] = await Promise.all([
    db.interest.findUnique({
      where: { id: sourceId },
      select: { id: true, slug: true, label: true },
    }),
    db.interest.findUnique({
      where: { id: targetId },
      select: { id: true, slug: true, label: true, aliases: true },
    }),
  ]);
  if (!source || !target) throw notFound("One of those interests is gone.");

  return db.$transaction(async (tx) => {
    const [sourceUsers, targetUsers] = await Promise.all([
      tx.userInterest.findMany({
        where: { interestId: sourceId },
        select: { profileId: true, strength: true, intent: true },
      }),
      tx.userInterest.findMany({
        where: { interestId: targetId },
        select: { profileId: true, strength: true },
      }),
    ]);
    const targetStrength = new Map(
      targetUsers.map((u) => [u.profileId, u.strength] as const),
    );

    let movedMembers = 0;
    for (const row of sourceUsers) {
      const existing = targetStrength.get(row.profileId);
      if (existing === undefined) {
        await tx.userInterest.create({
          data: {
            profileId: row.profileId,
            interestId: targetId,
            strength: row.strength,
            intent: row.intent,
          },
        });
        movedMembers += 1;
      } else if (row.strength > existing) {
        // Keep the stronger signal rather than whichever row happened to exist.
        await tx.userInterest.update({
          where: {
            profileId_interestId: {
              profileId: row.profileId,
              interestId: targetId,
            },
          },
          data: { strength: row.strength },
        });
      }
    }

    const sourceBunches = await tx.bunchInterest.findMany({
      where: { interestId: sourceId },
      select: { bunchId: true },
    });
    const targetBunches = new Set(
      (
        await tx.bunchInterest.findMany({
          where: { interestId: targetId },
          select: { bunchId: true },
        })
      ).map((b) => b.bunchId),
    );

    let movedBunches = 0;
    for (const row of sourceBunches) {
      if (targetBunches.has(row.bunchId)) continue;
      await tx.bunchInterest.create({
        data: { bunchId: row.bunchId, interestId: targetId },
      });
      movedBunches += 1;
    }

    // Keep the old label searchable so the merge is invisible to members.
    await tx.interest.update({
      where: { id: targetId },
      data: {
        aliases: [...new Set([...target.aliases, source.slug, source.label.toLowerCase()])],
        usageCount: { increment: movedMembers },
      },
    });

    await recordModerationEventTx(tx, {
      actor,
      action: "INTEREST_MERGED",
      targetType: "INTEREST",
      targetId: sourceId,
      reason,
      metadata: {
        mergedInto: targetId,
        sourceLabel: source.label,
        targetLabel: target.label,
        movedMembers,
        movedBunches,
      },
    });

    // Cascades remove the source's UserInterest / BunchInterest rows.
    await tx.interest.delete({ where: { id: sourceId } });

    return { movedMembers, movedBunches };
  });
}
