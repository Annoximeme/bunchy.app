import { db } from "@/server/db/client";
import { verifyPassword } from "@/server/auth/password";
import { notFound, validationFailed } from "@/server/errors";
import { notify } from "@/server/modules/notifications/service";
import { track } from "@/server/modules/analytics/track";

/**
 * Deleting an account.
 *
 * It is immediate and irreversible. There is no thirty-day "we'll keep it in
 * case you change your mind", because that is not a safety net, it is a
 * retention tactic wearing one — the member said delete, and the product's
 * answer is that the data is gone.
 *
 * Most of the erasure is the database's job: `User` cascades to `Profile`, which
 * cascades to interests, availability, connections, memberships, conversations,
 * participation, notifications, blocks, recommendations and analytics events.
 * What this module does is handle the cases where a plain cascade would take
 * something from *other people*:
 *
 * 1. **Activities they organized** cascade away, which would silently cancel
 *    plans other members had joined. Everyone going is told first.
 * 2. **Bunches where they were the only owner** would be left leaderless. The
 *    longest-standing active member is promoted; a bunch with nobody left in it
 *    is removed.
 * 3. **Reports they filed** are anonymized rather than deleted (the schema does
 *    this via `SetNull`) so a harassment report outlives the person who filed
 *    it. Bunch messages and created bunches behave the same way — the group's
 *    history keeps its shape, with the author detached.
 */

export interface DeleteAccountResult {
  activitiesCancelled: number;
  participantsNotified: number;
  bunchesHandedOver: number;
  bunchesRemoved: number;
  reportsAnonymized: number;
}

export async function deleteAccount(
  userId: string,
  password: string,
): Promise<DeleteAccountResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, profile: { select: { id: true } } },
  });
  if (!user?.profile) throw notFound("Account not found.");

  // Re-authenticate. A session cookie is enough to read the account; it is not
  // enough to destroy it.
  if (!user.passwordHash) {
    throw validationFailed(
      "This account signs in with a connected provider, so it can't be deleted with a password yet.",
    );
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw validationFailed("That password is not right.");
  }

  const profileId = user.profile.id;

  // --- Tell everyone who is affected, before anything is destroyed. ---------
  const doomedActivities = await db.activity.findMany({
    where: { organizerId: profileId, status: "SCHEDULED", startsAt: { gte: new Date() } },
    select: {
      id: true,
      title: true,
      participants: {
        where: { profileId: { not: profileId }, status: { in: ["JOINED", "WAITLISTED"] } },
        select: { profileId: true },
      },
    },
  });

  let participantsNotified = 0;
  for (const activity of doomedActivities) {
    for (const participant of activity.participants) {
      await notify({
        profileId: participant.profileId,
        type: "ACTIVITY_CHANGED",
        title: `${activity.title} was cancelled`,
        body: "The person organising it left Bunchy, so the plan is off.",
        // Deliberately no link: the activity is about to stop existing, and a
        // notification that leads to a dead page is worse than none.
      });
      participantsNotified += 1;
    }
  }

  // --- Hand over any bunch this member was the only owner of. --------------
  const ownedBunches = await db.bunchMembership.findMany({
    where: { profileId, role: "OWNER", status: "ACTIVE" },
    select: { bunchId: true },
  });

  let bunchesHandedOver = 0;
  let bunchesRemoved = 0;

  for (const { bunchId } of ownedBunches) {
    const otherOwners = await db.bunchMembership.count({
      where: { bunchId, role: "OWNER", status: "ACTIVE", profileId: { not: profileId } },
    });
    if (otherOwners > 0) continue;

    // Prefer an existing moderator, then the longest-standing member.
    const successor = await db.bunchMembership.findFirst({
      where: { bunchId, status: "ACTIVE", profileId: { not: profileId } },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      select: { profileId: true },
    });

    if (!successor) {
      await db.bunch.delete({ where: { id: bunchId } });
      bunchesRemoved += 1;
      continue;
    }

    await db.bunchMembership.update({
      where: { bunchId_profileId: { bunchId, profileId: successor.profileId } },
      data: { role: "OWNER" },
    });
    bunchesHandedOver += 1;
  }

  const reportsAnonymized = await db.report.count({ where: { reporterId: profileId } });

  // Recorded before the delete, because the event row cascades with the profile
  // and the account would otherwise leave no trace of having left at all.
  track({ name: "account.deleted", profileId: null, properties: {} });

  // --- The erasure itself. -------------------------------------------------
  await db.user.delete({ where: { id: userId } });

  return {
    activitiesCancelled: doomedActivities.length,
    participantsNotified,
    bunchesHandedOver,
    bunchesRemoved,
    reportsAnonymized,
  };
}
