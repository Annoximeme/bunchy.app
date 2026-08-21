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
