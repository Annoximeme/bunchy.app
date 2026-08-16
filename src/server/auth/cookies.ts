import { cookies, headers } from "next/headers";
import { hashIdentifier } from "@/server/auth/tokens";
import { authSecret, env } from "@/server/env";
import { SESSION_TTL_MS, type SessionContext } from "@/server/auth/session";

export const SESSION_COOKIE = "bunchy_session";

/**
 * Keyed on the scheme the app is actually served over, not on NODE_ENV.
 *
 * The real site is https and still gets `Secure`. A preview build runs with
 * NODE_ENV=production over plain http, and there `Secure` meant the browser
 * accepted the sign-in response and silently dropped the cookie: the login
 * call returned 200 and the very next page bounced back to /login, which is a
 * miserable thing to debug.
 */
export function secureCookies(): boolean {
  return env().APP_URL.startsWith("https://");
}

export async function readSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

export async function writeSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies(),
    // "lax" still sends the cookie on top-level navigation (so email links and
    // OAuth redirects land signed in) while blocking cross-site POSTs.
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Request metadata attached to a new session, for the "where am I signed in"
 * screen. The IP is hashed on the way in — we never store it raw.
 */
export async function sessionContextFromRequest(): Promise<SessionContext> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? headerList.get("x-real-ip");
  return {
    userAgent: headerList.get("user-agent"),
    ipHash: ip ? hashIdentifier(ip, authSecret()) : null,
  };
}

/** Coarse client identity for rate limiting anonymous endpoints. */
export async function requestFingerprint(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? "unknown";
  return hashIdentifier(ip, authSecret());
}
