import { db } from "@/server/db/client";
import { notFound, validationFailed } from "@/server/errors";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";

/**
 * "Did you go? Did you meet someone?"
 *
 * The product's stated measure of success is whether a member met a person, and
 * before this that number did not exist anywhere, the database recorded who
 * was recommended, who joined and who said they were free, all of which are
 * intent. This closes the loop, and the answers are the only training signal a
 * learned ranker could honestly use later.
 *
 * Two constraints shape everything here. It has to be answerable in one tap,
 * because a survey after a night out is a survey nobody fills in. And an
 * unanswered prompt must stay unanswered rather than decaying into a "no",
 * because silence and "I didn't go" are different facts and conflating them
 * would poison the signal this exists to collect.
 */

/** How long after an activity the question still makes sense to ask. */
const ASK_WINDOW_DAYS = 14;

/**
 * Long enough for an evening to have ended before anyone is asked about it. An
 * activity with no stated end is assumed to run two hours, matching the
 * calendar export.
 */
const SETTLE_HOURS = 3;

export interface OutcomePrompt {
  activityId: string;
  title: string;
  endedAt: string;
  /** Everyone else who was there, so "met someone" has faces attached. */
  others: Array<{ id: string; username: string; displayName: string; avatarUrl: string | null }>;
  /**
   * Whether this evening could become a standing arrangement, and whether
   * this person is the one who could make it so.
   *
   * Offered to the organiser only. Anyone can say the evening worked; only the
   * person who arranged it can commit to arranging it again, and letting four
   * attendees each start their own Thursday would produce four Thursdays.
   *
   * False when the activity already belongs to a series, because then it
   * already repeats and the question is answered.
   */
  canRepeat: boolean;
}

/**
 * The one activity worth asking about, or null.
 *
 * One, not a list: a queue of five things to review is a chore, and the most
 * recent evening is the one anybody can still remember accurately.
 */
export async function pendingOutcome(
  profileId: string,
  now = new Date(),
): Promise<OutcomePrompt | null> {
  const settled = new Date(now.getTime() - SETTLE_HOURS * 3_600_000);
  const horizon = new Date(now.getTime() - ASK_WINDOW_DAYS * 86_400_000);

  const entry = await db.activityParticipant.findFirst({
    where: {
      profileId,
      status: "JOINED",
      activity: {
        status: { not: "CANCELLED" },
        startsAt: { gte: horizon, lte: settled },
        // Nobody is asked twice. The unique constraint would catch a duplicate
        // write; this is what stops the prompt reappearing after an answer.
        outcomes: { none: { profileId } },
      },
    },
    orderBy: { activity: { startsAt: "desc" } },
    select: {
      activity: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          organizerId: true,
          seriesId: true,
          participants: {
            where: { status: "JOINED", profileId: { not: profileId } },
            select: {
              profile: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
            take: 8,
          },
        },
      },
    },
  });

  if (!entry) return null;
  const { activity } = entry;

  return {
    activityId: activity.id,
    title: activity.title,
    endedAt: (activity.endsAt ?? activity.startsAt).toISOString(),
    others: activity.participants.map((p) => p.profile),
    canRepeat: activity.organizerId === profileId && activity.seriesId === null,
  };
}

/**
 * "Did you meet someone" is only a question for someone who went.
 *
 * Pulled out and exported so the rule is testable without a database: storing
 * `false` here for an absentee would read later as "went, met nobody", which is
 * the one reading that would quietly bend the only success metric this product
 * has.
 */
export function resolveMetSomeone(
  attended: boolean,
  metSomeone?: boolean,
): boolean | null {
  return attended ? (metSomeone ?? null) : null;
}

export interface OutcomeInput {
  attended: boolean;
  /** Only meaningful when they went; ignored otherwise. */
  metSomeone?: boolean;
}

export async function recordOutcome(
  profileId: string,
  activityId: string,
  input: OutcomeInput,
): Promise<void> {
  const entry = await db.activityParticipant.findFirst({
    where: { profileId, activityId, status: "JOINED" },
    select: { profileId: true },
  });
  // Not `notFound` on the activity itself: whether an activity exists is not
  // something a non-participant should be able to probe by answering about it.
  if (!entry) throw notFound("Activity not found.");

  const activity = await db.activity.findUnique({
    where: { id: activityId },
    select: { startsAt: true },
  });
  if (!activity) throw notFound("Activity not found.");
  if (activity.startsAt > new Date()) {
    throw validationFailed("That hasn't happened yet.");
  }

  const metSomeone = resolveMetSomeone(input.attended, input.metSomeone);

  await db.activityOutcome.upsert({
    where: { activityId_profileId: { activityId, profileId } },
    create: { activityId, profileId, attended: input.attended, metSomeone },
    update: { attended: input.attended, metSomeone },
  });

  track({
    name: ANALYTICS_EVENTS.ACTIVITY_OUTCOME_ANSWERED,
    profileId,
    properties: { attended: input.attended, metSomeone },
  });

  if (metSomeone) {
    track({
      name: ANALYTICS_EVENTS.ACTIVITY_MET_SOMEONE,
      profileId,
      properties: { activityId },
    });
  }
}

