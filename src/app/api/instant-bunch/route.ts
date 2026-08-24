import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import {
  createInstantBunch,
  previewInstantBunch,
} from "@/server/modules/bunches/instant";
import { consume } from "@/server/ratelimit";

/**
 * Start a Bunch.
 *
 * Two verbs on one route because they are two halves of one action, and
 * splitting them across files would make it easy to miss that only one of them
 * writes anything. `preview` reads; `create` invites real people and is the
 * only one that needs the member to have pressed a button naming them.
 */

const previewSchema = z.object({
  action: z.literal("preview"),
  query: z.string().trim().min(2, "Say what you'd like to do.").max(280),
  availableNow: z.boolean().optional(),
  withinKm: z.number().int().min(1).max(20_000).nullable().optional(),
});

const createSchema = z.object({
  action: z.literal("create"),
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(1000),
  profileIds: z.array(z.string()).max(20),
  interestSlugs: z.array(z.string()).max(8).default([]),
  // Accepted from the client because the member can change the time the parser
  // proposed, but it is still validated as a real future instant below.
  startsAt: z.iso.datetime().nullable().optional(),
  mode: z.enum(["ONLINE", "OFFLINE"]).nullable().optional(),
  cityLabel: z.string().trim().max(120).nullable().optional(),
  countryCode: z.string().trim().length(2).nullable().optional(),
  maxMembers: z.number().int().min(2).max(50).optional(),
});

const schema = z.discriminatedUnion("action", [previewSchema, createSchema]);

export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, schema);

    if (input.action === "preview") {
      await consume("assistant", viewer.profileId);
      return previewInstantBunch(viewer.profileId, input.query, {
        availableNow: input.availableNow,
        withinKm: input.withinKm,
      });
    }

    const startsAt = input.startsAt ? new Date(input.startsAt) : null;
    return createInstantBunch(viewer.profileId, {
      ...input,
      startsAt,
    });
  });
}
