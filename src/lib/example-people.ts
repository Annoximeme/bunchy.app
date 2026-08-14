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
 * Six names against four brand colours means two of them share, which is fine:
 * the point is that a given initial is always the same colour, not that every
 * colour is unique.
 */
export const PERSON_COLOUR: Record<string, string> = {
  S: "#FF5C6C",
  M: "#7657FF",
  E: "#55D6BE",
  T: "#FFC857",
  P: "#FF5C6C",
  W: "#7657FF",
};

/** Falls back to coral for any initial not in the cast. */
export function personColour(initial: string): string {
  return PERSON_COLOUR[initial.toUpperCase()] ?? "#FF5C6C";
}
