import { handle } from "@/server/http/route";
import { clearSessionCookie, readSessionToken } from "@/server/auth/cookies";
import { revokeSession } from "@/server/auth/session";

export async function POST() {
  return handle(async () => {
    await revokeSession(await readSessionToken());
    await clearSessionCookie();
    return { ok: true };
  });
}
