import type { XpTrack } from "@/generated/prisma/enums";
import {
  titlesFor,
  WEEKLY_HOST_TITLE,
  type TitleScope,
} from "@/lib/titles";

/**
 * Turning what somebody actually did into points, as a pure function.
 *
 * Everything here takes rows and returns numbers. No database, no clock beyond
 * the dates it is given, which is what makes the whole economy arguable in a
 * test rather than discovered by a member who found a way to farm it.
 *
 * ## The rule every track obeys
 *
 * **Somebody else has to have been involved.** A check-in happens inside a
 * window the host opened, at the hour and the place. A hosted evening counts
 * only when other people tapped in at it. An introduction counts only when
 * both sides accepted, which is two decisions that are not the introducer's.
 * Nothing on this page can be produced by one person with a keyboard, which is
 * the difference between a record and a score.
 *
 * ## Why every track has a weekly ceiling
 *
 * The obvious attack is two accounts and a fake evening, and no rule about
 * *what* counts can stop it: two real people can meet twice a day. What stops
 * it is that it is not worth doing. A ceiling per week means the farm produces
 * the same points as simply turning up would, and the effort buys nothing.
 *
 * The ceilings are set above what anybody does honestly. Three evenings a week
 * is a busy week, not a limit somebody will feel.
 */

export interface CheckIn {
  activityId: string;
  at: Date;
  /** The bunch whose evening it was, if it was one. */
  bunchId: string | null;
  /** Set when the evening is an occurrence of a standing arrangement. */
  seriesId: string | null;
  cityLabel: string | null;
}

export interface HostedEvening {
  activityId: string;
  at: Date;
  /** People other than the host who tapped in. */
  othersCheckedIn: number;
}

export interface StandingInput {
  checkIns: CheckIn[];
  hosted: HostedEvening[];
  /** When each introduction they made was accepted by both sides. */
  introductionsAccepted: Date[];
  /** True while they organise a standing arrangement that is still running. */
  runsSomethingWeekly: boolean;
}

export interface Standing {
  points: Record<XpTrack, number>;
  total: number;
  /** Title keys, current ones included. */
  titles: string[];
}

/** What one of each is worth. Round numbers, because they are shown. */
const VALUE: Record<XpTrack, number> = {
  TURNING_UP: 10,
  KEEPING_GOING: 15,
  SOMEWHERE_NEW: 20,
  HOSTING: 25,
  // The rarest thing anybody does here, and the one that costs the most
  // social capital: you are spending your own standing with two people.
  INTRODUCING: 40,
};

/** How many of each may count in one week. */
const WEEKLY_CAP: Record<XpTrack, number> = {
  TURNING_UP: 3,
  KEEPING_GOING: 2,
  SOMEWHERE_NEW: 2,
  HOSTING: 2,
  INTRODUCING: 2,
};

/** An evening only counts for its host once other people came to it. */
const HOSTING_NEEDS_OTHERS = 2;

/** Meeting the same group again counts as keeping something going after this. */
const KEEPING_GOING_GAP_DAYS = 21;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The ISO week an instant falls in, as a sortable key.
 *
 * Weeks rather than rolling windows, because a cap somebody can reason about
 * is a cap nobody has to think about. "Three a week" is a sentence; "three per
 * rolling one hundred and sixty-eight hours" is a puzzle.
 */
