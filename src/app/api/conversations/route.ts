import { handleAuthed } from "@/server/http/route";
import { listConversations } from "@/server/modules/messaging/direct";

export async function GET() {
  return handleAuthed(async (viewer) => ({
    conversations: await listConversations(viewer.profileId),
  }));
}
