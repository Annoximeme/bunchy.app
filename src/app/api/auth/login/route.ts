import { z } from "zod";
import { handle, parseJson } from "@/server/http/route";
import { signIn } from "@/server/auth/service";
import {
  requestFingerprint,
  sessionContextFromRequest,
  writeSessionCookie,
} from "@/server/auth/cookies";
import { consume } from "@/server/ratelimit";
import { onboardingPath } from "@/server/modules/profile/service";

const schema = z.object({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  return handle(async () => {
    const input = await parseJson(request, schema);

    // Keyed on the client, not the account: rate limiting per email would let
    // anyone lock a specific person out of their own login.
    await consume("login", await requestFingerprint());

    const result = await signIn(input, await sessionContextFromRequest());
    await writeSessionCookie(result.session.token, result.session.expiresAt);

    return { ok: true, next: onboardingPath(result.onboardingStage) };
  });
}
