import { z } from "zod";
import { handle, handleAuthed, parseJson } from "@/server/http/route";
import { sendVerificationEmail, verifyEmail } from "@/server/auth/service";
import { requestFingerprint } from "@/server/auth/cookies";
import { consume } from "@/server/ratelimit";

const schema = z.object({ token: z.string().trim().min(1) });

export async function POST(request: Request) {
  return handle(async () => {
    const { token } = await parseJson(request, schema);
    await consume("tokenSubmission", await requestFingerprint());
    await verifyEmail(token);
    return { ok: true };
  });
}

/** Resend the confirmation email to the signed-in member. */
export async function PUT() {
  return handleAuthed(async (viewer) => {
    if (viewer.emailVerified) return { ok: true, alreadyVerified: true };
    // Keyed on the account rather than the address: the address is the thing
    // being mailed, and changing it is not a way to get a fresh allowance.
    await consume("emailVerification", viewer.userId);
    await sendVerificationEmail(viewer.userId, viewer.email);
    return { ok: true };
  });
}
