import { readFileSync, existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SITE_LINKS } from "@/components/site-links";

/**
 * The pages that explain Bunchy have to be reachable from inside Bunchy.
 *
 * This exists because of a real bug, and a quiet one. Every public page,
 * About, Safety, Volunteer, Privacy, Terms, was linked from exactly one
 * place: the landing page footer. Signing in redirects you off the landing
 * page, so the moment somebody had an account, all five became unreachable
 * through the interface.
 *
 * The volunteer page is where it did visible damage. It tells a signed-out
 * reader they need an account to apply, and renders the application form once
 * they have one, but signing in removed the only door to the page. Anyone who
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
  // The query string is dropped before resolving. A link may legitimately
  // carry one, `/?home=1` asks the landing page not to bounce a signed-in
  // member back to Discover, and the job of this test is to catch a link that
  // points at no page rather than one that points at a page with an argument.
  const segment = path.split("?")[0]!.replace(/^\//, "");
  // The root is `app/page.tsx`, which has no segment of its own.
  if (segment === "") return existsSync(`${ROOT}page.tsx`);
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
    for (const link of SITE_LINKS.filter((l) => !l.external)) {
      expect(routeExists(link.href), `${link.href} has no page`).toBe(true);
    }
  });

  it("send people off-site only over https", () => {
    // An external entry is exempt from the file check above, so this is the
    // only thing standing between a typo and a footer link on every page
    // pointing somewhere unencrypted.
    for (const link of SITE_LINKS.filter((l) => l.external)) {
      expect(link.href).toMatch(/^https:\/\//);
    }
  });

  it("include the volunteer page, which is the one that asks you to sign in", () => {
    expect(SITE_LINKS.map((l) => l.href)).toContain("/moderators");
  });

  it("include About", () => {
    expect(SITE_LINKS.map((l) => l.href)).toContain("/about");
  });
});

/** Every file under a directory, for the shell-wide checks below. */
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? walk(path) : [path];
  });
}

describe("reachability", () => {
  it("is mounted in the signed-in shell", () => {
    // Without this the whole list is unreachable to anyone with an account,
    // which is precisely the bug.
    //
    // The mount moved from the layout into `PageShell` so the footer inherits
    // whichever width the page chose rather than always taking the wide one.
    // That is only safe while every page in the shell goes through `PageShell`,
    // so this checks both halves of it.
    const shell = readFileSync(
      new URL("../src/components/page-header.tsx", import.meta.url).pathname,
      "utf8",
    );
    expect(shell).toContain("SiteFooter");

    const pages = walk(`${ROOT}(app)`).filter((f) => f.endsWith("page.tsx"));
    expect(pages.length).toBeGreaterThan(20);
    for (const page of pages) {
      expect(readFileSync(page, "utf8")).toContain("PageShell");
    }
  });

  it("is mounted on the policy pages", () => {
    const legal = readFileSync(
      new URL("../src/components/legal.tsx", import.meta.url).pathname,
      "utf8",
    );
    // `SITE_LINKS` rather than `SiteNav`. The policy shell draws the list
    // itself now, because `SiteNav` is coloured from the theme tokens and the
    // masthead it sits in is pinned navy. What this test is protecting is that
    // the pages link to the *whole list from one source*, which is what broke
    // originally, not which component renders it. Asserting on the component
    // would fail the day a page legitimately draws the list another way, and
    // pass the day somebody hand-types four links into the shell.
    expect(legal).toContain("SITE_LINKS");
  });

  it("is mounted in the landing footer", () => {
    const landing = readFileSync(`${ROOT}page.tsx`, "utf8");
    expect(landing).toContain("SITE_LINKS");
  });
});

/**
 * Every internal link in the app points at a route that exists.
 *
 * Written after Bunchy Now offered "Search with your own words" behind a link
 * to `/find`, a page that has never existed. Nothing caught it: the build is
 * happy, `next/link` takes any string, and the only visible symptom was a
 * 404 for whoever clicked, plus a prefetch that hung and made the page look
 * slow. A dead link is not a typo, it is a promise the interface breaks.
 *
 * Static hrefs only. A template literal is a runtime value and this is a file
 * scan, so `/start?q=${...}` is checked as `/start` and dynamic segments match
 * by shape.
 */
describe("every internal link", () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return sourceFiles(full);
      return /\.tsx?$/.test(entry.name) ? [full] : [];
    });
  }

  /**
   * `src/app/(app)/u/[username]/page.tsx` → `/u/[username]`.
   *
   * Metadata routes count too: `opengraph-image.tsx` is a real URL that
   * answers with an image, and the brand page links to it on purpose.
   */
  const ROUTE_FILE = /\/(page|opengraph-image|twitter-image|icon|apple-icon|sitemap|robots|manifest)\.tsx?$/;

  function routePatterns(): string[][] {
    return sourceFiles(ROOT)
      .filter((file) => ROUTE_FILE.test(file))
      .map((file) =>
        file
          .slice(ROOT.length)
          .replace(/\/page\.tsx$/, "")
          .replace(/\.tsx?$/, "")
          .split("/")
          .filter((segment) => segment !== "" && !segment.startsWith("(")),
      );
  }

  function matches(pattern: string[], segments: string[]): boolean {
    if (pattern.some((s) => s.startsWith("[..."))) {
      const fixed = pattern.slice(0, pattern.indexOf(pattern.find((s) => s.startsWith("[..."))!));
      return segments.length >= fixed.length;
    }
    if (pattern.length !== segments.length) return false;
    return pattern.every((s, i) => s.startsWith("[") || s === segments[i]);
  }

  it("points at a page that exists", () => {
    const patterns = routePatterns();
    const dead: string[] = [];

    for (const file of sourceFiles(new URL("../src/", import.meta.url).pathname)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/href="(\/[^"{}]*)"/g)) {
        const href = match[1] ?? "";
        const path = (href.split(/[?#]/)[0] ?? "").replace(/\/$/, "");
        // The landing page, the API, and the files served from /public are not
        // App Router pages and have no page.tsx to find.
        if (path === "" || path.startsWith("/api/") || /\.[a-z0-9]+$/i.test(path)) continue;

        const segments = path.split("/").filter(Boolean);
        if (!patterns.some((pattern) => matches(pattern, segments))) {
          dead.push(`${href} (${file.slice(file.indexOf("/src/") + 1)})`);
        }
      }
    }

    expect(dead, `links to pages that do not exist:\n  ${dead.join("\n  ")}`).toEqual([]);
  });
});
