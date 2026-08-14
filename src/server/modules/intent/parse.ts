import type { AvailabilityWindow, SocialGoal } from "@/generated/prisma/enums";
import type {
  IntentCatalogue,
  IntentWhen,
  SocialIntent,
} from "@/server/modules/intent/types";
import { ONLINE_FIRST_INTERESTS } from "@/lib/interests";

/**
 * "I want to play Warhammer tonight" → something the matching engine can use.
 *
 * Deterministic and pure. An LLM would parse a wider range of sentences, and
 * `resolve.ts` can put one in front of this — but the *floor* has to be a
 * function, for three reasons:
 *
 * 1. It cannot invent. Interests come from the catalogue passed in, times from
 *    a fixed grammar, goals from an enum. There is no path by which this
 *    returns a person, a place or an interest that does not exist.
 * 2. It cannot fail. No key, no network, no quota, no latency. "Start a Bunch"
 *    is the product's primary action (§15) and it works with the AI switched
 *    off entirely.
 * 3. It can be tested exhaustively, which is how the time grammar stays correct
 *    across timezones — the part most likely to be quietly wrong.
 *
 * Everything it did not understand comes back in `unrecognised`, and every
 * assumption comes back in `notes`. The screen shows both. A parser that
 * silently drops half a sentence looks like it understood it.
 */

const HOUR_MS = 3_600_000;

/** Local hours for a part of the day, as [start, end) on a 24-hour clock. */
const PARTS: Record<string, [number, number]> = {
  morning: [6, 12],
  afternoon: [12, 18],
  // "Friday night" is a social evening, not 03:00. LATE_NIGHT is reached by
  // saying "late", which is what people actually write when they mean it.
  evening: [18, 23],
  night: [18, 23],
};

const WEEKDAYS = [
  "sunday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday",
] as const;

/** Phrases that pin a mode down. Checked before any inference from interests. */
const ONLINE_WORDS = [
  "online", "discord", "on voice", "voice chat", "remote", "remotely",
  "over steam", "on steam", "in game", "in-game", "virtually", "video call",
];
const OFFLINE_WORDS = [
  "in person", "in-person", "irl", "meet up", "meetup", "face to face",
  "outside", "outdoors", "somewhere near", "local",
];

/**
 * Turns of phrase that name a social goal.
 *
 * Only the goals a request can plausibly express. Nobody types "I'm looking for
 * a mentor in strategy games" into a Start-a-Bunch box, and guessing at the
 * rest would put words in people's mouths.
 */
const GOAL_PHRASES: ReadonlyArray<readonly [string, SocialGoal]> = [
  ["make friends", "NEW_FRIENDS"],
  ["new friends", "NEW_FRIENDS"],
  ["meet people", "NEW_FRIENDS"],
  ["meet new people", "NEW_FRIENDS"],
  ["gaming buddies", "GAMING_FRIENDS"],
  ["gaming friends", "GAMING_FRIENDS"],
  ["someone to play", "GAMING_FRIENDS"],
  ["go out", "GOING_OUT"],
  ["going out", "GOING_OUT"],
  ["grab drinks", "GOING_OUT"],
  ["get drinks", "GOING_OUT"],
  ["night out", "GOING_OUT"],
  ["study partner", "STUDY_PARTNERS"],
  ["study together", "STUDY_PARTNERS"],
  ["train with", "FITNESS_PARTNERS"],
  ["training partner", "FITNESS_PARTNERS"],
  ["gym buddy", "FITNESS_PARTNERS"],
  ["collaborate", "CREATIVE_COLLABORATORS"],
  ["work on something", "CREATIVE_COLLABORATORS"],
  ["hobby partner", "HOBBY_PARTNERS"],
  ["travel", "TRAVEL_COMPANIONS"],
  ["something to do", "ACTIVITY_PARTNERS"],
  ["someone to do", "ACTIVITY_PARTNERS"],
];

/** Words that carry no meaning on their own, so are never reported as ignored. */
const FILLER = new Set([
  "i", "id", "im", "want", "wanna", "would", "like", "love", "to", "the", "a",
  "an", "some", "any", "for", "with", "and", "or", "of", "in", "on", "at", "my",
  "me", "we", "us", "you", "who", "that", "this", "it", "is", "are", "am", "be",
  "do", "does", "go", "going", "get", "getting", "find", "finding", "looking",
  "look", "someone", "somebody", "people", "person", "anyone", "guys", "folks",
  "up", "out", "new", "good", "nice", "fun", "really", "just", "maybe", "some",
  "something", "sometime", "please", "can", "could", "should", "need", "needs",
  "have", "has", "there", "here", "near", "nearby", "around", "about", "more",
  "play", "playing", "join", "joining", "make", "making", "try", "trying",
  "tonight", "today", "tomorrow", "weekend", "week", "next", "this", "later",
  "if", "so", "but", "not", "no", "yes", "one", "two", "few", "group", "other",
  "others", "together", "into", "who's", "whos", "am", "his", "her", "their",
]);

