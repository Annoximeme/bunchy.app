import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import {
  listConnections,
  listPendingRequests,
  sendRequest,
} from "@/server/modules/connections/service";

const createSchema = z.object({
  profileId: z.string().trim().min(1).max(40),
  note: z.string().trim().max(300).optional(),
});

export async function GET() {
  return handleAuthed(async (viewer) => {
    const [connections, pending] = await Promise.all([
      listConnections(viewer.profileId),
      listPendingRequests(viewer.profileId),
    ]);
    return { connections, pending };
  });
}

export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, createSchema);
    const connection = await sendRequest(
      viewer.profileId,
      input.profileId,
      input.note,
    );
    return { ok: true, connection };
  });
}
