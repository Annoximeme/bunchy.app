import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import {
  recordMatchFeedback,
  undoMatchFeedback,
} from "@/server/modules/matching/engine";

const schema = z.object({
  profileId: z.string().trim().min(1).max(40),
  signal: z.enum(["GOOD_MATCH", "NOT_INTERESTED"]),
});

/**
 * "Not for me", the control that makes Discover trustworthy.
 *
 * Members will only tell us what they don't want if doing so is instant and
 * permanent, so this writes through immediately and the engine treats it as a
 * hard exclusion rather than a ranking penalty.
 */
export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, schema);
    await recordMatchFeedback(viewer.profileId, input.profileId, input.signal);
    return { ok: true };
  });
}

const undoSchema = z.object({
  profileId: z.string().trim().min(1).max(40),
});

/**
 * Taking one back.
 *
 * A DELETE rather than a third value in the signal enum above: "undo" is not
 * something a member felt about somebody, and modelling it as a signal would
 * put a non-signal into the column the matching engine reads.
 */
export async function DELETE(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, undoSchema);
    await undoMatchFeedback(viewer.profileId, input.profileId);
    return { ok: true };
  });
}