/**
 * A sentence with a record of which spans have already been claimed.
 *
 * Matching longest-first and consuming as it goes is what stops "board games"
 * from also matching "games", and what stops the place in "hiking near Ghent"
 * from being scanned for interests.
 */
class Scanner {
  readonly lower: string;
  private readonly taken: boolean[];

  constructor(raw: string) {
    this.lower = raw.toLowerCase();
    this.taken = new Array<boolean>(this.lower.length).fill(false);
  }

  /** First unclaimed, word-bounded occurrence of `phrase`, or -1. */
  indexOf(phrase: string): number {
    if (phrase.length === 0) return -1;
    let from = 0;
    for (;;) {
      const at = this.lower.indexOf(phrase, from);
      if (at === -1) return -1;
      const end = at + phrase.length;
      if (this.isWordBounded(at, end) && !this.isTaken(at, end)) return at;
      from = at + 1;
    }
  }

  claim(start: number, end: number): void {
    for (let i = start; i < end && i < this.taken.length; i++) this.taken[i] = true;
  }

  /** Claims `phrase` if present. Returns whether it was found. */
  take(phrase: string): boolean {
    const at = this.indexOf(phrase);
    if (at === -1) return false;
    this.claim(at, at + phrase.length);
    return true;
  }

  /** Words nothing has claimed, in order, deduplicated. */
  leftovers(): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    const pattern = /[a-z0-9][a-z0-9'’-]*/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(this.lower)) !== null) {
      const start = match.index;
      if (this.isTaken(start, start + match[0].length)) continue;
      const word = match[0].replace(/['’-]+$/, "");
      if (word.length < 3 || FILLER.has(word) || seen.has(word)) continue;
      seen.add(word);
      out.push(word);
    }
    return out;
  }

  private isTaken(start: number, end: number): boolean {
    for (let i = start; i < end; i++) if (this.taken[i]) return true;
    return false;
  }

  private isWordBounded(start: number, end: number): boolean {
    const before = start === 0 ? "" : this.lower[start - 1]!;
    const after = end >= this.lower.length ? "" : this.lower[end]!;
    return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
  }
}

export interface ParseOptions {
  now?: Date;
  /** IANA zone. Times in the sentence are the member's local times. */
  timezone?: string | null;
}

export function parseIntent(
  raw: string,
  catalogue: IntentCatalogue,
  options: ParseOptions = {},
): SocialIntent {
  const now = options.now ?? new Date();
  const timezone = options.timezone ?? null;
  const scanner = new Scanner(raw);
  const notes: string[] = [];

  // Order matters throughout: each step claims its span so later steps cannot
  // reinterpret it. Place first, because a city name can look like anything.
  const placeHint = takePlaceHint(scanner, raw);
  const timing = takeWhen(scanner, now, timezone, notes);
  const groupSize = takeGroupSize(scanner, notes);
  const explicitMode = takeMode(scanner);
  const goals = takeGoals(scanner);
  const { slugs, labels } = takeInterests(scanner, catalogue);

  // "play <something we've never heard of>" is still a request to play a game.
  // Naming the thing matters — the bunch ends up called "Zomboid tonight" —
  // but it is an inference, so it is admitted to.
  let topic = labels[0] ?? null;
  const unknownGame = takeUnknownGame(scanner, raw, slugs.length > 0);
  if (unknownGame) {
    topic = unknownGame;
    const gaming = catalogue.interests.find((i) => i.slug === "gaming");
    if (gaming && !slugs.includes(gaming.slug)) {
      slugs.push(gaming.slug);
      notes.push(`Read “${unknownGame}” as gaming, change it if that's wrong.`);
    }
  }

  const mode = explicitMode ?? inferMode(slugs, notes);

  return {
    raw,
    topic,
    interestSlugs: slugs,
    goals,
    windows: timing?.windows ?? [],
    when: timing?.when ?? null,
    mode,
    placeHint,
    groupSize,
    unrecognised: scanner.leftovers().slice(0, 5),
    notes,
  };
}

// --- Place ------------------------------------------------------------------

/**
 * The words after "in", "near" or "around", kept verbatim for the geocoder.
 *
 * Resolution happens in `resolve.ts`, which has the gazetteer. This only spots
 * that a place was named — and claims the span, so "Ghent" is never scanned for
 * interests or leftovers.
 */
function takePlaceHint(scanner: Scanner, raw: string): string | null {
  const pattern = /\b(?:in|near|around|close to)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’.-]*(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’.-]*){0,2})/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(raw)) !== null) {
    if (!match[1]) continue;

    // Up to three words, because "The Hague" and "Sint-Niklaas Centrum" exist —
    // then trim back off the end, because "near Ghent this weekend" would
    // otherwise geocode "Ghent this weekend" and find nothing.
    const words = match[1].split(/\s+/);
    while (words.length > 0 && PLACE_TAIL_STOP.has(words[words.length - 1]!.toLowerCase())) {
      words.pop();
    }
    if (words.length === 0) continue;

    // "in person" and "around here" are not places.
    const head = words[0]!.toLowerCase();
    if (FILLER.has(head) || head === "person" || head === "town") continue;

    const captured = words.join(" ");
    const start = match.index + match[0].indexOf(captured);
    scanner.claim(start, start + captured.length);
    return captured;
  }

  return null;
}

