import { db } from "@/server/db/client";
import { forbidden, validationFailed } from "@/server/errors";
import { isTitleKey, bunchTitleFor } from "@/lib/titles";
import type { XpTrack } from "@/generated/prisma/enums";
import { computeStanding, type StandingInput } from "@/server/modules/standing/compute";
import { notify } from "@/server/modules/notifications/service";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import { titlePath } from "@/lib/titles";

/**
 * Reading the rows that earned somebody their standing, and writing the
 * arithmetic down.
 *
 * The split is the same one the matching module uses: `compute.ts` is pure and
 * knows nothing about Prisma, and this file is the only place that does. It
 * means the economy can be argued with in a unit test, and it means a change to
 * the rules is a change to one pure function rather than to a query.
 *
 * ## Why recomputing is the only write
 *
 * There is no "award points" call anywhere in this codebase, and there must
 * never be one. Points are a function of rows that already exist, so a member's
 * standing is recomputed from scratch and overwritten. That is what makes it
 * idempotent under an overlapping job, correct after a backfill, and reversible
 * when the rows underneath change: a cancelled evening or a banned member
 * simply produces a smaller number next time, with no compensating write to get
 * wrong.
 */

/** Recomputed if somebody looks at a standing older than this. */
const STALE_AFTER_MS = 30 * 60 * 1000;

/** How many standings one scheduled pass will refresh. */
const BATCH = 200;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function gather(profileId: string, now: Date): Promise<StandingInput> {
  const [checkIns, hosted, introductions, weekly] = await Promise.all([
    db.activityParticipant.findMany({
      where: { profileId, checkedInAt: { not: null } },
      select: {
        checkedInAt: true,
        activity: {
          select: {
            id: true,
            bunchId: true,
            seriesId: true,
            cityLabel: true,
            status: true,
          },
        },
      },
    }),
    db.activity.findMany({
      where: {
        organizerId: profileId,
        status: { not: "CANCELLED" },
        startsAt: { lt: now },
      },
      select: {
        id: true,
        startsAt: true,
        // Everybody but the host. A host tapping themselves in is not turnout,
        // which is the same rule `hosting.ts` applies to its sentence.
        _count: {
          select: {
            participants: {
              where: { checkedInAt: { not: null }, profileId: { not: profileId } },
            },
          },
        },
      },
    }),
    db.memberIntroduction.findMany({
      where: { introducerId: profileId, status: "ACCEPTED" },
      select: { respondedAt: true, createdAt: true },
    }),
    db.activitySeries.count({
      where: { organizerId: profileId, endedAt: null, nextAt: { gt: now } },
    }),
  ]);

  return {
    // A cancelled evening never happened, whoever tapped in at it.
    checkIns: checkIns
      .filter((row) => row.activity.status !== "CANCELLED")
      .map((row) => ({
        activityId: row.activity.id,
        at: row.checkedInAt!,
        bunchId: row.activity.bunchId,
        seriesId: row.activity.seriesId,
        cityLabel: row.activity.cityLabel,
      })),
    hosted: hosted.map((activity) => ({
      activityId: activity.id,
      at: activity.startsAt,
      othersCheckedIn: activity._count.participants,
    })),
    introductionsAccepted: introductions.map(
      (introduction) => introduction.respondedAt ?? introduction.createdAt,
    ),
    runsSomethingWeekly: weekly > 0,
  };
}

export interface StandingView {
  total: number;
  points: Record<XpTrack, number>;
  /** Every title they hold, current ones included, in catalogue order. */
  titles: string[];
  /** The one they have chosen to show, if any. */
  displayedTitleKey: string | null;
  computedAt: Date;
}

/**
 * Recomputes one member's standing and writes it.
 *
 * Titles are upserted rather than replaced, so `earnedAt` survives: the date
 * somebody first earned a title is a fact about them, and a recompute that
 * reset it would quietly rewrite their history every hour. A title they no
 * longer hold is marked lapsed rather than deleted, because it is still true
 * that they once did.
 */
