import { z } from "zod";
import { handle, parseJson } from "@/server/http/route";
import { requireAdmin } from "@/server/modules/admin/guard";
import { decideApplication } from "@/server/modules/admin/moderator-applications";

const schema = z.object({
  status: z.enum(["NEW", "REVIEWING", "ACCEPTED", "DECLINED", "WITHDRAWN"]),
  note: z.string().trim().max(1000).optional(),
});

/** Admin-only: staffing decisions are not a moderator's to make. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await context.params;
    const input = await parseJson(request, schema);
    await decideApplication(id, input.status, input.note);
    return { ok: true };
  });
}