/** Words that end a place name rather than continuing it. */
const PLACE_TAIL_STOP = new Set([
  ...FILLER,
  ...WEEKDAYS,
  "weekend", "weekends", "tonight", "today", "tomorrow", "week",
  "evening", "morning", "afternoon", "night", "late", "online", "sometime",
]);

// --- Time -------------------------------------------------------------------

interface Timing {
  when: IntentWhen;
  windows: AvailabilityWindow[];
}

/** Civil date parts as seen in the member's zone. */
function localParts(at: Date, offset: number) {
  const shifted = new Date(at.getTime() + offset * HOUR_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours() + shifted.getUTCMinutes() / 60,
    weekday: shifted.getUTCDay(),
  };
}

/** A local civil date plus an hour, back as a UTC instant. */
function toUtc(
  parts: { year: number; month: number; day: number },
  hour: number,
  offset: number,
): Date {
  return new Date(
    Date.UTC(parts.year, parts.month, parts.day) + (hour - offset) * HOUR_MS,
  );
}

function offsetFor(timezone: string | null, at: Date): number {
  if (!timezone) return 0;
  try {
    const name = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value;
    const match = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
    if (!match) return 0;
    return (match[1] === "-" ? -1 : 1) * (Number(match[2]) + Number(match[3]) / 60);
  } catch {
    return 0;
  }
}

