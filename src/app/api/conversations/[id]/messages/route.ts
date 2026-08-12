import { z } from "zod";
import { handleAuthed, parseJson, parseQuery } from "@/server/http/route";
import {
  getConversation,
  sendDirectMessage,
} from "@/server/modules/messaging/direct";

const querySchema = z.object({
  before: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const postSchema = z.object({
  body: z.string().trim().min(1, "Say something.").max(4000),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const query = parseQuery(request, querySchema);
    return { conversation: await getConversation(id, viewer.profileId, query) };
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const { body } = await parseJson(request, postSchema);
    const message = await sendDirectMessage(id, viewer.profileId, body);
    return { ok: true, message };
  });
}