export interface OutcomeSummary {
  answered: number;
  attended: number;
  metSomeone: number;
  /** Of those who went, the share who met someone. Null below a floor. */
  metSomeoneRate: number | null;
}

/**
 * The staff-facing number. Reported only above a floor, because a rate computed
 * from three answers is noise presented as a measurement.
 */
const REPORTING_FLOOR = 5;

export async function outcomeSummary(since?: Date): Promise<OutcomeSummary> {
  const where = since ? { createdAt: { gte: since } } : {};

  const [answered, attended, metSomeone] = await Promise.all([
    db.activityOutcome.count({ where: { ...where, attended: { not: null } } }),
    db.activityOutcome.count({ where: { ...where, attended: true } }),
    db.activityOutcome.count({ where: { ...where, metSomeone: true } }),
  ]);

  return {
    answered,
    attended,
    metSomeone,
    metSomeoneRate:
      attended >= REPORTING_FLOOR ? metSomeone / attended : null,
  };
}

/**
 * What the member gets back for answering.
 *
 * `ActivityOutcome` has always been the only honest signal in the schema:
 * every other one is about intent, and this one is about what happened. It fed
 * the matching engine's `met_well` and the staff dashboard, and it gave the
 * person who answered it nothing at all. Asking somebody a question after
 * every evening out and never once telling them what came of it is how a
 * question stops being answered.
 *
 * Two things come back. A count of what actually happened, which is the only
 * number in this product worth showing a member about themselves, and the
 * people they have now been in a room with more than once and never connected
 * to. The second is the useful half: two evenings with the same person is a
 * far better reason to reach out than any compatibility score, and it is a fact
 * rather than a guess.
 */

export interface OutcomeReview {
  /** Activities in the window this member said they went to. */
  attended: number;
  /** Of those, how many they met somebody at. */
  metSomeone: number;
  /**
   * People they have been at two or more activities with and are not connected
   * to. Never more than a handful; this is a nudge, not a directory.
   */
  seenAgain: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    /** How many activities they have both been at. */
    times: number;
  }>;
}

/** How far back the review looks. A season, not a lifetime. */
const REVIEW_WINDOW_DAYS = 90;
/** Being in the same room twice is the signal. Once is a coincidence. */
const SEEN_AGAIN_FLOOR = 2;
const SEEN_AGAIN_LIMIT = 4;

export async function outcomeReview(profileId: string): Promise<OutcomeReview> {
  const since = new Date(Date.now() - REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [attended, metSomeone, attendedActivities] = await Promise.all([
    db.activityOutcome.count({
      where: { profileId, attended: true, createdAt: { gte: since } },
    }),
    db.activityOutcome.count({
      where: { profileId, metSomeone: true, createdAt: { gte: since } },
    }),
    // The activities they said they went to. Not merely joined: somebody who
    // signed up for six things and went to one has been in a room with the
    // people from one of them.
    db.activityOutcome.findMany({
      where: { profileId, attended: true, createdAt: { gte: since } },
      select: { activityId: true },
    }),
  ]);

  const activityIds = attendedActivities.map((row) => row.activityId);
  if (activityIds.length < SEEN_AGAIN_FLOOR) {
    return { attended, metSomeone, seenAgain: [] };
  }

  const [others, connections, blocks] = await Promise.all([
    db.activityParticipant.findMany({
      where: {
        activityId: { in: activityIds },
        status: "JOINED",
        profileId: { not: profileId },
      },
      select: {
        profileId: true,
        profile: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    }),
    db.connection.findMany({
      where: { OR: [{ requesterId: profileId }, { addresseeId: profileId }] },
      select: { requesterId: true, addresseeId: true },
    }),
    db.block.findMany({
      where: { OR: [{ blockerId: profileId }, { blockedId: profileId }] },
      select: { blockerId: true, blockedId: true },
    }),
  ]);

  // Any connection at all, in any state. A pending request is already a
  // suggestion made, and a declined one is an answer.
  const known = new Set(
    connections.flatMap((c) => [c.requesterId, c.addresseeId]),
  );
  for (const block of blocks) {
    known.add(block.blockerId);
    known.add(block.blockedId);
  }

  const counts = new Map<string, { times: number; profile: (typeof others)[number]["profile"] }>();
  for (const row of others) {
    if (known.has(row.profileId)) continue;
    const entry = counts.get(row.profileId);
    if (entry) entry.times += 1;
    else counts.set(row.profileId, { times: 1, profile: row.profile });
  }

  const seenAgain = [...counts.values()]
    .filter((entry) => entry.times >= SEEN_AGAIN_FLOOR)
    .sort((a, b) => b.times - a.times)
    .slice(0, SEEN_AGAIN_LIMIT)
    .map((entry) => ({ ...entry.profile, times: entry.times }));

  return { attended, metSomeone, seenAgain };
}
