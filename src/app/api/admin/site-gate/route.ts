import { z } from "zod";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { errorResponse, parseJson } from "@/server/http/route";
import { requireAdmin } from "@/server/modules/admin/guard";
import { readGate, setGate } from "@/server/modules/admin/site-gate";
import { secureCookies } from "@/server/auth/cookies";

const schema = z.object({
  mode: z.enum(["OFF", "SOON", "MAINTENANCE"]),
});

/**
 * Turning the public site off and on.
 *
 * Admin-only rather than staff-wide. Every other control in the dashboard acts
 * on one account, one bunch or one message; this one acts on everybody at once,
 * and a moderator hired to work the report queue has no reason to hold it.
 *
 * Not wrapped in `handle` because the response has to carry a Set-Cookie: the
 * moment the gate goes up, Caddy starts refusing every request that does not
 * present the preview cookie, including the one that would load this page
 * again. Issuing it here is what stops an admin locking themselves out with
 * their own switch. `setGate` refuses outright when there is no token to issue.
 */
export async function PATCH(request: Request) {
  try {
    const actor = await requireAdmin();
    const { mode } = await parseJson(request, schema);
    const change = await setGate(actor, mode);

    if (change.token) {
      const store = await cookies();
      store.set("bunchy_preview", change.token, {
        httpOnly: true,
        secure: secureCookies(),
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    }

    return NextResponse.json({ ok: true, mode: change.mode });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Current state, for anything that wants to poll rather than re-render. */
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ mode: readGate() });
  } catch (error) {
    return errorResponse(error);
  }
}
