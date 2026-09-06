import { z } from "zod";
import { isLanguageCode, MAX_LANGUAGES_PER_PROFILE } from "@/lib/languages";

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

/**
 * The languages somebody is happy to socialise in.
 *
 * Optional everywhere it appears, and absent is not the same as empty: an
 * absent field means the form did not carry the question, so the stored answer
 * is left alone, and an empty array means the member cleared it. The avatar
 * field above learned that distinction the hard way.
 *
 * The code is checked against the catalogue rather than by a regular
 * expression. A two-letter string is not a language, and the one place that
 * knows which two-letter strings are is `src/lib/languages.ts`.
 */
export const languageSelectionSchema = z
  .array(
    z.object({
      code: z
        .string()
        .trim()
        .toLowerCase()
        .refine(isLanguageCode, "That is not a language we know."),
      fluency: z
        .enum(["LEARNING", "CONVERSATIONAL", "FLUENT"])
        .default("CONVERSATIONAL"),
    }),
  )
  .max(
    MAX_LANGUAGES_PER_PROFILE,
    "Six is plenty. Pick the ones you would actually meet someone in.",
  );

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
  /**
   * 1–12. Optional, because members who joined before it was asked for have no
   * answer stored and must not be blocked from editing anything else.
   */
  birthMonth: z.number().int().min(1).max(12).optional(),
  /**
   * Where they are, if it is relevant to them.
   *
   * Optional, and that is a deliberate reversal. It used to be required on the
   * first onboarding step, which asked somebody who came for a weekly online
   * co-op night to name their town before being shown anything, on a product
   * they would never meet anyone locally through.
   *
   * Nothing downstream needs it. `locationSignal` returns null rather than zero
   * when either side has no coordinates, so the scorer already handles an
   * absent location by leaving the signal out instead of scoring it badly. And
   * the thing online genuinely needs, the timezone, is detected from the
   * browser below and never asked for at all.
   */
  cityLabel: z.string().trim().min(1).max(80).optional(),
  countryCode: z.string().trim().length(2).toUpperCase().optional(),
  avatarUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  /**
   * The browser's IANA zone, read from `Intl` and sent without being shown.
   *
   * Not a question, asking is what the original design ruled out, and rightly:
   * most people cannot name their zone and a dropdown of 400 of them is a wall
   * to climb before signing up. Detecting it costs the member nothing and fixes
   * the countries where deriving from a country code is impossible, which are
   * exactly the large ones: the US, Australia and Russia derived to null and
   * fell back to UTC, so "weekday evening" meant 18:00 UTC for someone in
   * California.
   *
   * Validated server-side against the runtime's own zone list, because it
   * arrives from a client and "Europe/Brussels" and "'; drop table" are the
   * same shape of string.
   */
  timezone: z.string().trim().max(64).optional(),
  /**
   * Which languages they would meet somebody in.
   *
   * Asked on the first step, next to where they are, because the two answer
   * the same question about whether an evening is possible. Optional, so a
   * member who joined before it was asked can still edit their name.
   */
  languages: languageSelectionSchema.optional(),
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
    .max(40, "That's a lot of interests, pick your favourites."),
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
        "TRAVEL_COMPANIONS",
        "ACTIVITY_PARTNERS",
      ]),
    )
    .min(1, "Pick at least one so we know who to introduce you to.")
    .max(13),
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
  whoCanMessage: z.enum(["EVERYONE", "CONNECTIONS", "BUNCH_MEMBERS", "NOBODY"]),
  whoCanSendRequests: z.enum([
    "EVERYONE",
    "CONNECTIONS",
    "BUNCH_MEMBERS",
    "NOBODY",
  ]),
  discoverable: z.boolean(),
  showApproxLocation: z.boolean(),
  invitableToBunches: z.boolean(),
  showExactAge: z.boolean(),
  aiIntroductions: z.boolean(),
  whoCanSeeAvailability: z.enum([
    "EVERYONE",
    "CONNECTIONS",
    "BUNCH_MEMBERS",
    "NOBODY",
  ]),
});

export type BasicsInput = z.infer<typeof basicsSchema>;
export type LanguageSelectionInput = z.infer<typeof languageSelectionSchema>;
export type InterestSelectionInput = z.infer<typeof interestSelectionSchema>;
export type PersonalityInput = z.infer<typeof personalitySchema>;
export type GoalsInput = z.infer<typeof goalsSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type PrivacyInput = z.infer<typeof privacySchema>;
