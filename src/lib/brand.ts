/**
 * Product identity in one place.
 *
 * The founding brief alternated between two working names; the product ships
 * as "Bunchy". Renaming is a one-line change here rather than a grep across
 * the codebase.
 */
export const brand = {
  name: "Bunchy",
  domain: "bunchy.app",
  tagline: "Find your people.",
  subtitle:
    "Bunchy uses AI to connect you with people who actually share your interests, goals and way of life.",
} as const;
