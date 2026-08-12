import { z } from "zod";
import { handle, parseJson } from "@/server/http/route";
import { requireAdmin, requireStaff } from "@/server/modules/admin/guard";
import {
  banUser,
  setUserRole,
  suspendUser,
  unbanUser,
  unsuspendUser,
} from "@/server/modules/admin/users";

/**
 * Account actions.
 *
 * Every branch resolves its own guard rather than one shared check at the top:
 * suspending is a moderator action, changing a role is admin-only, and mixing
 * them behind a single `requireStaff()` would silently hand moderators the
 * ability to promote themselves.
 */

const reason = z
  .string()
  .trim()
  .min(3, "Record why — this goes in the audit log.")
  .max(1000);

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("suspend"),
    reason,
    days: z.number().int().min(1).max(365).nullable(),
  }),
  z.object({ action: z.literal("unsuspend"), reason }),
  z.object({ action: z.literal("ban"), reason }),
  z.object({ action: z.literal("unban"), reason }),
  z.object({
    action: z.literal("set_role"),
    reason,
    role: z.enum(["MEMBER", "MODERATOR", "ADMIN"]),
  }),
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  return handle(async () => {
    const { userId } = await context.params;
    const input = await parseJson(request, schema);

    switch (input.action) {
      case "suspend":
        await suspendUser(await requireStaff(), {
          userId,
          reason: input.reason,
          days: input.days,
        });
        break;
      case "unsuspend":
        await unsuspendUser(await requireStaff(), userId, input.reason);
        break;
      case "ban":
        await banUser(await requireAdmin(), userId, input.reason);
        break;
      case "unban":
        await unbanUser(await requireAdmin(), userId, input.reason);
        break;
      case "set_role":
        await setUserRole(
          await requireAdmin(),
          userId,
          input.role,
          input.reason,
        );
        break;
    }

    return { ok: true };
  });
}
