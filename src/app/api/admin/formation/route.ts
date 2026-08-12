import { z } from "zod";
import { requireStaff } from "@/server/modules/admin/guard";
import { errorResponse } from "@/server/http/route";
import { createProposedBunch } from "@/server/modules/bunches/create-proposed";

const schema = z.object({
  name: z.string().trim().min(3).max(60),
  description: z.string().trim().min(10).max(400),
  profileIds: z.array(z.string()).min(2).max(20),
  interestSlugs: z.array(z.string()).max(10),
});

export async function POST(request: Request) {
  try {
    const actor = await requireStaff();
    const input = schema.parse(await request.json());
    return Response.json(await createProposedBunch(actor, input));
  } catch (error) {
    return errorResponse(error);
  }
}
