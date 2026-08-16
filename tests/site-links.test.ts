import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SITE_LINKS } from "@/components/site-links";

/**
 * The pages that explain Bunchy have to be reachable from inside Bunchy.
 *
 * This exists because of a real bug, and a quiet one. Every public page —
 * About, Safety, Volunteer, Privacy, Terms — was linked from exactly one
 * place: the landing page footer. Signing in redirects you off the landing
 * page, so the moment somebody had an account, all five became unreachable
 * through the interface.
 *
 * The volunteer page is where it did visible damage. It tells a signed-out
 * reader they need an account to apply, and renders the application form once
 * they have one — but signing in removed the only door to the page. Anyone who
 * followed that instruction ended up further from applying than when they
 * started.
 *
 * A layout is not something the unit suite can render, so these assert the
 * wiring rather than the pixels: every link in the shared list resolves to a
 * route that exists, and the signed-in shell actually mounts the footer.
 */

const ROOT = new URL("../src/app/", import.meta.url).pathname;

/** Both `app/x/page.tsx` and `app/(group)/x/page.tsx` are real routes. */
function routeExists(path: string): boolean {
  const segment = path.replace(/^\//, "");
  const candidates = [
    `${ROOT}${segment}/page.tsx`,
    `${ROOT}(legal)/${segment}/page.tsx`,
    `${ROOT}(app)/${segment}/page.tsx`,
    `${ROOT}(auth)/${segment}/page.tsx`,
  ];
  return candidates.some((candidate) => existsSync(candidate));
}

describe("the shared site links", () => {
  it("point at pages that exist", () => {
    for (const link of SITE_LINKS) {
      expect(routeExists(link.href), `${link.href} has no page`).toBe(true);
    }
  });

  it("include the volunteer page, which is the one that asks you to sign in", () => {
    expect(SITE_LINKS.map((l) => l.href)).toContain("/moderators");
  });

  it("include About", () => {
    expect(SITE_LINKS.map((l) => l.href)).toContain("/about");
  });
});

describe("reachability", () => {
  it("is mounted in the signed-in shell", () => {
    // Without this the whole list is unreachable to anyone with an account,
    // which is precisely the bug.
    const layout = readFileSync(`${ROOT}(app)/layout.tsx`, "utf8");
    expect(layout).toContain("SiteFooter");
  });

  it("is mounted on the policy pages", () => {
    const legal = readFileSync(
      new URL("../src/components/legal.tsx", import.meta.url).pathname,
      "utf8",
    );
    expect(legal).toContain("SiteNav");
  });

  it("is mounted in the landing footer", () => {
    const landing = readFileSync(`${ROOT}page.tsx`, "utf8");
    expect(landing).toContain("SITE_LINKS");
  });
});
