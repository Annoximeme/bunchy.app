/**
 * Brand fills, and the one colour that can be read on each of them.
 *
 * The tokens file has said this from the beginning, every accent ships a
 * `--color-on-x` precisely because the fills are too bright to carry white
 * text. It was being followed for buttons and ignored for avatars: the landing
 * page set white initials on the yellow and mint discs, which measure 1.54:1
 * and 1.79:1. Legible only if you already knew what letter to expect.
 *
 * This is the rule in one place so the landing page and the signed-in app
 * cannot drift apart on it again. Literals rather than `var(--color-…)`,
 * because the landing is a fixed composition whose colours must not follow the
 * theme, and the app's avatar fills should not either, a person's colour
 * identifies them, so it has to survive a theme change.
 */

export interface BrandColour {
  /** The disc. */
  fill: string;
  /** The only label colour that passes AA on it. */
  ink: string;
}

export const CORAL: BrandColour = { fill: "#FF5C6C", ink: "#172033" }; // 5.42:1
export const PURPLE: BrandColour = { fill: "#7657FF", ink: "#FFFFFF" }; // 4.59:1
export const MINT: BrandColour = { fill: "#55D6BE", ink: "#172033" }; // 9.10:1
export const YELLOW: BrandColour = { fill: "#FFC857", ink: "#172033" }; // 10.58:1
/** Deeper coral and lighter purple, so six people get six distinct discs. */
export const CORAL_DEEP: BrandColour = { fill: "#CE2F45", ink: "#FFFFFF" }; // 5.10:1
export const PURPLE_LIGHT: BrandColour = { fill: "#9B85FF", ink: "#172033" }; // 5.57:1

/** The rotation used wherever a colour only has to say "a different person". */
export const AVATAR_COLOURS: BrandColour[] = [
  CORAL,
  PURPLE,
  MINT,
  YELLOW,
  CORAL_DEEP,
  PURPLE_LIGHT,
];

/**
 * A stable colour for a name.
 *
 * FNV-1a, so somebody keeps the same disc on every page and in every session.
 * A colour that changed per render would be noise rather than identity.
 */
export function colourFor(name: string): BrandColour {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i += 1) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return AVATAR_COLOURS[Math.abs(hash) % AVATAR_COLOURS.length]!;
}
