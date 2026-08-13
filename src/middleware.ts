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
function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    // 'unsafe-eval' is the price of React Fast Refresh, and it is scoped to
    // development so production never carries it.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Styles stay 'unsafe-inline'. Next inlines critical CSS without a nonce,
    // and a style injection is a defacement rather than the script execution
    // this policy exists to stop.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Same-origin only. The live bunch chat is an EventSource against this
    // origin, so nothing external needs to be reachable.
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Duplicates X-Frame-Options: DENY for browsers that honour CSP instead.
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = btoa(String.fromCharCode(...bytes));

  const isDev = process.env.NODE_ENV === "development";
  const csp = contentSecurityPolicy(nonce, isDev);

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
