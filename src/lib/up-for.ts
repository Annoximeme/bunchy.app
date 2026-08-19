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
  label: string;
}

export const ACTIVITIES: Option[] = [
  { value: "gaming", label: "🎮 Gaming" },
  { value: "watch", label: "🎬 Watch something" },
  { value: "food", label: "🍜 Food" },
  { value: "music", label: "🎧 Music" },
  { value: "hang-out", label: "💬 Hang out" },
  { value: "create", label: "🎨 Create something" },
  { value: "study", label: "📚 Study" },
  { value: "co-work", label: "💻 Co-work" },
  { value: "sports", label: "🏀 Sports" },
  { value: "outdoors", label: "🥾 Outdoors" },
  { value: "board-games", label: "🎲 Board games" },
  { value: "surprise", label: "🤷 Surprise me" },
];

export const PLACES: Option[] = [
  { value: "online", label: "Online" },
  { value: "in-person", label: "In person" },
  { value: "either", label: "Either" },
];

export const TIMES: Option[] = [
  { value: "now", label: "Now" },
  { value: "tonight", label: "Tonight" },
  { value: "weekend", label: "This weekend" },
  { value: "sometime", label: "Sometime" },
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
