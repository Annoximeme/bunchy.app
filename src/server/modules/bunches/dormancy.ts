import { db } from "@/server/db/client";
import { conflict, forbidden, notFound } from "@/server/errors";
import { notify } from "@/server/modules/notifications/service";

/**
 * When a bunch has stopped, and what the people in it can do about it.
 *
 * ## Why the product has to say something
 *
 * `lifecycleOf` can already tell a card that a bunch is quiet, and
 * `BunchChemistry` can tell a moderator that its confidence is low. Neither of
 * them ever *acts*, so a group that stopped talking two months ago sits on
 * somebody's screen as a room with nobody in it, and the members are worse off
 * than if they had never joined: the formation pool is "members in no active
 * bunch", so being in a dead one is precisely what keeps them out of the next
 * one being assembled.
 *
 * ## What it says, and what it refuses to say
 *
 * It says the group has gone quiet, once, and offers two things to do: put
 * your hand up for another one, or agree to close this one. It does not
 * suggest posting something to revive it, does not count how long anybody has
 * been silent, and never names a member. "Nobody has said anything since 3
 * August" is a fact about a group; "you have not said anything since 3 August"
 * is a product being disappointed in somebody, and it is the same sentence
 * pointed at a person.
 *
 * ## Why closing is any member's to do, once the notice has gone out
 *
 * Everywhere else, archiving a bunch takes standing. Here it deliberately does
 * not, because the failure mode is exactly an owner who stopped coming: making
 * the group's end depend on the person least likely to answer is how a dead
 * bunch stays on five people's screens forever. Before the notice, ordinary
 * rules apply.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How long a group has to be silent before anybody says anything.
 *
 * Six weeks, which is long enough to be through a summer, an exam period or a
 * new job without the product deciding a friendship is over. A month would
 * catch groups that are merely busy, and busy is not the same as finished.
 */
export const QUIET_AFTER_DAYS = 45;

/** How long a request to be rehomed counts for. */
export const LOOKING_FOR_DAYS = 60;

export interface DormancyFacts {
  createdAt: Date;
  /** The last thing anybody said, if anybody ever did. */
  lastMessageAt: Date | null;
  /** The last evening that happened, and the next one if there is one. */
  lastActivityAt: Date | null;
  nextActivityAt: Date | null;
  activeMembers: number;
}

/**
 * Whether this group has stopped.
 *
 * Pure, so the rule can be argued with in a test rather than discovered by
 * five people receiving a notification about a group they were about to meet.
 *
 * A bunch with something coming up has not stopped, whatever the chat looks
 * like: a group that arranges an evening and says nothing in between is a
 * functioning group, and one of the healthier shapes this product has. A bunch
 * of one has not stopped either, it never started, and telling its only member
 * that it has gone quiet would be telling them something about themselves.
 */
export function hasGoneQuiet(facts: DormancyFacts, now = new Date()): boolean {
  if (facts.activeMembers < 2) return false;
  if (facts.nextActivityAt && facts.nextActivityAt.getTime() > now.getTime()) {
    return false;
  }

  const cutoff = now.getTime() - QUIET_AFTER_DAYS * DAY_MS;
  // Never given a chance yet.
  if (facts.createdAt.getTime() > cutoff) return false;

  const lastSign = Math.max(
    facts.lastMessageAt?.getTime() ?? 0,
    facts.lastActivityAt?.getTime() ?? 0,
    facts.createdAt.getTime(),
  );
  return lastSign <= cutoff;
}

/**
 * Tells the members of every bunch that has stopped, once.
 *
 * Guarded by `quietNoticeAt` on the bunch rather than by a group key per
 * member, because it is one conversation with the group: a member who joins
 * afterwards is not told, and a bunch that comes back to life and stops again
 * next year is not told a second time. That is deliberate. A recurring notice
 * about a group being quiet is a nudge to post something, and this exists to
 * offer people a way on, not to keep a room warm.
 */
