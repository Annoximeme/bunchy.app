import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { LOCALE_COOKIE } from "@/lib/i18n/config";

/**
 * The language a request is answered in, and how a reader changes it.
 *
 * These are here because of a bug that made English unreachable: the switcher
 * pointed at the bare address, the bare address is read with the cookie, and
 * the cookie still said Dutch. Every case below is a step on the path a reader
 * takes through the switcher, so the loop cannot come back unnoticed.
 */
function request(path: string, init: { cookie?: string; accept?: string } = {}) {
  const headers = new Headers();
  if (init.cookie) headers.set("cookie", `${LOCALE_COOKIE}=${init.cookie}`);
  if (init.accept) headers.set("accept-language", init.accept);
  return new NextRequest(new URL(path, "https://bunchy.app"), { headers });
}

/** Where a redirect points, or null if the response is not one. */
function target(response: Response): string | null {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname + new URL(location).search : null;
}

/**
 * The language the page will be rendered in.
 *
 * Read back out of the header the proxy sets on the *request*, which Next
 * carries on the response under this prefix until it hands the request on.
 */
function servedLocale(response: Response): string | null {
  return response.headers.get("x-middleware-request-x-locale");
}

describe("choosing a language", () => {
  it("takes a Dutch reader to English, which is the whole point", () => {
    const response = proxy(request("/discover", { cookie: "nl" }));
    expect(target(response)).toBe("/nl/discover");

    // What the switcher actually links to. The bare address above is not a
    // request for English, it is a request that names no language at all.
    const chosen = proxy(request("/en/discover", { cookie: "nl" }));
    expect(target(chosen)).toBe("/discover");
    expect(chosen.cookies.get(LOCALE_COOKIE)?.value).toBe("en");
  });

  it("keeps the choice, so the page it lands on is English too", () => {
    const chosen = proxy(request("/en/discover", { cookie: "nl" }));
    const cookie = chosen.cookies.get(LOCALE_COOKIE)?.value ?? "";

    const landing = proxy(request("/discover", { cookie }));
    expect(target(landing)).toBeNull();
    expect(servedLocale(landing)).toBe("en");
  });

  it("does not let the browser cache the redirect that records it", () => {
    // A 308 here was kept by the browser for good, and the second switch back
    // to English never reached the server to write the cookie.
    const chosen = proxy(request("/en/discover", { cookie: "nl" }));
    expect(chosen.status).toBe(307);
    expect(chosen.headers.get("cache-control")).toBe("no-store");
  });

  it("remembers a language named in the address, in either direction", () => {
    const dutch = proxy(request("/nl/discover", { cookie: "en" }));
    expect(target(dutch)).toBeNull();
    expect(servedLocale(dutch)).toBe("nl");
    expect(dutch.cookies.get(LOCALE_COOKIE)?.value).toBe("nl");

    const french = proxy(request("/fr/discover"));
    expect(french.cookies.get(LOCALE_COOKIE)?.value).toBe("fr");
  });

  it("does not write down a language it only guessed", () => {
    const guessed = proxy(request("/", { accept: "nl-BE,nl;q=0.9" }));
    expect(target(guessed)).toBe("/nl");
    expect(guessed.cookies.get(LOCALE_COOKIE)).toBeUndefined();
  });

  it("never hands back the gate's own address", () => {
    // While the coming-soon gate is up the page is rendered from an internal
    // path, so its English link arrives as `/en/coming-soon`. The reader was
    // looking at the front page, and that is what they should end up on.
    expect(target(proxy(request("/en/coming-soon", { cookie: "nl" })))).toBe("/");
    expect(target(proxy(request("/coming-soon", { cookie: "nl" })))).toBe("/nl");
  });

  it("leaves the addresses that have no language alone", () => {
    expect(target(proxy(request("/api/health", { cookie: "nl" })))).toBeNull();
    expect(target(proxy(request("/en/api/health", { cookie: "nl" })))).toBeNull();
    expect(target(proxy(request("/sitemap.xml", { cookie: "fr" })))).toBeNull();
  });
});
