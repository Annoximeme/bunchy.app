import { z } from "zod";
import { handle, parseJson } from "@/server/http/route";
import { signUp } from "@/server/auth/service";
import {
  requestFingerprint,
  sessionContextFromRequest,
  writeSessionCookie,
} from "@/server/auth/cookies";
import { consume } from "@/server/ratelimit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("That doesn't look like an email."),
  password: z
    .string()
    .min(10, "Use at least 10 characters — length beats symbols.")
    .max(200),
});

export async function POST(request: Request) {
  return handle(async () => {
    const input = await parseJson(request, schema);

    // Rate limited by client fingerprint: there is no account to key off yet.
    await consume("signup", await requestFingerprint());

    const result = await signUp(input, await sessionContextFromRequest());
    await writeSessionCookie(result.session.token, result.session.expiresAt);

    return { ok: true, next: "/onboarding/basics" };
  });
}