function takeWhen(
  scanner: Scanner,
  now: Date,
  timezone: string | null,
  notes: string[],
): Timing | null {
  const offset = offsetFor(timezone, now);
  const today = localParts(now, offset);

  /** Builds the result from a local day offset and an hour range. */
  const build = (
    daysAhead: number,
    hours: [number, number],
    label: string,
    spanDays = 1,
  ): Timing => {
    // A range covering the whole day means no time of day was named; its
    // midnight start is an artefact of needing somewhere to begin.
    const precision: "day" | "part" =
      hours[0] === 0 && hours[1] === 24 ? "day" : "part";
    const startDay = {
      year: today.year,
      month: today.month,
      day: today.day + daysAhead,
    };
    const from = toUtc(startDay, hours[0], offset);
    const to = toUtc(
      { ...startDay, day: startDay.day + spanDays - 1 },
      hours[1],
      offset,
    );

    // Never propose a slot that has already started passing.
    const clamped = from.getTime() < now.getTime() ? now : from;
    if (clamped !== from) {
      notes.push(`“${label}” has already started, showing what's left of it.`);
    }

    const weekend = spansWeekend(today.weekday, daysAhead, spanDays);
    return {
      when: { from: clamped, to, label, precision },
      windows: windowsFor(hours, weekend),
    };
  };

  // Most specific first: "next weekend" must win over "weekend", and
  // "this evening" over a bare weekday.
  if (scanner.take("next weekend")) {
    const ahead = daysUntil(today.weekday, 6) + 7;
    return build(ahead, [0, 24], "next weekend", 2);
  }
  for (const phrase of ["this weekend", "the weekend", "weekend"]) {
    if (scanner.take(phrase)) {
      const ahead = daysUntil(today.weekday, 6);
      return build(ahead, [0, 24], "this weekend", 2);
    }
  }
  // Before the bare "tonight", which would otherwise swallow the "tonight" in
  // "late tonight" and lose the only word that distinguished them.
  if (scanner.take("late tonight") || scanner.take("late night")) {
    return build(0, [23, 26], "late tonight");
  }
  for (const phrase of ["tonight", "this evening"]) {
    if (scanner.take(phrase)) return build(0, PARTS.evening!, "tonight");
  }
  for (const part of ["morning", "afternoon"] as const) {
    if (scanner.take(`this ${part}`)) return build(0, PARTS[part]!, `this ${part}`);
  }
  if (scanner.indexOf("tomorrow") !== -1) {
    scanner.take("tomorrow");
    const part = takePart(scanner);
    return build(1, part ? PARTS[part]! : [0, 24], part ? `tomorrow ${part}` : "tomorrow");
  }
  if (scanner.take("today")) {
    const part = takePart(scanner);
    return build(0, part ? PARTS[part]! : [0, 24], part ? `today ${part}` : "today");
  }

  for (let index = 0; index < WEEKDAYS.length; index++) {
    const name = WEEKDAYS[index]!;
    if (scanner.indexOf(name) === -1) continue;

    // "next Friday" is a week further out than "Friday", the same way "next
    // weekend" is. English speakers do disagree about this, which is exactly
    // why the resolved date is shown back to the member for correction.
    const nextWeek = scanner.take(`next ${name}`);
    if (!nextWeek) scanner.take(name);

    const part = takePart(scanner);
    const ahead = daysUntil(today.weekday, index) + (nextWeek ? 7 : 0);
    const label =
      (nextWeek ? "Next " : "") + capitalize(name) + (part ? ` ${part}` : "");
    return build(ahead, part ? PARTS[part]! : [0, 24], label);
  }

  if (scanner.take("next week")) return build(7, [0, 24], "next week", 7);

  return null;
}

/** Claims a trailing part-of-day word, e.g. the "night" in "Friday night". */
function takePart(scanner: Scanner): keyof typeof PARTS | null {
  for (const part of ["morning", "afternoon", "evening", "night"] as const) {
    if (scanner.take(part)) return part;
  }
  return null;
}

/** Days from `from` (0=Sunday) forward to `target`, today counting as 0. */
function daysUntil(from: number, target: number): number {
  return (target - from + 7) % 7;
}

function spansWeekend(todayWeekday: number, daysAhead: number, spanDays: number): boolean {
  for (let i = 0; i < spanDays; i++) {
    const weekday = (todayWeekday + daysAhead + i) % 7;
    if (weekday === 0 || weekday === 6) return true;
  }
  return false;
}

/**
 * Which symbolic windows an hour range touches.
 *
 * A whole day touches all of them, which is correct — "Saturday" really does
 * mean any time on Saturday, and narrowing it further would invent a preference
 * the member never expressed.
 */
function windowsFor(hours: [number, number], weekend: boolean): AvailabilityWindow[] {
  const prefix = weekend ? "WEEKEND" : "WEEKDAY";
  const [start, end] = hours;
  const out: AvailabilityWindow[] = [];

  const touches = (a: number, b: number) => start < b && end > a;
  if (touches(6, 12)) out.push(`${prefix}_MORNING` as AvailabilityWindow);
  if (touches(12, 18)) out.push(`${prefix}_AFTERNOON` as AvailabilityWindow);
  if (touches(18, 23)) out.push(`${prefix}_EVENING` as AvailabilityWindow);
  // Past 23:00 local, or before 06:00, is the late-night window in either week.
  if (touches(23, 30) || touches(0, 6)) out.push("LATE_NIGHT");

  return out;
}

// --- Group size -------------------------------------------------------------

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

/**
 * How many people, counting the member.
 *
 * "A group of five" is five. "With three people" is four — them plus three.
 * The reading is a guess either way, so it is written into `notes` and the
 * screen makes it editable (§2: "Change group size").
 */
