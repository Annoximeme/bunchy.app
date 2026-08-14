/**
 * The six illustrative people the landing page keeps reusing.
 *
 * They appear in the hero cluster, in the plan cards further down, and in the
 * Bunch Moment. Before this existed each surface picked colours by array index,
 * so the same initial came out coral in one card and mint in the next — which
 * quietly undoes the thing the whole page is arguing, that these are people
 * rather than decoration. A person whose colour changes between two cards is
 * two people.
 *
 * Six people against four accents, so P and W take the deeper coral and the
 * lighter purple the palette already carries as its text-safe inks rather than
 * repeating a fill exactly. When two of these overlap in a cluster — and they
 * always do, the avatars are deliberately stacked — two identical circles read
 * as one wide blob rather than as two people.
 */
export const PERSON_COLOUR: Record<string, string> = {
  S: "#FF5C6C",
  M: "#7657FF",
  E: "#55D6BE",
  T: "#FFC857",
  P: "#CE2F45",
  W: "#9B85FF",
};

/** Falls back to coral for any initial not in the cast. */
export function personColour(initial: string): string {
  return PERSON_COLOUR[initial.toUpperCase()] ?? "#FF5C6C";
}
