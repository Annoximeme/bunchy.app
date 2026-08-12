import { z } from "zod";

export const circleCreateSchema = z.object({
  name: z.string().trim().min(3, "Give the circle a name.").max(60),
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
  // Circles are small on purpose. The cap is a product constraint, not a limit
  // we expect anyone to want raised.
  maxMembers: z.number().int().min(3).max(12).default(10),
  rules: z.string().trim().max(1000).optional(),
  imageUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
});

export const circleUpdateSchema = circleCreateSchema
  .partial()
  .omit({ visibility: true });

export const circleMessageSchema = z.object({
  body: z.string().trim().min(1, "Say something.").max(2000),
  parentId: z.string().trim().min(1).max(40).optional(),
  mentionProfileIds: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
});

export const reactionSchema = z.object({
  // A short allowlist keeps reactions a warm signal rather than a scoreboard.
  emoji: z.enum(["👍", "❤️", "😂", "🎉", "👀", "🙌"]),
});

export type CircleCreateInput = z.infer<typeof circleCreateSchema>;
export type CircleUpdateInput = z.infer<typeof circleUpdateSchema>;
export type CircleMessageInput = z.infer<typeof circleMessageSchema>;
