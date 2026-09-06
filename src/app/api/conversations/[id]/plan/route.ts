import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import {
  createPairPlan,
  pairPlan,
  suggestTimes,
} from "@/server/modules/messaging/plans";
import {
  cancelPlan,
  decidePlan,
  planToActivity,
  vote,
} from "@/server/modules/bunches/plans";

/**
 * A plan between two people.
 *
 * The verbs a plan already had, pointed at a conversation instead of a bunch.
 * Voting, settling, calling it off and turning it into a real activity are the
 * same functions the bunch route calls; only creating and reading are specific
 * to a pair, because only those two need to know that "everybody" is two
 * people and that the times can be proposed rather than typed.
 *
 * Every check lives in the service, which re-asks "is this your conversation"
 * on each call. A private thread between two people is the last place to trust
 * a page to have checked.
 */

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    title: z.string().trim().min(3).max(100),
    note: z.string().trim().max(500).nullable().optional(),
    options: z
      .array(
        z.object({
          startsAt: z.iso.datetime(),
          label: z.string().trim().max(60).nullable().optional(),
        }),
      )
      .min(1)
      .max(4),
  }),
  z.object({
    action: z.literal("vote"),
    optionId: z.string().min(1),
    response: z.enum(["YES", "MAYBE", "NO"]),
  }),
  z.object({
    action: z.literal("decide"),
    planId: z.string().min(1),
    optionId: z.string().min(1),
  }),
  z.object({ action: z.literal("cancel"), planId: z.string().min(1) }),
  z.object({
    action: z.literal("to_activity"),
    planId: z.string().min(1),
    description: z.string().trim().max(1500),
    mode: z.enum(["ONLINE", "OFFLINE"]),
    location: z.string().trim().max(160).nullable().optional(),
  }),
]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const [plan, suggestions] = await Promise.all([
      pairPlan(id, viewer.profileId),
      suggestTimes(id, viewer.profileId),
    ]);
    return { plan, suggestions };
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const input = await parseJson(request, schema);

    switch (input.action) {
      case "create":
        return createPairPlan(id, viewer.profileId, {
          title: input.title,
          note: input.note,
          options: input.options.map((option) => ({
            startsAt: new Date(option.startsAt),
            label: option.label,
          })),
        });
      case "vote":
        await vote(input.optionId, viewer.profileId, input.response);
        return { ok: true };
      case "decide":
        await decidePlan(input.planId, viewer.profileId, input.optionId);
        return { ok: true };
      case "cancel":
        await cancelPlan(input.planId, viewer.profileId);
        return { ok: true };
      case "to_activity":
        return planToActivity(input.planId, viewer.profileId, {
          description: input.description,
          mode: input.mode,
          location: input.location,
        });
    }
  });
}
