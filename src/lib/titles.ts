import type { XpTrack } from "@/generated/prisma/enums";

/**
 * The titles somebody can earn, and the only place they are defined.
 *
 * ## Why a closed catalogue, and not a field somebody types into
 *
 * `Profile.title` already holds a free-text line, it is staff-only, and the
 * schema says why: a badge rendered from text a member wrote is an
 * impersonation surface, because anybody could write "Bunchy Support" and ask
 * for a password. An earned title has to be visible on a profile to be worth
 * anything, so it has to be safe to render, so it can only ever be a key from
 * this file. There is no path from a keyboard to a badge.
 *
 * It also keeps the vocabulary ours. A title here is written as something a
 * person would say about somebody, "turns up", "knows everybody", rather than
 * as a rank. Nothing in this file is a level, a tier or a number, and the
 * words carry no comparison: two members can hold "Host" and neither of them
 * is above the other.
 *
 * ## Why the threshold is on a track rather than a total
 *
 * A title says what somebody did, and the tracks are the different things
 * there are to do. One threshold on a grand total would mean every title was
 * the same title with a bigger number behind it, which is a level system
 * wearing a costume.
 */

export type TitleScope = XpTrack | "TOTAL";

export interface Title {
  /** Stored, compared, and never shown. */
  key: string;
  /** Which track earns it, or the sum for the one that spans them. */
  scope: TitleScope;
  /** Points on that track. */
  at: number;
  /**
   * True when the title describes something currently true rather than
   * something that happened.
   *
   * Only one so far. "Runs a weekly night" has to be able to stop being true,
   * or the product is making a claim on somebody's behalf that stopped being
   * accurate the week they handed the night over. Everything else describes
   * the past, and the past does not lapse.
   */
  current?: boolean;
}

/**
 * Ordered within a scope, smallest first, so `titlesFor` can walk it and
 * `highestTitle` can take the last match without sorting at the call site.
 */
export const TITLES: readonly Title[] = [
  { key: "turns-up", scope: "TURNING_UP", at: 30 },
  { key: "always-there", scope: "TURNING_UP", at: 100 },
  { key: "a-fixture", scope: "TURNING_UP", at: 250 },

  { key: "sticks-with-it", scope: "KEEPING_GOING", at: 45 },
  { key: "keeps-a-room-going", scope: "KEEPING_GOING", at: 120 },

  { key: "host", scope: "HOSTING", at: 25 },
  { key: "keeps-the-lights-on", scope: "HOSTING", at: 125 },
  { key: "organises-everything", scope: "HOSTING", at: 375 },

  { key: "introducer", scope: "INTRODUCING", at: 40 },
  { key: "knows-everybody", scope: "INTRODUCING", at: 200 },

  { key: "gets-around", scope: "SOMEWHERE_NEW", at: 60 },
  { key: "new-face-everywhere", scope: "SOMEWHERE_NEW", at: 160 },

  { key: "regular", scope: "TOTAL", at: 500 },
] as const;

/**
 * The one title that describes a state rather than a history.
 *
 * Not in the table above because it is not earned by points at all: it is true
 * while somebody organises a standing arrangement that is still running, and
 * false the week they stop.
 */
export const WEEKLY_HOST_TITLE = "runs-a-weekly-night";

const BY_KEY = new Map<string, Title>(TITLES.map((title) => [title.key, title]));

export function isTitleKey(value: string): boolean {
  return BY_KEY.has(value) || value === WEEKLY_HOST_TITLE;
}

/** Where a title's words live, for whoever is rendering it. */
export function titlePath(key: string): string {
  return `titles.${key.replace(/-/g, "")}`;
}

/** Every title a set of track points has reached. */
export function titlesFor(
  points: Readonly<Partial<Record<TitleScope, number>>>,
): string[] {
  return TITLES.filter((title) => (points[title.scope] ?? 0) >= title.at).map(
    (title) => title.key,
  );
}

/**
 * The bunch catalogue, which is deliberately shorter.
 *
 * A group needs three states, not thirteen: it is starting, it is working, and
 * it has been working for a long time. Anything finer would be a ladder for
 * groups to climb, and a group climbing a ladder is a group doing things for
 * the ladder.
 */
export interface BunchTitle {
  key: string;
  /** Evenings that actually happened, corroborated at the door. */
  atEvenings: number;
}

export const BUNCH_TITLES: readonly BunchTitle[] = [
  { key: "getting-going", atEvenings: 3 },
  { key: "going-strong", atEvenings: 10 },
  { key: "an-institution", atEvenings: 25 },
] as const;

/** The highest one a bunch has reached, or null. */
export function bunchTitleFor(eveningsHeld: number): string | null {
  let earned: string | null = null;
  for (const title of BUNCH_TITLES) {
    if (eveningsHeld >= title.atEvenings) earned = title.key;
  }
  return earned;
}
