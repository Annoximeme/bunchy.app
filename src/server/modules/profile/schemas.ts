import { z } from "zod";

/**
 * Input schemas, shared by the API routes and the onboarding UI.
 *
 * Validation lives with the domain rather than in the route so the same rules
 * apply no matter how the data arrives.
 */

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Usernames need at least 3 characters.")
  .max(24, "Usernames can be at most 24 characters.")
  .regex(
    /^[a-z0-9][a-z0-9_-]*[a-z0-9]$/,
    "Use letters, numbers, hyphens and underscores.",
  );

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Tell people what to call you.")
  .max(40, "That name is a little too long.");

const CURRENT_YEAR = new Date().getUTCFullYear();

export const basicsSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  bio: z.string().trim().max(400).optional(),
  birthYear: z
    .number()
    .int()
    .min(CURRENT_YEAR - 100, "That birth year looks off.")
    // Bunchy is 16+; the matching model and the safety model both assume adults
    // and older teens rather than children.
    .max(CURRENT_YEAR - 16, "You need to be at least 16 to join Bunchy."),
  cityLabel: z.string().trim().min(1).max(80),
  countryCode: z.string().trim().length(2).toUpperCase(),
  avatarUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
});

export const interestSelectionSchema = z.object({
  interests: z
    .array(
      z.object({
        slug: z.string().trim().min(1).max(48),
        strength: z.number().int().min(1).max(3).default(2),
        intent: z.enum(["PRACTICES", "CURIOUS"]).default("PRACTICES"),
      }),
    )
    .max(40, "That's a lot of interests — pick your favourites."),
  customInterests: z
    .array(
      z.object({
        label: z.string().trim().min(2).max(40),
        strength: z.number().int().min(1).max(3).default(2),
        intent: z.enum(["PRACTICES", "CURIOUS"]).default("PRACTICES"),
      }),
    )
    .max(10)
    .default([]),
});

const axis = z.number().int().min(0).max(100);

export const personalitySchema = z.object({
  introversionExtraversion: axis,
  spontaneityPlanning: axis,
  competitiveRelaxed: axis,
  deepCasual: axis,
  onlineOffline: axis,
  smallLargeGroups: axis,
  nightMorning: axis,
});

export const goalsSchema = z.object({
  goals: z
    .array(
      z.enum([
        "NEW_FRIENDS",
        "GAMING_FRIENDS",
        "HOBBY_PARTNERS",
        "GOING_OUT",
        "STUDY_PARTNERS",
        "FITNESS_PARTNERS",
        "CREATIVE_COLLABORATORS",
        "BUSINESS_PARTNERS",
        "MENTORS",
        "SIMILAR_INTERESTS",
        "LOCAL_COMMUNITIES",
      ]),
    )
    .min(1, "Pick at least one so we know who to introduce you to.")
    .max(11),
});

export const availabilitySchema = z.object({
  availability: z
    .array(
      z.enum([
        "WEEKDAY_MORNING",
        "WEEKDAY_AFTERNOON",
        "WEEKDAY_EVENING",
        "WEEKEND_MORNING",
        "WEEKEND_AFTERNOON",
        "WEEKEND_EVENING",
        "LATE_NIGHT",
      ]),
    )
    .min(1, "Pick at least one so we can suggest things you can actually make.")
    .max(7),
});

export const privacySchema = z.object({
  whoCanMessage: z.enum(["EVERYONE", "CONNECTIONS", "CIRCLE_MEMBERS", "NOBODY"]),
  whoCanSendRequests: z.enum([
    "EVERYONE",
    "CONNECTIONS",
    "CIRCLE_MEMBERS",
    "NOBODY",
  ]),
  discoverable: z.boolean(),
  showApproxLocation: z.boolean(),
  invitableToCircles: z.boolean(),
  showExactAge: z.boolean(),
});

export type BasicsInput = z.infer<typeof basicsSchema>;
export type InterestSelectionInput = z.infer<typeof interestSelectionSchema>;
export type PersonalityInput = z.infer<typeof personalitySchema>;
export type GoalsInput = z.infer<typeof goalsSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type PrivacyInput = z.infer<typeof privacySchema>;
