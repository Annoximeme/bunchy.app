import { db } from "@/server/db/client";
import { conflict, notFound, validationFailed } from "@/server/errors";
import type { ModeratorApplicationStatus } from "@/generated/prisma/enums";

/**
 * Volunteer moderator applications.
 *
 * The age floor is the only hard rule here and it is deliberately higher than
 * the platform's own. Bunchy is 16+; the report queue contains harassment,
 * scam attempts and reported private messages, and asking a sixteen-year-old
 * to read that on a volunteer basis is not something a product should do.
 */

export { MINIMUM_AGE } from "@/lib/moderation";
import { MINIMUM_AGE } from "@/lib/moderation";

/** Nobody is asked for more than this, and nobody should offer more. */
export const MAX_HOURS_PER_WEEK = 10;

export interface ApplicationInput {
  hoursPerWeek: number;
  motivation: string;
  experience?: string;
  acknowledgedExposure: boolean;
}

export async function applyToModerate(
  profileId: string,
  userId: string,
  input: ApplicationInput,
  now = new Date(),
): Promise<void> {
  if (!input.acknowledgedExposure) {
    throw validationFailed(
      "You need to confirm you understand what the queue contains.",
    );
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { birthYear: true, birthMonth: true },
  });

  // No birth year means no way to check, and this is not a rule to wave
  // through on a technicality.
  const age = user?.birthYear
    ? now.getUTCFullYear() -
      user.birthYear -
      (user.birthMonth && now.getUTCMonth() + 1 < user.birthMonth ? 1 : 0)
    : null;

  if (age === null || age < MINIMUM_AGE) {
    throw validationFailed(
      `Moderating means reading reported harassment and private messages, so it is ${MINIMUM_AGE}+.`,
    );
  }

  const existing = await db.moderatorApplication.findUnique({
    where: { profileId },
    select: { id: true },
  });
  if (existing) {
    throw conflict("You have already applied. We have it, and we will reply.");
  }

  await db.moderatorApplication.create({
    data: {
      profileId,
      hoursPerWeek: Math.min(Math.max(input.hoursPerWeek, 1), MAX_HOURS_PER_WEEK),
      motivation: input.motivation.trim().slice(0, 2000),
      experience: input.experience?.trim().slice(0, 2000) || null,
      acknowledgedExposure: true,
    },
  });
}

export async function myApplication(profileId: string) {
  return db.moderatorApplication.findUnique({
    where: { profileId },
    select: { status: true, createdAt: true },
  });
}

export async function listApplications(status?: ModeratorApplicationStatus) {
  return db.moderatorApplication.findMany({
    where: status ? { status } : {},
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      hoursPerWeek: true,
      motivation: true,
      experience: true,
      status: true,
      createdAt: true,
      reviewNote: true,
      profile: {
        select: {
          username: true,
          displayName: true,
          cityLabel: true,
          countryCode: true,
          createdAt: true,
        },
      },
    },
    take: 200,
  });
}

export async function decideApplication(
  id: string,
  status: ModeratorApplicationStatus,
  note?: string,
): Promise<void> {
  const application = await db.moderatorApplication.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!application) throw notFound("No such application.");

  await db.moderatorApplication.update({
    where: { id },
    data: {
      status,
      reviewedAt: status === "NEW" ? null : new Date(),
      reviewNote: note?.slice(0, 1000) ?? null,
    },
  });

  // Deliberately does not grant the role. Accepting an application is a
  // decision to talk to somebody; making them staff is `npm run role`, which
  // needs database access, the same bar as the first admin, and the same
  // reason. A queue that can promote people is a queue worth compromising.
}

export async function applicationCounts() {
  const rows = await db.moderatorApplication.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as
    Partial<Record<ModeratorApplicationStatus, number>>;
}
