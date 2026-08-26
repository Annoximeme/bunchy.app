import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  localePath,
  preferredLocale,
  splitLocale,
  type Locale,
} from "@/lib/i18n/config";

/**
 * Content-Security-Policy, with a per-request nonce.
 *
 * The other four security headers are static and live in `next.config.ts`.
 * This one cannot: a CSP worth having names a nonce that must differ on every
 * response, and a config file is evaluated once at build time.
 *
 * The nonce is set on the *request* headers as well as the response. That is
 * not redundant, Next reads the incoming `content-security-policy` header,
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
    // through us, which is the entire reason we never hold them.
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
    // blocked by form-action 'self', a signed-out app that looks fine.
    ...(isDev || !isHttps ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/**
 * Which language this request is in, and whether the address says so.
 *
 * The address wins. A link somebody was sent in French opens in French no
 * matter what the reader chose here last, because the alternative is that a
 * shared link shows two people different pages, which makes it useless as a
 * way of pointing at something.
 *
 * With no prefix, the last choice is honoured, then the browser's own list of
 * languages, then English. The browser is asked before English rather than
 * after so that a Dutch speaker arriving at bunchy.app for the first time does
 * not have to find a control in a language they did not want.
 */
function resolveLocale(request: NextRequest): {
  locale: Locale;
  fromPath: boolean;
  path: string;
} {
  const { locale, path } = splitLocale(request.nextUrl.pathname);
  if (locale) return { locale, fromPath: true, path };

  const remembered = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(remembered)) return { locale: remembered, fromPath: false, path };

  const guessed = preferredLocale(request.headers.get("accept-language"));
  return { locale: guessed ?? DEFAULT_LOCALE, fromPath: false, path };
}

/**
 * Paths that have no language and never should.
 *
 * An API route answers JSON to code, and `/nl/api/...` would be a second
 * address for one endpoint. Anything a browser fetches without a document
 * around it belongs here too: a manifest, an icon, the service worker.
 */
function isLocaleless(path: string): boolean {
  return (
    path.startsWith("/api/") ||
    path.startsWith("/_next/") ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path === "/manifest.webmanifest" ||
    path === "/opengraph-image" ||
    /\.[a-z0-9]+$/i.test(path)
  );
}

export function proxy(request: NextRequest) {
  const { locale, fromPath, path } = resolveLocale(request);
  const localeless = isLocaleless(path);

  // `/en/...` is not a second address for an English page. It is the one
  // address people will type by analogy with the other two, so it redirects
  // rather than 404s, and the prefix-free URL stays the only one that exists.
  if (fromPath && locale === DEFAULT_LOCALE && !localeless) {
    const canonical = request.nextUrl.clone();
    canonical.pathname = path;
    return NextResponse.redirect(canonical, 308);
  }

  // A remembered or guessed language, on an address that does not say which.
  // Redirecting rather than rendering in place is what keeps one page at one
  // address: the Dutch version of Discover is /nl/discover to everybody,
  // including the crawler that has no cookie.
  if (!fromPath && locale !== DEFAULT_LOCALE && !localeless) {
    const prefixed = request.nextUrl.clone();
    // `/coming-soon` is not an address anybody should be sent to. While the
    // gate is up Caddy rewrites every public path to it before this runs, so
    // redirecting a Dutch reader to the language version of what arrived here
    // would put an internal path in their address bar. The page they asked for
    // was the front page, so that is where they are sent, and the gate rewrites
    // it again on the way back in.
    prefixed.pathname = localePath(locale, path === "/coming-soon" ? "/" : path);
    return NextResponse.redirect(prefixed, 307);
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = btoa(String.fromCharCode(...bytes));

  const isDev = process.env.NODE_ENV === "development";
  // Read off the request rather than an env var: this file is bundled, and a
  // build-time-inlined value would silently drop the directive on the real
  // site. Caddy terminates TLS and sets x-forwarded-proto.
  const isHttps =
    (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")) ===
    "https";
  const csp = contentSecurityPolicy(nonce, isDev, isHttps);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  // What the pages read. A header rather than a cookie, because it is the one
  // thing that is true of *this* request: the URL has already been consulted,
  // the cookie has already lost the argument if they disagreed.
  requestHeaders.set("x-locale", locale);
  // The path with no language on it, for the pages that have to name their own
  // alternates. `usePathname` cannot be read from metadata, and the rewritten
  // URL is not available there either.
  requestHeaders.set("x-pathname", path);

  const url = request.nextUrl.clone();
  if (fromPath && !localeless) {
    // The prefix stays in the address bar and disappears on the way in, so
    // every page component and route file stays where it is. Putting the app
    // under `app/[locale]` would move sixty-one pages to buy nothing this does
    // not already do.
    url.pathname = path;
  }

  const response =
    url.pathname === request.nextUrl.pathname
      ? NextResponse.next({ request: { headers: requestHeaders } })
      : NextResponse.rewrite(url, { request: { headers: requestHeaders } });

  response.headers.set("content-security-policy", csp);

  // Remember the language named in the address, so the next bare link opens
  // in it. Written on the way past rather than by the switcher alone: most
  // people will change language by following a link, not by finding a control.
  if (fromPath && request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }

  // A bare address answers differently depending on the cookie and the
  // browser's language list, and a cache that ignores that would serve one
  // visitor's language to the next.
  if (!localeless) {
    response.headers.set("Vary", "Accept-Language, Cookie");
  }

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
