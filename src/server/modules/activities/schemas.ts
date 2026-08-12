import { z } from "zod";

export const activityCreateSchema = z
  .object({
    title: z.string().trim().min(3, "Give it a name.").max(100),
    description: z.string().trim().min(10, "A line or two about the plan.").max(1500),
    startsAt: z.coerce.date().refine((d) => d.getTime() > Date.now() - 60_000, {
      message: "Pick a time in the future.",
    }),
    endsAt: z.coerce.date().optional(),
    mode: z.enum(["ONLINE", "OFFLINE"]),
    /** A venue or neighbourhood, never a home address. */
    locationLabel: z.string().trim().max(160).optional(),
    cityLabel: z.string().trim().max(80).optional(),
    countryCode: z.string().trim().length(2).toUpperCase().optional(),
    onlineUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
    maxParticipants: z.number().int().min(2).max(50).default(8),
    bunchId: z.string().trim().min(1).max(40).optional(),
  })
  .refine((v) => v.mode === "ONLINE" || Boolean(v.locationLabel), {
    message: "Where is it happening?",
    path: ["locationLabel"],
  })
  .refine((v) => !v.endsAt || v.endsAt.getTime() > v.startsAt.getTime(), {
    message: "It can't end before it starts.",
    path: ["endsAt"],
  });

export const activityUpdateSchema = z.object({
  title: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().min(10).max(1500).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  locationLabel: z.string().trim().max(160).optional(),
  onlineUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  maxParticipants: z.number().int().min(2).max(50).optional(),
});

export type ActivityCreateInput = z.infer<typeof activityCreateSchema>;
export type ActivityUpdateInput = z.infer<typeof activityUpdateSchema>;
