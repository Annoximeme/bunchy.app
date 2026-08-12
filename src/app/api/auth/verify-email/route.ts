import { z } from "zod";
import { handle, parseJson } from "@/server/http/route";
import { sendVerificationEmail, verifyEmail } from "@/server/auth/service";
import { requireViewer } from "@/server/auth/current-user";
import { handleAuthed } from "@/server/http/route";

const schema = z.object({ token: z.string().trim().min(1) });

export async function POST(request: Request) {
  return handle(async () => {
    const { token } = await parseJson(request, schema);
    await verifyEmail(token);
    return { ok: true };
  });
}

/** Resend the confirmation email to the signed-in member. */
export async function PUT() {
  return handleAuthed(async () => {
    const viewer = await requireViewer();
    if (viewer.emailVerified) return { ok: true, alreadyVerified: true };
    await sendVerificationEmail(viewer.userId, viewer.email);
    return { ok: true };
  });
}
