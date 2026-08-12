import { z } from "zod";
import { handleAuthed, parseJson, parseQuery } from "@/server/http/route";
import { bunchMessageSchema } from "@/server/modules/bunches/schemas";
import {
  listMessages,
  markBunchRead,
  postMessage,
} from "@/server/modules/messaging/bunch-chat";

const querySchema = z.object({
  before: z.string().trim().optional(),
  after: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const query = parseQuery(request, querySchema);
    const messages = await listMessages(id, viewer.profileId, query);

    // Reaching the live end of the conversation is what "read" means.
    if (!query.before) await markBunchRead(id, viewer.profileId);

    return { messages };
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const input = await parseJson(request, bunchMessageSchema);
    const message = await postMessage(id, viewer.profileId, input);
    return { ok: true, message };
  });
}
