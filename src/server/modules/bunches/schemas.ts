import { z } from "zod";
import { isLanguageCode } from "@/lib/languages";

export const bunchCreateSchema = z.object({
  name: z.string().trim().min(3, "Give the bunch a name.").max(60),
  description: z
    .string()
    .trim()
    .min(20, "A sentence or two helps people decide if they belong here.")
    .max(600),
  type: z.enum(["INTEREST", "LOCAL", "ACTIVITY"]).default("INTEREST"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  interestSlugs: z
    .array(z.string().trim().min(1).max(48))
    .min(1, "Pick at least one interest so the right people can find it.")
    .max(8),
  cityLabel: z.string().trim().max(80).optional(),
  countryCode: z.string().trim().length(2).toUpperCase().optional(),
  // Bunches are small on purpose. The cap is a product constraint, not a limit
  // we expect anyone to want raised.
  maxMembers: z.number().int().min(3).max(12).default(10),
  rules: z.string().trim().max(1000).optional(),
  /**
   * What the bunch actually runs in.
   *
   * Capped at three, and no fluency: a group either holds its evenings in a
   * language or it does not, and a bunch claiming six is telling nobody
   * anything. Empty is a real answer, meaning "we have not said", and is the
   * default so that nothing about existing bunches changes.
   */
  languages: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .refine(isLanguageCode, "That is not a language we know."),
    )
    .max(3, "Three at most. A bunch that runs in six runs in none of them.")
    // Optional rather than defaulted, so "the form did not ask" and "the bunch
    // says none" stay distinguishable all the way to `updateBunch`.
    .optional(),
  imageUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
});

export const bunchUpdateSchema = bunchCreateSchema
  .partial()
  .omit({ visibility: true });

export const bunchMessageSchema = z.object({
  body: z.string().trim().min(1, "Say something.").max(2000),
  parentId: z.string().trim().min(1).max(40).optional(),
  mentionProfileIds: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
});

export const reactionSchema = z.object({
  // A short allowlist keeps reactions a warm signal rather than a scoreboard.
  emoji: z.enum(["👍", "❤️", "😂", "🎉", "👀", "🙌"]),
});

export type BunchCreateInput = z.infer<typeof bunchCreateSchema>;
export type BunchUpdateInput = z.infer<typeof bunchUpdateSchema>;
export type BunchMessageInput = z.infer<typeof bunchMessageSchema>;
