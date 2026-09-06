import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { db } from "@/server/db/client";
import {
  meetupsForActivity,
  proposeMeetup,
  respondToMeetup,
  suggestBunchesToMeet,
  withdrawMeetup,
} from "@/server/modules/bunches/meetups";

/**
 * Asking another bunch along to an evening, and answering.
 *
 * The candidate list is behind the GET rather than rendered with the page,
 * because working it out means scoring every pair across two groups and only a
 * moderator who has pressed the button is asking the question.
 */

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("invite"),
    guestBunchId: z.string().min(1).max(40),
    note: z.string().trim().max(300).nullable().optional(),
  }),
  z.object({
    action: z.literal("respond"),
    meetupId: z.string().min(1).max(40),
    accept: z.boolean(),
  }),
  z.object({ action: z.literal("withdraw"), meetupId: z.string().min(1).max(40) }),
]);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const meetups = await meetupsForActivity(id, viewer.profileId);

    // Only worked out when asked for, and only for the bunch whose evening it
    // is. `suggestBunchesToMeet` re-checks that this viewer moderates it.
    const wantsCandidates =
      new URL(request.url).searchParams.get("candidates") === "1";
    if (!wantsCandidates) return { meetups, candidates: [] };

    const activity = await db.activity.findUnique({
      where: { id },
      select: { bunchId: true },
    });
    if (!activity?.bunchId) return { meetups, candidates: [] };

    return {
      meetups,
      candidates: await suggestBunchesToMeet(activity.bunchId, viewer.profileId, id),
    };
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
      case "invite":
        return proposeMeetup(id, input.guestBunchId, viewer.profileId, input.note);
      case "respond":
        await respondToMeetup(input.meetupId, viewer.profileId, input.accept);
        return { ok: true };
      case "withdraw":
        await withdrawMeetup(input.meetupId, viewer.profileId);
        return { ok: true };
    }
  });
}
