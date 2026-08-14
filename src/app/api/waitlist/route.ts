import { NextResponse } from "next/server";
import { z } from "zod";
import { requestFingerprint } from "@/server/auth/cookies";
import { consume } from "@/server/ratelimit";
import { joinWaitlist } from "@/server/modules/waitlist/service";

/**
 * Joining the waiting list, from the coming-soon page.
 *
 * The only route that answers before launch without a session, which is why it
 * is exempted by name in the Caddyfile rather than the gate being loosened.
 *
 * It takes a form post and replies with a redirect rather than JSON, so the
 * page needs no JavaScript to work: submit, land back on the page, see the
 * result. That also gives the browser a normal navigation to put in its
 * history, so a refresh does not resubmit.
 *
 * Failures come back as a query parameter rather than an error page. Somebody
 * mistyping their address should not be shown a stack of JSON, and the reasons
 * are a fixed set the page owns, so nothing typed here is ever echoed back.
 */
const schema = z.object({ email: z.string().max(320) });

function back(status: "joined" | "invalid" | "busy" | "error") {
  // 303 so the browser follows with GET. A 307 would repeat the POST.
  return NextResponse.redirect(
    new URL(`/?waitlist=${status}`, process.env.APP_URL ?? "http://localhost:3000"),
    303,
  );
}

export async function POST(request: Request) {
  try {
    await consume("waitlist", await requestFingerprint());
  } catch {
    return back("busy");
  }

  try {
    const form = await request.formData();
    const { email } = schema.parse({ email: form.get("email") ?? "" });
    await joinWaitlist(email);
    return back("joined");
  } catch (error) {
    if (error instanceof z.ZodError) return back("invalid");
    console.error("Waitlist signup failed:", error);
    return back("error");
  }
}
