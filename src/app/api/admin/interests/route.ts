import { z } from "zod";
import { handle, parseJson } from "@/server/http/route";
import { requireStaff } from "@/server/modules/admin/guard";
import {
  mergeInterests,
  setInterestStatus,
  updateInterest,
} from "@/server/modules/admin/interests";

const reason = z.string().trim().min(3).max(1000);
const id = z.string().trim().min(1).max(40);

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), interestId: id, reason }),
  z.object({ action: z.literal("reject"), interestId: id, reason }),
  z.object({
    action: z.literal("update"),
    interestId: id,
    label: z.string().trim().min(2).max(48).optional(),
    category: z.string().trim().min(2).max(48).optional(),
    description: z.string().trim().max(300).nullable().optional(),
    aliases: z.array(z.string().trim().min(2).max(48)).max(12).optional(),
  }),
  z.object({
    action: z.literal("merge"),
    sourceId: id,
    targetId: id,
    reason,
  }),
]);

export async function POST(request: Request) {
  return handle(async () => {
    const staff = await requireStaff();
    const input = await parseJson(request, schema);

    switch (input.action) {
      case "approve":
        await setInterestStatus(staff, input.interestId, "APPROVED", input.reason);
        return { ok: true };
      case "reject":
        await setInterestStatus(staff, input.interestId, "REJECTED", input.reason);
        return { ok: true };
      case "update":
        await updateInterest(staff, input.interestId, {
          label: input.label,
          category: input.category,
          description: input.description,
          aliases: input.aliases,
        });
        return { ok: true };
      case "merge": {
        const result = await mergeInterests(
          staff,
          input.sourceId,
          input.targetId,
          input.reason,
        );
        return { ok: true, ...result };
      }
    }
  });
}
