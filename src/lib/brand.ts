/**
 * Product identity in one place.
 *
 * Every user-facing occurrence of the name, tagline and positioning line reads
 * from here, so a brand change is a change to this file rather than a grep
 * across the codebase. `altTaglines` are the approved alternates from the brand
 * spec — kept here so nobody invents a new one in a component.
 */
export const brand = {
  name: "Bunchy",
  domain: "bunchy.app",
  /** The primary line. Spec §40: this is the one that stays. */
  tagline: "Find your bunch.",
  positioning: "You don't need more followers. You need a bunch.",
  subtitle:
    "Bunchy uses AI to connect you with people who actually share your interests, goals and way of life.",
  altTaglines: [
    "Find your people.",
    "Meet people who get you.",
    "Stop scrolling. Start connecting.",
    "Your people are out there.",
  ],
} as const;

/** The social unit, in prose. Used where copy needs the noun rather than a label. */
export const BUNCH_NOUN = { singular: "bunch", plural: "bunches" } as const;
