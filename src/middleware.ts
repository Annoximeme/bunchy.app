import { NextResponse, type NextRequest } from "next/server";

/**
 * Content-Security-Policy, with a per-request nonce.
 *
 * The other four security headers are static and live in `next.config.ts`.
 * This one cannot: a CSP worth having names a nonce that must differ on every
 * response, and a config file is evaluated once at build time.
 *
 * The nonce is set on the *request* headers as well as the response. That is
 * not redundant — Next reads the incoming `content-security-policy` header,
 * lifts the nonce out of it, and stamps it onto every script tag it renders,
 * including the inline bootstrap that carries the flight data. Without the
 * request header the page still loads, the scripts are refused, and what you
 * get is fully-rendered HTML that never hydrates: it looks fine and nothing
 * works.
 *
 * `strict-dynamic` is what lets Next load its own chunks. Scripts fetched by
 * an already-trusted script inherit that trust, so the nonce covers the
 * bootstrap and the bootstrap covers everything under `/_next/static`.
 */
function contentSecurityPolicy(nonce: string, isDev: boolean, isHttps: boolean): string {
  return [
    "default-src 'self'",
    // 'unsafe-eval' is the price of React Fast Refresh, and it is scoped to
    // development so production never carries it.
    // `strict-dynamic` covers Stripe.js: it is loaded by @stripe/stripe-js from
    // a script this policy already trusts, and trust propagates. The host is
    // named anyway for browsers that ignore strict-dynamic.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com${isDev ? " 'unsafe-eval'" : ""}`,
    // Styles stay 'unsafe-inline'. Next inlines critical CSS without a nonce,
    // and a style injection is a defacement rather than the script execution
    // this policy exists to stop.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Same-origin, plus Stripe. The live bunch chat is an EventSource against
    // this origin; the only thing in the product that talks to anybody else is
    // the card form, which posts card details straight to Stripe rather than
    // through us — which is the entire reason we never hold them.
    "connect-src 'self' https://api.stripe.com",
    // Stripe renders the card fields inside its own frames, on its own origin.
    // That is the mechanism by which the card number is never in our DOM, so
    // this is a narrower policy than it looks: two named hosts, and everything
    // else still falls back to default-src 'self'.
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Duplicates X-Frame-Options: DENY for browsers that honour CSP instead.
    "frame-ancestors 'none'",
    // Keyed on the scheme the app is actually served over, not on NODE_ENV.
    // The real site is https and still gets it. A preview build runs with
    // NODE_ENV=production over plain http, and there the directive rewrites
    // the login form's own action to https, which fails to connect and is then
    // blocked by form-action 'self' — a signed-out app that looks fine.
    ...(isDev || !isHttps ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = btoa(String.fromCharCode(...bytes));

  const isDev = process.env.NODE_ENV === "development";
  // Read off the request rather than an env var: middleware is bundled, and a
  // build-time-inlined value would silently drop the directive on the real
  // site. Caddy terminates TLS and sets x-forwarded-proto.
  const isHttps =
    (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")) ===
    "https";
  const csp = contentSecurityPolicy(nonce, isDev, isHttps);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except the paths that are served as bytes and never contain
     * a script tag. Running on `/_next/static` would mint a nonce per asset
     * request for no benefit, and those responses are cached for a year.
     */
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)",
    },
  ],
};
