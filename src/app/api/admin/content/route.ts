import { z } from "zod";
import { handle, parseJson } from "@/server/http/route";
import { requireStaff } from "@/server/modules/admin/guard";
import {
  archiveBunch,
  cancelActivityAsStaff,
  removeBunchMessageAsStaff,
  restoreBunch,
} from "@/server/modules/admin/content";

/**
 * Content actions: bunches, activities and individual messages.
 *
 * One endpoint because they are one job — a moderator working a report acts on
 * whatever the report points at, and splitting these across three routes would
 * only mean three places to forget the guard.
 */

const reason = z
  .string()
  .trim()
  .min(3, "Record why — this goes in the audit log.")
  .max(1000);

const id = z.string().trim().min(1).max(40);

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("archive_bunch"), bunchId: id, reason }),
  z.object({ action: z.literal("restore_bunch"), bunchId: id, reason }),
  z.object({ action: z.literal("cancel_activity"), activityId: id, reason }),
  z.object({ action: z.literal("remove_message"), messageId: id, reason }),
]);

export async function POST(request: Request) {
  return handle(async () => {
    const staff = await requireStaff();
    const input = await parseJson(request, schema);

    switch (input.action) {
      case "archive_bunch":
        await archiveBunch(staff, input.bunchId, input.reason);
        break;
      case "restore_bunch":
        await restoreBunch(staff, input.bunchId, input.reason);
        break;
      case "cancel_activity":
        await cancelActivityAsStaff(staff, input.activityId, input.reason);
        break;
      case "remove_message":
        await removeBunchMessageAsStaff(staff, input.messageId, input.reason);
        break;
    }

    return { ok: true };
  });
}