export async function recomputeStanding(
  profileId: string,
  now = new Date(),
): Promise<StandingView> {
  const standing = computeStanding(await gather(profileId, now));
  const held = new Set(standing.titles);

  const [existing, before] = await Promise.all([
    db.earnedTitle.findMany({
      where: { profileId },
      select: { key: true, lapsedAt: true },
    }),
    db.memberStanding.findUnique({
      where: { profileId },
      select: { profileId: true },
    }),
  ]);
  const known = new Set(existing.map((title) => title.key));

  await db.$transaction([
    db.memberStanding.upsert({
      where: { profileId },
      create: { profileId, total: standing.total, computedAt: now },
      update: { total: standing.total, computedAt: now },
    }),
    ...Object.entries(standing.points).map(([track, points]) =>
      db.memberTrackPoints.upsert({
        where: { profileId_track: { profileId, track: track as XpTrack } },
        create: { profileId, track: track as XpTrack, points },
        update: { points },
      }),
    ),
    ...standing.titles.map((key) =>
      db.earnedTitle.upsert({
        where: { profileId_key: { profileId, key } },
        create: { profileId, key, earnedAt: now },
        // Coming back is possible: somebody who starts a new weekly night
        // holds the title again, and the date they first earned it stays.
        update: { lapsedAt: null },
      }),
    ),
    ...existing
      .filter((title) => !held.has(title.key) && title.lapsedAt === null)
      .map((title) =>
        db.earnedTitle.update({
          where: { profileId_key: { profileId, key: title.key } },
          data: { lapsedAt: now },
        }),
      ),
  ]);

  await announceNewTitles(profileId, standing.titles, known, before !== null);

  return readFresh(profileId, standing, now);
}

/**
 * Says so, once, when a title is genuinely new.
 *
 * Two guards, and the second is the important one.
 *
 * **Only titles that were not there before.** The recompute runs hourly and
 * writes the same rows every time, so anything derived from "what it wrote"
 * would announce the same title forever.
 *
 * **Never on a member's first computation.** The day this shipped, every
 * member's first recompute produced every title their history had already
 * earned. Announcing those would mean handing somebody six notifications about
 * things they did months ago, which is the product shouting to look busy. A
 * member with no standing row yet is being counted for the first time, so
 * their titles arrive silently and the next new one is announced properly.
 *
 * The words come from the English catalogue, like every other notification
 * body in this codebase. Stored notification text is not translated anywhere
 * yet, and inventing a second convention for one type would be worse than the
 * inconsistency.
 */
async function announceNewTitles(
  profileId: string,
  titles: string[],
  known: Set<string>,
  hadStandingBefore: boolean,
): Promise<void> {
  if (!hadStandingBefore) return;

  const names = DICTIONARIES.en.titles as Record<string, string>;

  for (const key of titles) {
    if (known.has(key)) continue;
    const name = names[titlePath(key).replace("titles.", "")] ?? key;

    await notify({
      profileId,
      type: "TITLE_EARNED",
      title: `You've earned a title: ${name}`,
      body: "It shows on your profile if you choose to wear it.",
      linkPath: "/profile",
      // Once per title, ever, whatever the job does afterwards.
      groupKey: `title:${key}`,
    });
  }
}

async function readFresh(
  profileId: string,
  computed: ReturnType<typeof computeStanding>,
  now: Date,
): Promise<StandingView> {
  const chosen = await db.memberStanding.findUnique({
    where: { profileId },
    select: { displayedTitleKey: true },
  });

  return {
    total: computed.total,
    points: computed.points,
    titles: computed.titles,
    displayedTitleKey: chosen?.displayedTitleKey ?? null,
    computedAt: now,
  };
}

/**
 * A member's standing, recomputed if it has gone stale.
 *
 * Reading is what triggers a refresh, rather than every write incrementing a
 * counter. It costs four indexed queries on a cold read and nothing at all on
 * a warm one, and it means somebody who taps in at eight o'clock sees the
 * points when they look, instead of when a job next runs.
 */
export async function standingFor(
  profileId: string,
  now = new Date(),
): Promise<StandingView> {
  const cached = await db.memberStanding.findUnique({
    where: { profileId },
    select: {
      total: true,
      computedAt: true,
      displayedTitleKey: true,
      tracks: { select: { track: true, points: true } },
      titles: {
        where: { lapsedAt: null },
        select: { key: true },
      },
    },
  });

  if (!cached || now.getTime() - cached.computedAt.getTime() > STALE_AFTER_MS) {
    return recomputeStanding(profileId, now);
  }

  const points = {
    TURNING_UP: 0,
    KEEPING_GOING: 0,
    HOSTING: 0,
    INTRODUCING: 0,
    SOMEWHERE_NEW: 0,
  } as Record<XpTrack, number>;
  for (const track of cached.tracks) points[track.track] = track.points;

  return {
    total: cached.total,
    points,
    titles: cached.titles.map((title) => title.key),
    displayedTitleKey: cached.displayedTitleKey,
    computedAt: cached.computedAt,
  };
}

