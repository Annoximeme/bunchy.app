import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { PhrasePath } from "@/lib/i18n/translate";

/**
 * The vocabulary behind "What are you up for?".
 *
 * Shared by the landing-page form and the sign-up page that receives its query
 * string, so the two can never drift into disagreeing about what `want=gaming`
 * means.
 *
 * Everything arriving here is a query parameter, which is to say it is a string
 * an attacker chooses. `resolveIntent` looks values up in these tables and
 * returns null for anything it does not recognise, so the sign-up page renders
 * labels this file owns, never text from the URL. That is the whole reason the
 * lookup exists rather than titlecasing the raw parameter.
 */

export interface Option {
  value: string;
  /**
   * Where the label is, not the label itself.
   *
   * The `value` is the part that travels in the query string and is stored, so
   * it stays English and stays stable: `want=gaming` has to mean the same thing
   * next year and in every language. Only the word shown to a reader moves.
   */
  label: PhrasePath<Dictionary>;
}

export const ACTIVITIES: Option[] = [
  { value: "gaming", label: "upFor.activities.gaming" },
  { value: "watch", label: "upFor.activities.watch" },
  { value: "food", label: "upFor.activities.food" },
  { value: "music", label: "upFor.activities.music" },
  { value: "hang-out", label: "upFor.activities.hang-out" },
  { value: "create", label: "upFor.activities.create" },
  { value: "study", label: "upFor.activities.study" },
  { value: "co-work", label: "upFor.activities.co-work" },
  { value: "sports", label: "upFor.activities.sports" },
  { value: "outdoors", label: "upFor.activities.outdoors" },
  { value: "board-games", label: "upFor.activities.board-games" },
  { value: "surprise", label: "upFor.activities.surprise" },
];

export const PLACES: Option[] = [
  { value: "online", label: "upFor.places.online" },
  { value: "in-person", label: "upFor.places.in-person" },
  { value: "either", label: "upFor.places.either" },
];

export const TIMES: Option[] = [
  { value: "now", label: "upFor.times.now" },
  { value: "tonight", label: "upFor.times.tonight" },
  { value: "weekend", label: "upFor.times.weekend" },
  { value: "sometime", label: "upFor.times.sometime" },
];

export interface ResolvedIntent {
  want: Option;
  where: Option;
  when: Option;
}

function find(options: Option[], value: string | undefined): Option | null {
  if (!value) return null;
  return options.find((o) => o.value === value) ?? null;
}

/**
 * Turns a query string into labels, or null when there is nothing usable.
 *
 * All three have to resolve. A half-filled intent ("gaming", somewhere,
 * sometime) would render a sentence with holes in it, and the honest fallback
 * is to say nothing rather than to guess at what was meant.
 */
export function resolveIntent(params: {
  want?: string;
  where?: string;
  when?: string;
}): ResolvedIntent | null {
  const want = find(ACTIVITIES, params.want);
  const where = find(PLACES, params.where);
  const when = find(TIMES, params.when);
  if (!want || !where || !when) return null;
  return { want, where, when };
}
