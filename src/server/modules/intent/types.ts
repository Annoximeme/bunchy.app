import type { AvailabilityWindow, SocialGoal } from "@/generated/prisma/enums";

/**
 * What somebody meant when they typed "I want to play Warhammer tonight".
 *
 * Every field here is either something the member wrote or something resolved
 * against data that already exists — an interest row, an enum value, a place in
 * the gazetteer. Nothing is generated. That is the structural answer to §23's
 * "never fabricate": the parser has no vocabulary of its own to invent from, and
 * the AI path (see `resolve.ts`) can only *select* from the same catalogue, so
 * an assistant that hallucinates an interest produces a slug that matches
 * nothing and is dropped before anyone sees it.
 *
 * `unrecognised` and `notes` exist for the same reason. A parser that silently
 * discards half a sentence looks like it understood; one that says "I ignored
 * 'with my brother'" and "I read 'tonight' as this evening" can be corrected.
 */

export interface IntentWhen {
  /** Inclusive start, UTC. Never earlier than `now`. */
  from: Date;
  /** Exclusive end, UTC. */
  to: Date;
  /** What the member actually wrote: "tonight", "Saturday", "this weekend". */
  label: string;
  /**
   * Whether a time of day was actually named.
   *
   * "tonight" and "Friday evening" are `part` — there is a real hour in there.
   * "Saturday" and "this weekend" are `day`, and their `from` is local midnight
   * purely because a range has to start somewhere. Callers that need a *moment*
   * rather than a window must not treat the two the same: scheduling "hiking
   * Saturday" for 00:00 is inventing a commitment nobody made.
   */
  precision: "day" | "part";
}

export interface SocialIntent {
  /** Verbatim. Kept so a member can see what was parsed, and for the audit trail. */
  raw: string;
  /**
   * A short human label for the thing itself — "Warhammer", "Hiking",
   * "Helldivers". Names the bunch an Instant Bunch creates.
   */
  topic: string | null;
  /** Interest slugs that exist in the catalogue. Never invented. */
  interestSlugs: string[];
  goals: SocialGoal[];
  windows: AvailabilityWindow[];
  when: IntentWhen | null;
  mode: "ONLINE" | "OFFLINE" | null;
  /**
   * A place name the member typed, unresolved. `resolveIntent` geocodes it;
   * the pure parser only spots that a place was named.
   */
  placeHint: string | null;
  /** How many people they want, including themselves. Null when unstated. */
  groupSize: number | null;
  /** Terms that grounded in nothing. Shown back rather than dropped. */
  unrecognised: string[];
  /** Assumptions worth admitting to, e.g. "Read 'tonight' as this evening." */
  notes: string[];
}

/**
 * One interest, as the parser needs to see it.
 *
 * Aliases are how "40k" reaches Warhammer and "d&d" reaches Dungeons & Dragons.
 * They live next to the catalogue rather than in the parser so a member-created
 * interest can carry them later without a code change.
 */
export interface IntentInterest {
  interestId: string;
  slug: string;
  label: string;
  aliases?: readonly string[];
}

/** Everything the pure parser is allowed to know about the world. */
export interface IntentCatalogue {
  interests: readonly IntentInterest[];
}