/**
 * Choosing which title to wear, or none.
 *
 * Checked against the catalogue *and* against what they have actually earned,
 * because a key arriving from a client is a string somebody chose. The second
 * check is the one that matters: without it this is an endpoint for awarding
 * yourself any title in the product.
 */
export async function chooseTitle(
  profileId: string,
  key: string | null,
): Promise<void> {
  if (key !== null) {
    if (!isTitleKey(key)) throw validationFailed("That is not a title.");
    const earned = await db.earnedTitle.findUnique({
      where: { profileId_key: { profileId, key } },
      select: { lapsedAt: true },
    });
    if (!earned) throw forbidden("You haven't earned that one.");
    if (earned.lapsedAt) throw forbidden("That one isn't true any more.");
  }

  await db.memberStanding.upsert({
    where: { profileId },
    create: { profileId, displayedTitleKey: key },
    update: { displayedTitleKey: key },
  });
}

export interface BunchStandingView {
  eveningsHeld: number;
  weeksRunning: number;
  total: number;
  titleKey: string | null;
  /** Who has turned up to the bunch's evenings, and how often. */
  attendance: Array<{ profileId: string; evenings: number }>;
}

/**
 * What a bunch has done, as the bunch.
 *
 * An evening counts once at least two people tapped in at it, which is the
 * same corroboration a member's points need and is also what stops a bunch of
 * one from awarding itself a history.
 *
 * The per-member attendance is the one comparison in this feature, and it is
 * deliberately the narrowest one: how many of *this group's* evenings each
 * member came to, visible to the group. It is a fact the people in the room
 * already know.
 */
export async function recomputeBunchStanding(
  bunchId: string,
  now = new Date(),
): Promise<BunchStandingView> {
  const activities = await db.activity.findMany({
    where: { bunchId, status: { not: "CANCELLED" }, startsAt: { lt: now } },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      startsAt: true,
      participants: {
        where: { checkedInAt: { not: null } },
        select: { profileId: true },
      },
    },
  });

  const held = activities.filter((activity) => activity.participants.length >= 2);
  const eveningsHeld = held.length;
  const first = held[0]?.startsAt;
  const last = held.at(-1)?.startsAt;
  const weeksRunning =
    first && last ? Math.max(1, Math.round((last.getTime() - first.getTime()) / WEEK_MS)) : 0;

  const attendance = new Map<string, number>();
  for (const activity of held) {
    for (const participant of activity.participants) {
      attendance.set(
        participant.profileId,
        (attendance.get(participant.profileId) ?? 0) + 1,
      );
    }
  }

  const total = 30 * eveningsHeld + 5 * weeksRunning;
  const titleKey = bunchTitleFor(eveningsHeld);

  await db.bunchStanding.upsert({
    where: { bunchId },
    create: { bunchId, eveningsHeld, weeksRunning, total, titleKey, computedAt: now },
    update: { eveningsHeld, weeksRunning, total, titleKey, computedAt: now },
  });

  return {
    eveningsHeld,
    weeksRunning,
    total,
    titleKey,
    attendance: [...attendance.entries()]
      .map(([profileId, evenings]) => ({ profileId, evenings }))
      .sort((a, b) => b.evenings - a.evenings),
  };
}

/** The stored reading, without recomputing. */
export async function bunchStanding(
  bunchId: string,
): Promise<{ eveningsHeld: number; weeksRunning: number; titleKey: string | null } | null> {
  const row = await db.bunchStanding.findUnique({
    where: { bunchId },
    select: { eveningsHeld: true, weeksRunning: true, titleKey: true },
  });
  return row;
}

/**
 * The scheduled pass.
 *
 * Bounded, and oldest first, so it converges rather than trying to do
 * everything every hour. Members who never look at their own profile are the
 * ones this exists for: their standing is what somebody else sees.
 */
export async function refreshStandings(now = new Date()): Promise<{
  members: number;
  bunches: number;
}> {
  const stale = new Date(now.getTime() - STALE_AFTER_MS);

  const members = await db.profile.findMany({
    where: {
      onboardingStage: "COMPLETE",
      OR: [{ standing: null }, { standing: { computedAt: { lt: stale } } }],
    },
    orderBy: { lastActiveAt: "desc" },
    take: BATCH,
    select: { id: true },
  });
  for (const member of members) await recomputeStanding(member.id, now);

  const bunches = await db.bunch.findMany({
    where: {
      archivedAt: null,
      OR: [{ standing: null }, { standing: { computedAt: { lt: stale } } }],
    },
    take: BATCH,
    select: { id: true },
  });
  for (const bunch of bunches) await recomputeBunchStanding(bunch.id, now);

  return { members: members.length, bunches: bunches.length };
}
