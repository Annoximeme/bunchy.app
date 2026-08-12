import { z } from "zod";
import { handle, parseJson } from "@/server/http/route";
import { requestPasswordReset, resetPassword } from "@/server/auth/service";
import { requestFingerprint } from "@/server/auth/cookies";
import { consume } from "@/server/ratelimit";

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
});

const resetSchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(10, "Use at least 10 characters.").max(200),
});

/** Ask for a reset link. */
export async function POST(request: Request) {
  return handle(async () => {
    const input = await parseJson(request, requestSchema);
    await consume("passwordReset", await requestFingerprint());
    await requestPasswordReset(input.email);

    // Always the same answer, whether or not that address has an account.
    return {
      ok: true,
      message: "If that address has an account, a reset link is on its way.",
    };
  });
}

/** Complete a reset with the emailed token. */
export async function PUT(request: Request) {
  return handle(async () => {
    const input = await parseJson(request, resetSchema);
    await resetPassword(input.token, input.password);
    return { ok: true };
  });
}
