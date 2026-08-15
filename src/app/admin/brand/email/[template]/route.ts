import { isAppError } from "@/server/errors";
import { requireStaff } from "@/server/modules/admin/guard";
import { EMAIL_PREVIEWS, renderPreview } from "@/server/email/previews";

/**
 * Look at an email without sending one.
 *
 * The rendered HTML, served as itself. A route handler rather than a page,
 * because an email is a whole document — doctype, `<body>` background, the lot
 * — and nesting one inside the admin layout would show it wrapped in Bunchy's
 * stylesheet, which is exactly the condition an inbox will never reproduce.
 *
 * Opened in a new tab rather than an iframe on the brand page: this app sends
 * `X-Frame-Options: DENY` on every response, which blocks same-origin framing
 * too, and carving an exception into the frame policy to preview a template is
 * a bad trade.
 *
 * Staff-guarded like the rest of `/admin`, and no-store: the previews contain
 * example links, and there is no reason for one to sit in a shared cache.
 *
 * The guard's refusal is caught here rather than left to propagate. A page
 * under `/admin` gets Next's not-found boundary for free; a route handler does
 * not, so an uncaught `notFound()` from `requireStaff` leaves the framework to
 * turn a deliberate refusal into a 500 — which is both the wrong status and a
 * line in the error log every time somebody who is not staff pokes at the URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ template: string }> },
) {
  try {
    await requireStaff();
  } catch (error) {
    if (isAppError(error)) {
      // The same answer a missing URL gets, for the same reason the guard
      // gives it: a 403 would confirm that this preview exists.
      return new Response(error.message, { status: error.status });
    }
    throw error;
  }

  const { template } = await params;
  const preview = EMAIL_PREVIEWS.find((p) => p.slug === template);
  if (!preview) return new Response("No such email template.", { status: 404 });

  return new Response(renderPreview(preview), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
