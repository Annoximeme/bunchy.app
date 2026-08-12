import { db } from "@/server/db/client";
import { conflict, validationFailed } from "@/server/errors";
import { notify } from "@/server/modules/notifications/service";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";
import { recordModerationEvent } from "@/server/modules/admin/audit";
import type { StaffViewer } from "@/server/modules/admin/guard";

/**
 * Creating a bunch from a proposal.
 *
 * Everyone is `INVITED`, nobody is `ACTIVE`, and the bunch therefore starts
 * with no members at all. That is the design, not an oversight: a group of
 * strangers who never agreed to be grouped is not a bunch, and the first person
 * to accept becomes the owner (see `acceptInvite`).
 *
 * Recorded in the moderation audit trail, because a staff member creating a
 * group and messaging a dozen people is exactly the kind of action that should
 * never be invisible after the fact.
 */
export async function createProposedBunch(
  actor: StaffViewer,
  input: { name: string; description: string; profileIds: string[]; interestSlugs: string[] },
): Promise<{ id: string; slug: string; invited: number }> {
  if (input.profileIds.length < 2) {
    throw validationFailed("A proposed bunch needs at least two people.");
  }

  const profiles = await db.profile.findMany({
    where: { id: { in: input.profileIds } },
    select: { id: true },
  });
  if (profiles.length !== input.profileIds.length) {
    throw conflict("Some of those members no longer exist.");
  }

  const interestIds = (
    await db.interest.findMany({
      where: { slug: { in: input.interestSlugs.map((s) => s.toLowerCase()) } },
      select: { id: true },
    })
  ).map((i) => i.id);

  const slug = await uniqueSlug(input.name);

  const bunch = await db.bunch.create({
    data: {
      slug,
      name: input.name,
      description: input.description,
      type: "INTEREST",
      visibility: "PRIVATE",
      maxMembers: Math.max(12, input.profileIds.length),
      interests: { create: interestIds.map((interestId) => ({ interestId })) },
      memberships: {
        create: input.profileIds.map((profileId) => ({
          profileId,
          role: "MEMBER" as const,
          status: "INVITED" as const,
        })),
      },
      messages: {
        create: {
          kind: "SYSTEM",
          body: `${input.name} was created. Whoever arrives first looks after it.`,
        },
      },
    },
    select: { id: true, slug: true },
  });

  for (const profileId of input.profileIds) {
    await notify({
      profileId,
      type: "BUNCH_INVITE",
      title: `You've been invited to ${input.name}`,
      body: "We think this group would suit you. Have a look and decide.",
      linkPath: `/bunches/${bunch.slug}`,
    });
  }

  await recordModerationEvent({
    actor,
    action: "BUNCH_PROPOSED",
    targetType: "BUNCH",
    targetId: bunch.id,
    reason: `Created from a formation proposal and invited ${input.profileIds.length} members.`,
    metadata: { invited: input.profileIds, name: input.name },
  });

  track({
    name: ANALYTICS_EVENTS.BUNCH_CREATED,
    profileId: null,
    properties: { bunchId: bunch.id, via: "proposal", invited: input.profileIds.length },
  });

  return { id: bunch.id, slug: bunch.slug, invited: input.profileIds.length };
}

async function uniqueSlug(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "bunch";

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const taken = await db.bunch.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
