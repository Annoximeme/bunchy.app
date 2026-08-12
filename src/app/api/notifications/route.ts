import { handleAuthed } from "@/server/http/route";
import {
  listNotifications,
  markAllRead,
  unreadCount,
} from "@/server/modules/notifications/service";

export async function GET() {
  return handleAuthed(async (viewer) => {
    const [notifications, unread] = await Promise.all([
      listNotifications(viewer.profileId),
      unreadCount(viewer.profileId),
    ]);
    return { notifications, unread };
  });
}

export async function PATCH() {
  return handleAuthed(async (viewer) => {
    await markAllRead(viewer.profileId);
    return { ok: true };
  });
}
