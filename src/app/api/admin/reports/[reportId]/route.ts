import { z } from "zod";
import { handle, parseJson } from "@/server/http/route";
import { requireStaff } from "@/server/modules/admin/guard";
import { decideReport } from "@/server/modules/admin/reports";

const schema = z.object({
  decision: z.enum(["ACTIONED", "DISMISSED", "REVIEWING"]),
  note: z.string().trim().max(1000).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  return handle(async () => {
    const staff = await requireStaff();
    const { reportId } = await context.params;
    const { decision, note } = await parseJson(request, schema);
    await decideReport(staff, reportId, decision, note);
    return { ok: true };
  });
}
