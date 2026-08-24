import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every page in the signed-in app can be reached from a phone.
 *
 * The bottom bar carries five destinations. The desktop rail carries twelve.
 * That gap is mostly deliberate, but it was never checked, and three
 * destinations had fallen through it. `/notifications` was the worst: it was
 * linked from exactly one place in the entire product, the desktop rail, so on
 * a phone the page existed and could not be opened.
 *
 * What made it a bug rather than an omission is that the You tab carried a
 * badge counting pending connection requests and unread notifications, and
 * pointed at `/profile`, which showed neither and linked to neither. A member
 * on a phone saw a red count, tapped it, arrived at their own bio, and had no
 * way to find what it counted or to clear it.
 *
 * This asserts the property rather than the fix: every route under `(app)` is
 * linked from somewhere that a phone can actually get to. The desktop rail does
 * not count, which is the whole point.
 */

const APP_DIR = join(import.meta.dirname, "..", "src", "app", "(app)");
const SRC = join(import.meta.dirname, "..", "src");

/** The rail is desktop-only (`hidden md:flex`), so links in it prove nothing. */
const DESKTOP_ONLY = [join("components", "nav.tsx")];

/**
 * Routes that are not destinations and are correctly absent from navigation.
 * Each is reached by acting on something rather than by going there.
 */
const NOT_DESTINATIONS = new Set([
  "/", // the shell's index, if one ever appears
  "/start", // the compose button in the bottom bar
  "/bunches/new",
  "/activities/new",
  "/settings/supporter", // reached from /supporter once you are one
  "/feedback", // linked from the site footer on every page
]);

/** Dynamic segments are reached from the list page that owns them. */
function isDynamic(route: string): boolean {
  return route.includes("[");
}

function routes(dir: string, prefix = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [];
    const full = join(dir, entry.name);
    const segment = entry.name.startsWith("(") ? prefix : `${prefix}/${entry.name}`;
    const here = readdirSync(full).includes("page.tsx") ? [segment || "/"] : [];
    return [...here, ...routes(full, segment)];
  });
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "generated" ? [] : sourceFiles(full);
    }
    return /\.tsx$/.test(entry.name) ? [full] : [];
  });
}

const reachableSources = sourceFiles(SRC).filter(
  (path) => !DESKTOP_ONLY.some((skip) => path.endsWith(skip)),
);

const corpus = reachableSources.map((path) => readFileSync(path, "utf8")).join("\n");

const destinations = routes(APP_DIR)
  .filter((route) => !isDynamic(route))
  .filter((route) => !NOT_DESTINATIONS.has(route));

describe("a phone can reach", () => {
  it.each(destinations)("%s", (route) => {
    // Either a JSX href or an entry in a link table, both of which appear as
    // the quoted path in the source.
    const linked = corpus.includes(`"${route}"`);

    expect(
      linked,
      `Nothing outside the desktop navigation rail links to ${route}, so it ` +
        "cannot be opened on a phone. Add it to the bottom bar, to Discover's " +
        "shortcuts, or to the mobile list on /profile.",
    ).toBe(true);
  });
});