export function weekKey(at: Date): string {
  const date = new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()),
  );
  // Thursday of the same week decides the year, which is what makes the last
  // days of December fall in the right one.
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      (date.getTime() - firstThursday.getTime()) / (7 * DAY_MS) -
        ((firstThursday.getUTCDay() + 6) % 7) / 7,
    );
  return `${date.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

/** Counts events per week, then pays for at most `cap` of them. */
function payFor(dates: Date[], track: XpTrack): number {
  const perWeek = new Map<string, number>();
  for (const at of dates) {
    const key = weekKey(at);
    perWeek.set(key, (perWeek.get(key) ?? 0) + 1);
  }

  const cap = WEEKLY_CAP[track];
  let counted = 0;
  for (const inWeek of perWeek.values()) {
    counted += Math.min(inWeek, cap);
  }
  return counted * VALUE[track];
}

/**
 * Which check-ins are somebody keeping something going.
 *
 * Two shapes count. An occurrence of a standing arrangement is the obvious
 * one. The other is meeting the same group again after a gap of three weeks,
 * which is the honest version of "still going" for a bunch that arranges its
 * evenings one at a time: two evenings with the same people a month apart is a
 * group that is still a group, and it is exactly what a rolling activity score
 * cannot see.
 */
function keptGoing(checkIns: CheckIn[]): Date[] {
  const byBunch = new Map<string, Date[]>();
  for (const checkIn of checkIns) {
    if (!checkIn.bunchId) continue;
    const seen = byBunch.get(checkIn.bunchId) ?? [];
    seen.push(checkIn.at);
    byBunch.set(checkIn.bunchId, seen);
  }

  const dates: Date[] = [];
  for (const checkIn of checkIns) {
    if (checkIn.seriesId) {
      dates.push(checkIn.at);
      continue;
    }
    if (!checkIn.bunchId) continue;

    const others = byBunch.get(checkIn.bunchId) ?? [];
    const returning = others.some(
      (other) =>
        other.getTime() < checkIn.at.getTime() &&
        checkIn.at.getTime() - other.getTime() >= KEEPING_GOING_GAP_DAYS * DAY_MS,
    );
    if (returning) dates.push(checkIn.at);
  }
  return dates;
}

/**
 * The firsts: a group somebody had not met before, or a part of the world they
 * had not been to.
 *
 * Ordered by date and counted once, so the track rewards the evening that was
 * new rather than the fact of having been new at some point.
 */
function firsts(checkIns: CheckIn[]): Date[] {
  const ordered = [...checkIns].sort((a, b) => a.at.getTime() - b.at.getTime());
  const seenBunches = new Set<string>();
  const seenPlaces = new Set<string>();
  const dates: Date[] = [];

  for (const checkIn of ordered) {
    let isFirst = false;
    if (checkIn.bunchId && !seenBunches.has(checkIn.bunchId)) {
      seenBunches.add(checkIn.bunchId);
      // The very first bunch anybody meets is not "somewhere new", it is
      // simply the beginning. The track is about breadth, so it starts
      // counting at the second one.
      isFirst = seenBunches.size > 1;
    }
    if (checkIn.cityLabel && !seenPlaces.has(checkIn.cityLabel)) {
      seenPlaces.add(checkIn.cityLabel);
      if (seenPlaces.size > 1) isFirst = true;
    }
    if (isFirst) dates.push(checkIn.at);
  }

  return dates;
}

export function computeStanding(input: StandingInput): Standing {
  const points: Record<XpTrack, number> = {
    TURNING_UP: payFor(
      input.checkIns.map((checkIn) => checkIn.at),
      "TURNING_UP",
    ),
    KEEPING_GOING: payFor(keptGoing(input.checkIns), "KEEPING_GOING"),
    HOSTING: payFor(
      input.hosted
        .filter((evening) => evening.othersCheckedIn >= HOSTING_NEEDS_OTHERS)
        .map((evening) => evening.at),
      "HOSTING",
    ),
    INTRODUCING: payFor(input.introductionsAccepted, "INTRODUCING"),
    SOMEWHERE_NEW: payFor(firsts(input.checkIns), "SOMEWHERE_NEW"),
  };

  const total = Object.values(points).reduce((sum, value) => sum + value, 0);

  const scoped: Partial<Record<TitleScope, number>> = { ...points, TOTAL: total };
  const titles = titlesFor(scoped);
  if (input.runsSomethingWeekly) titles.push(WEEKLY_HOST_TITLE);

  return { points, total, titles };
}
