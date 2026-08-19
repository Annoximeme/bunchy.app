/**
 * Product identity in one place.
 *
 * Every user-facing occurrence of the name, tagline and positioning line reads
 * from here, so a brand change is a change to this file rather than a grep
 * across the codebase. `altTaglines` are the approved alternates from the brand
 * spec, kept here so nobody invents a new one in a component.
 */
export const brand = {
  name: "Bunchy",
  domain: "bunchy.app",
  /** The primary line. Spec §40: this is the one that stays. */
  tagline: "Find your bunch.",
  positioning: "You don't need more followers. You need a bunch.",
  /**
   * The line that lands in every meta description and every share preview.
   *
   * It used to say Bunchy used AI to connect people, which was never true.
   * Matching is a deterministic algorithm on our own servers and the assistant
   * is template-driven, with no model and no provider anywhere in the product.
   * The privacy policy has always described it accurately; this line was the
   * one place the site oversold itself, and it was the first thing anybody read.
   */
  subtitle:
    "Bunchy finds you a handful of people who are into the same things you are, and free when you are.",
  altTaglines: [
    "Find your people.",
    "Meet people who get you.",
    "Stop scrolling. Start connecting.",
    "Your people are out there.",
  ],
} as const;

/** The social unit, in prose. Used where copy needs the noun rather than a label. */
export const BUNCH_NOUN = { singular: "bunch", plural: "bunches" } as const;
