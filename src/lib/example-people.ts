import {
  CORAL,
  CORAL_DEEP,
  MINT,
  PURPLE,
  PURPLE_LIGHT,
  YELLOW,
  type BrandColour,
} from "@/lib/palette";

/**
 * The six illustrative people the landing page keeps reusing.
 *
 * They appear in the hero cluster, in the plan cards further down, and on the
 * sign-in page. Before this existed each surface picked colours by array index,
 * so the same initial came out coral in one card and mint in the next — which
 * quietly undoes the thing the whole page is arguing, that these are people
 * rather than decoration. A person whose colour changes between two cards is
 * two people.
 *
 * Colours come from `palette.ts` rather than being written here, so the cast
 * and the signed-in app's avatars obey one table — including its rule about
 * which label colour each fill can carry.
 */
const CAST: Record<string, BrandColour> = {
  S: CORAL,
  M: PURPLE,
  E: MINT,
  T: YELLOW,
  P: CORAL_DEEP,
  W: PURPLE_LIGHT,
};

/** Falls back to coral for any initial outside the cast. */
export function person(initial: string): BrandColour {
  return CAST[initial.toUpperCase()] ?? CORAL;
}

/** Just the disc colour, for the places that only need the fill. */
export function personColour(initial: string): string {
  return person(initial).fill;
}
