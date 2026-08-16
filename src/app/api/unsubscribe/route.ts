import { NextResponse } from "next/server";
import {
  applyUnsubscribe,
  verifyUnsubscribe,
} from "@/server/email/unsubscribe";

/**
 * Unsubscribing, for both of the things that post here.
 *
 * **Gmail, Yahoo and Outlook.com**, via RFC 8058 one-click. No human is
 * present: the client posts `List-Unsubscribe=One-Click` to the URL from the
 * header, expects a 2xx, and shows the reader "unsubscribed" on the strength
 * of it. Anything other than a 2xx is reported to the reader as a failure,
 * which is precisely the moment they reach for the spam button instead.
 *
 * **The confirmation page**, via a normal form post, which wants a redirect so
 * the browser lands somewhere with a result on it.
 *
 * The two are told apart by where the token came from — query for one-click
 * (it is baked into the header URL), form field for the page.
 *
 * No rate limit and no session. Both would be actively harmful here: a token
 * is already an unforgeable capability for one address, and the failure mode
 * of a false positive is somebody who cannot stop the email. That is a worse
 * outcome for us than any amount of pointless posting by a bot, which achieves
 * nothing anyway — the only thing this endpoint can do with a valid token is
 * the thing the token's holder was invited to do.
 */

async function tokenFrom(request: Request): Promise<{
  token: string | null;
  fromForm: boolean;
}> {
  const query = new URL(request.url).searchParams.get("token");
  if (query) return { token: query, fromForm: false };

  try {
    const form = await request.formData();
    const value = form.get("token");
    return { token: typeof value === "string" ? value : null, fromForm: true };
  } catch {
    return { token: null, fromForm: true };
  }
}

export async function POST(request: Request) {
  const { token, fromForm } = await tokenFrom(request);
  const target = token ? verifyUnsubscribe(token) : null;

  if (!target) {
    return fromForm
      ? redirectTo(request, "/unsubscribe")
      : new Response("That unsubscribe link is not valid.", { status: 400 });
  }

  try {
    await applyUnsubscribe(target);
  } catch (error) {
    console.error("Unsubscribe failed:", error);
    // A 5xx is the honest answer for the one-click caller: it will show the
    // reader that it did not work, which is true, rather than telling them the
    // mail has stopped when it has not.
    return fromForm
      ? redirectTo(request, "/unsubscribe")
      : new Response("Could not unsubscribe. Try again shortly.", {
          status: 500,
        });
  }

  if (!fromForm) return new Response("Unsubscribed.", { status: 200 });

  // 303, so the browser follows with GET and a refresh does not repost.
  return redirectTo(request, `/unsubscribe?done=${target.kind}`);
}

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}
