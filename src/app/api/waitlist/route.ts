import { NextResponse } from "next/server";
import { z } from "zod";
import { requestFingerprint } from "@/server/auth/cookies";
import { consume } from "@/server/ratelimit";
import { joinWaitlist } from "@/server/modules/waitlist/service";
import { DEFAULT_LOCALE, isLocale, localePath } from "@/lib/i18n/config";

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

/**
 * Back to the page they submitted from, in the language they read it in.
 *
 * The language rides along as a hidden field rather than being read off the
 * referrer or the cookie. The form is the only thing that knows for certain,
 * and somebody who came to the French page from a link should land back on the
 * French page whatever they chose here previously.
 */
function back(
  status: "joined" | "invalid" | "busy" | "error",
  locale: string | null = null,
) {
  const language = isLocale(locale) ? locale : DEFAULT_LOCALE;
  // 303 so the browser follows with GET. A 307 would repeat the POST.
  return NextResponse.redirect(
    new URL(
      `${localePath(language, "/")}?waitlist=${status}`,
      process.env.APP_URL ?? "http://localhost:3000",
    ),
    303,
  );
}

export async function POST(request: Request) {
  // Parsed once, up front: a rate-limited or failed submission has to come
  // back to the same page as a successful one, and the body can only be read
  // through once.
  let form: FormData | null = null;
  try {
    form = await request.formData();
  } catch {
    // Falls through as English, which is the only thing left to be.
  }
  const locale = typeof form?.get("locale") === "string" ? String(form.get("locale")) : null;

  try {
    await consume("waitlist", await requestFingerprint());
  } catch {
    return back("busy", locale);
  }

  try {
    const { email } = schema.parse({ email: form?.get("email") ?? "" });
    await joinWaitlist(email);
    return back("joined", locale);
  } catch (error) {
    if (error instanceof z.ZodError) return back("invalid", locale);
    console.error("Waitlist signup failed:", error);
    return back("error", locale);
  }
}
