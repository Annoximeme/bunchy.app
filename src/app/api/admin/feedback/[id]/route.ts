import { z } from "zod";
import { handle, parseJson } from "@/server/http/route";
import { requireStaff } from "@/server/modules/admin/guard";
import { answerFeedback } from "@/server/modules/feedback/service";

const schema = z.object({
  status: z.enum(["NEW", "READ", "PLANNED", "SHIPPED", "DECLINED"]),
  reply: z.string().trim().max(4000).nullable().optional(),
  announcementId: z.string().trim().max(40).nullable().optional(),
});

/**
 * Answer one piece of feedback.
 *
 * Staff rather than admin. Reading what members say about the product and
 * telling them what happened is not an account action, and restricting it to
 * one person is how a queue stops being worked.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const actor = await requireStaff();
    const { id } = await params;
    const input = await parseJson(request, schema);
    await answerFeedback(actor, id, input);
    return { ok: true };
  });
}
