import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { db } from "@/server/db/client";
import {
  askIcebreaker,
  bunchChallenges,
  cancelPlan,
  createPlan,
  decidePlan,
  endChallenge,
  listPlans,
  notifyPlanMembers,
  planToActivity,
  setChallengesEnabled,
  startChallenge,
  vote,
} from "@/server/modules/bunches/plans";

/**
 * Everything a bunch does to itself: plans, icebreakers, challenges.
 *
 * One route because they are one screen and one permission model, the service
 * re-checks membership on every call, so this layer only has to name the verb.
 * Every verb below is somebody pressing a button; nothing here can be reached
 * on a schedule.
 */

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_plan"),
    title: z.string().trim().min(3).max(100),
    note: z.string().trim().max(500).nullable().optional(),
    options: z
      .array(
        z.object({
          startsAt: z.iso.datetime(),
          label: z.string().trim().max(60).nullable().optional(),
        }),
      )
      .min(2)
      .max(6),
  }),
  z.object({
    action: z.literal("vote"),
    optionId: z.string().min(1),
    response: z.enum(["YES", "MAYBE", "NO"]),
  }),
  z.object({ action: z.literal("decide"), planId: z.string().min(1), optionId: z.string().min(1) }),
  z.object({ action: z.literal("cancel_plan"), planId: z.string().min(1) }),
  z.object({
    action: z.literal("plan_to_activity"),
    planId: z.string().min(1),
    description: z.string().trim().max(1500),
    mode: z.enum(["ONLINE", "OFFLINE"]),
    location: z.string().trim().max(160).nullable().optional(),
  }),
  z.object({ action: z.literal("icebreaker") }),
  z.object({ action: z.literal("start_challenge"), challengeKey: z.string().min(1).max(60) }),
  z.object({
    action: z.literal("end_challenge"),
    challengeId: z.string().min(1),
    outcome: z.enum(["DONE", "DROPPED"]),
  }),
  z.object({ action: z.literal("set_challenges_enabled"), enabled: z.boolean() }),
]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const [plans, challenges] = await Promise.all([
      listPlans(id, viewer.profileId),
      bunchChallenges(id, viewer.profileId),
    ]);
    return { plans, challenges };
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
      case "create_plan": {
        const plan = await createPlan(id, viewer.profileId, {
          title: input.title,
          note: input.note,
          options: input.options.map((o) => ({
            startsAt: new Date(o.startsAt),
            label: o.label,
          })),
        });
        const bunch = await db.bunch.findUniqueOrThrow({
          where: { id },
          select: { slug: true },
        });
        await notifyPlanMembers(id, viewer.profileId, input.title, bunch.slug);
        return plan;
      }
      case "vote":
        await vote(input.optionId, viewer.profileId, input.response);
        return { ok: true };
      case "decide":
        await decidePlan(input.planId, viewer.profileId, input.optionId);
        return { ok: true };
      case "cancel_plan":
        await cancelPlan(input.planId, viewer.profileId);
        return { ok: true };
      case "plan_to_activity":
        return planToActivity(input.planId, viewer.profileId, {
          description: input.description,
          mode: input.mode,
          location: input.location,
        });
      case "icebreaker":
        return askIcebreaker(id, viewer.profileId);
      case "start_challenge":
        return startChallenge(id, viewer.profileId, input.challengeKey);
      case "end_challenge":
        await endChallenge(input.challengeId, viewer.profileId, input.outcome);
        return { ok: true };
      case "set_challenges_enabled":
        await setChallengesEnabled(id, viewer.profileId, input.enabled);
        return { ok: true };
    }
  });
}
