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
    /**
     * Which door, which floor, what the organiser will be wearing.
     *
     * Kept apart from `locationLabel` because the two have different
     * audiences: the venue is shown to anybody who can see the activity, and
     * this is shown only to people who have joined. It is the difference
     * between announcing an event and telling the world exactly where a group
     * of people will be standing.
     */
    meetingPoint: z.string().trim().max(200).optional(),
    maxParticipants: z.number().int().min(2).max(50).default(8),
    bunchId: z.string().trim().min(1).max(40).optional(),
    /**
     * Turn this into a standing arrangement rather than one evening.
     *
     * On the create schema rather than a separate endpoint, because to the
     * person filling the form it is one more answer about the same plan, not a
     * different act. "Every Thursday" is a property of the Thursday they were
     * already describing. The route branches on it; nothing else in the form
     * changes shape.
     */
    cadence: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
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
  meetingPoint: z.string().trim().max(200).optional(),
  maxParticipants: z.number().int().min(2).max(50).optional(),
});

/**
 * How many people somebody may bring.
 *
 * Three, which is a friend, a partner and one more. Higher than that and a
 * plus-one has become a way to fill somebody else's evening with your own
 * group, which is the failure mode a product about meeting new people can
 * least afford.
 */
export const MAX_GUESTS = 3;

export const participationSchema = z.object({
  guests: z.number().int().min(0).max(MAX_GUESTS).default(0),
});

export type ActivityCreateInput = z.infer<typeof activityCreateSchema>;
export type ActivityUpdateInput = z.infer<typeof activityUpdateSchema>;