function takeGroupSize(scanner: Scanner, notes: string[]): number | null {
  const numeric = "(\\d{1,2}|" + Object.keys(NUMBER_WORDS).join("|") + ")";

  const patterns: ReadonlyArray<readonly [RegExp, (n: number) => number, string]> = [
    [new RegExp(`\\bgroup of ${numeric}\\b`), (n) => n, "group of"],
    [new RegExp(`\\b${numeric} of us\\b`), (n) => n, "of us"],
    [new RegExp(`\\bjust ${numeric}\\b`), (n) => n, "just"],
    [
      new RegExp(`\\b(?:with|and|plus) ${numeric} (?:other |more )?(?:people|players|friends|others)\\b`),
      (n) => n + 1,
      "with",
    ],
    [
      new RegExp(`\\b${numeric} (?:other |more )?(?:people|players|friends|others)\\b`),
      (n) => n + 1,
      "people",
    ],
  ];

  for (const [pattern, toTotal, kind] of patterns) {
    const match = pattern.exec(scanner.lower);
    if (!match?.[1]) continue;
    if (scanner.indexOf(match[0]) === -1) continue;

    const raw = NUMBER_WORDS[match[1]] ?? Number(match[1]);
    if (!Number.isFinite(raw) || raw < 1 || raw > 40) continue;

    scanner.take(match[0]);
    const total = toTotal(raw);
    if (kind === "with" || kind === "people") {
      notes.push(`Counted ${total} people including you.`);
    }
    return total;
  }

  return null;
}

// --- Mode -------------------------------------------------------------------

function takeMode(scanner: Scanner): "ONLINE" | "OFFLINE" | null {
  for (const word of ONLINE_WORDS) if (scanner.take(word)) return "ONLINE";
  for (const word of OFFLINE_WORDS) if (scanner.take(word)) return "OFFLINE";
  return null;
}

/** Only ever a guess, and only when the member said nothing either way. */
function inferMode(slugs: string[], notes: string[]): "ONLINE" | "OFFLINE" | null {
  if (slugs.length === 0) return null;
  const online = slugs.filter((s) => ONLINE_FIRST_INTERESTS.has(s)).length;
  if (online === 0) return null;
  if (online === slugs.length) {
    notes.push("Assumed online, say “in person” if you'd rather meet up.");
    return "ONLINE";
  }
  return null;
}

// --- Goals and interests ----------------------------------------------------

function takeGoals(scanner: Scanner): SocialGoal[] {
  const found = new Set<SocialGoal>();
  // Longest phrase first, so "meet new people" is not consumed by "meet people".
  const ordered = [...GOAL_PHRASES].sort((a, b) => b[0].length - a[0].length);
  for (const [phrase, goal] of ordered) {
    if (scanner.take(phrase)) found.add(goal);
  }
  return [...found];
}

function takeInterests(
  scanner: Scanner,
  catalogue: IntentCatalogue,
): { slugs: string[]; labels: string[] } {
  // Every way of naming every interest, longest phrase first. Longest-first is
  // what makes "board games" beat "games" and "live music" beat "music".
  const phrases: Array<{ phrase: string; slug: string; label: string }> = [];
  for (const interest of catalogue.interests) {
    const names = [
      interest.label.toLowerCase(),
      interest.slug.replace(/-/g, " "),
      ...(interest.aliases ?? []),
    ];
    for (const phrase of new Set(names)) {
      if (phrase.length >= 2) {
        phrases.push({ phrase, slug: interest.slug, label: interest.label });
      }
    }
  }
  phrases.sort((a, b) => b.phrase.length - a.phrase.length);

  const slugs: string[] = [];
  const labels: string[] = [];
  for (const { phrase, slug, label } of phrases) {
    if (slugs.includes(slug)) continue;
    if (!scanner.take(phrase)) continue;
    slugs.push(slug);
    labels.push(label);
  }

  return { slugs, labels };
}

/**
 * The proper noun after "play", when the catalogue had nothing to say about it.
 *
 * Returned in the member's own capitalisation — a bunch called "Zomboid
 * tonight" reads like a person wrote it, "zomboid tonight" does not.
 */
function takeUnknownGame(
  scanner: Scanner,
  raw: string,
  matchedSomething: boolean,
): string | null {
  if (matchedSomething) return null;

  const match = /\b(?:play|playing)\s+([A-Za-z][A-Za-z0-9'’:-]*(?:\s+\d+)?)/.exec(raw);
  const captured = match?.[1];
  if (!match || !captured) return null;

  const word = captured.toLowerCase().split(/\s+/)[0]!;
  if (FILLER.has(word) || word.length < 3) return null;

  const at = match.index + match[0].length - captured.length;
  if (scanner.indexOf(captured.toLowerCase()) === -1) return null;
  scanner.claim(at, at + captured.length);

  return captured;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
