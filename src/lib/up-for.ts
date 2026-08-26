import { phrase, type PhraseRef } from "@/lib/i18n/phrase";

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
  label: PhraseRef;
}

export const ACTIVITIES: Option[] = [
  { value: "gaming", label: phrase("upFor.activities.gaming") },
  { value: "watch", label: phrase("upFor.activities.watch") },
  { value: "food", label: phrase("upFor.activities.food") },
  { value: "music", label: phrase("upFor.activities.music") },
  { value: "hang-out", label: phrase("upFor.activities.hang-out") },
  { value: "create", label: phrase("upFor.activities.create") },
  { value: "study", label: phrase("upFor.activities.study") },
  { value: "co-work", label: phrase("upFor.activities.co-work") },
  { value: "sports", label: phrase("upFor.activities.sports") },
  { value: "outdoors", label: phrase("upFor.activities.outdoors") },
  { value: "board-games", label: phrase("upFor.activities.board-games") },
  { value: "surprise", label: phrase("upFor.activities.surprise") },
];

export const PLACES: Option[] = [
  { value: "online", label: phrase("upFor.places.online") },
  { value: "in-person", label: phrase("upFor.places.in-person") },
  { value: "either", label: phrase("upFor.places.either") },
];

export const TIMES: Option[] = [
  { value: "now", label: phrase("upFor.times.now") },
  { value: "tonight", label: phrase("upFor.times.tonight") },
  { value: "weekend", label: phrase("upFor.times.weekend") },
  { value: "sometime", label: phrase("upFor.times.sometime") },
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