export async function noticeQuietBunches(now = new Date()): Promise<number> {
  const bunches = await db.bunch.findMany({
    where: {
      archivedAt: null,
      quietNoticeAt: null,
      createdAt: { lt: new Date(now.getTime() - QUIET_AFTER_DAYS * DAY_MS) },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      memberships: {
        where: { status: "ACTIVE" },
        select: { profileId: true },
      },
      messages: {
        // System messages are the product talking, not the group, so a bunch
        // whose only sign of life is "X joined the bunch" is still quiet.
        where: { kind: { not: "SYSTEM" } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
      activities: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { startsAt: "desc" },
        take: 1,
        select: { startsAt: true },
      },
    },
  });

  let noticed = 0;
  for (const bunch of bunches) {
    const lastActivity = bunch.activities[0]?.startsAt ?? null;
    const facts: DormancyFacts = {
      createdAt: bunch.createdAt,
      lastMessageAt: bunch.messages[0]?.createdAt ?? null,
      lastActivityAt:
        lastActivity && lastActivity.getTime() <= now.getTime() ? lastActivity : null,
      nextActivityAt:
        lastActivity && lastActivity.getTime() > now.getTime() ? lastActivity : null,
      activeMembers: bunch.memberships.length,
    };

    if (!hasGoneQuiet(facts, now)) continue;

    for (const membership of bunch.memberships) {
      await notify({
        profileId: membership.profileId,
        type: "BUNCH_QUIET",
        title: `${bunch.name} has gone quiet`,
        body: "Groups end, and that is allowed. You can put your hand up for another one, or close this one together.",
        linkPath: `/bunches/${bunch.slug}`,
        groupKey: `bunch-quiet:${bunch.id}`,
      });
    }

    await db.bunch.update({
      where: { id: bunch.id },
      data: { quietNoticeAt: now },
    });
    noticed += 1;
  }

  return noticed;
}

/**
 * "Find me another one."
 *
 * Writes a timestamp rather than moving anybody. The formation pool reads it
 * and includes them alongside the members who are in no bunch at all, which is
 * the whole mechanic: somebody stuck in a group that stopped should not have
 * to leave it, and leave their friends' room empty, to be considered for the
 * next one.
 */
export async function askToBeRehomed(
  profileId: string,
  now = new Date(),
): Promise<void> {
  await db.profile.update({
    where: { id: profileId },
    data: { lookingForABunchAt: now },
  });
}

/** Taking your hand back down. */
export async function stopLookingForABunch(profileId: string): Promise<void> {
  await db.profile.update({
    where: { id: profileId },
    data: { lookingForABunchAt: null },
  });
}

/**
 * Closes a bunch that has been told it is quiet.
 *
 * Archived rather than deleted, which is what happens when the last member
 * leaves, and for the same reason: the conversations belong to the people who
 * had them. Everybody still in it is told, once, by the member who did it.
 */
export async function closeQuietBunch(
  bunchId: string,
  profileId: string,
  now = new Date(),
): Promise<void> {
  const bunch = await db.bunch.findUnique({
    where: { id: bunchId },
    select: {
      id: true,
      name: true,
      archivedAt: true,
      quietNoticeAt: true,
      memberships: {
        where: { status: "ACTIVE" },
        select: { profileId: true },
      },
    },
  });
  if (!bunch || bunch.archivedAt) throw notFound("That bunch no longer exists.");

  const isMember = bunch.memberships.some((m) => m.profileId === profileId);
  if (!isMember) throw forbidden("You're not a member of this bunch.");
  if (!bunch.quietNoticeAt) {
    throw conflict(
      "This bunch is still going. Leave it if it isn't for you, or ask a moderator to archive it.",
    );
  }

  await db.$transaction([
    db.bunch.update({ where: { id: bunchId }, data: { archivedAt: now } }),
    db.bunchMessage.create({
      data: {
        bunchId,
        kind: "SYSTEM",
        body: `${bunch.name} was closed.`,
      },
    }),
  ]);

  for (const membership of bunch.memberships) {
    if (membership.profileId === profileId) continue;
    await notify({
      profileId: membership.profileId,
      type: "BUNCH_QUIET",
      title: `${bunch.name} was closed`,
      body: "Somebody in it agreed it had run its course. The conversation stays yours to read.",
      linkPath: "/bunches",
      groupKey: `bunch-closed:${bunchId}`,
    });
  }
}

/**
 * Whether this member is currently asking to be put in front of a new group.
 *
 * Reads the same window the formation pool does, so the screen and the pool
 * can never disagree about whether somebody's hand is up. A request that has
 * aged out reads as down, which is what it is.
 */
export async function hasHandUp(
  profileId: string,
  now = new Date(),
): Promise<boolean> {
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { lookingForABunchAt: true },
  });
  const at = profile?.lookingForABunchAt;
  if (!at) return false;
  return at.getTime() >= now.getTime() - LOOKING_FOR_DAYS * DAY_MS;
}
