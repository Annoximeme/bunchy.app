import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * One card, spelled one way.
 *
 * `card-surface` is a utility in globals.css: surface ground, hairline border,
 * `--radius-card`, and `--shadow-card`. Fourteen places wrote that combination
 * out by hand instead, and because the shadow is the easiest of the four to
 * leave off, most of them did.
 *
 * The result was visible rather than theoretical. Every card in Discover,
 * Bunches, Messages and on a profile sat slightly off its ground. Every card on
 * the two supporter pages lay flat against it. Same product, same session, two
 * different ideas about what a card is, and the pages where it was wrong are
 * the ones asking somebody for money.
 *
 * A drifting spelling of a shared thing is not a formatting problem, it is how
 * a design system stops being one. So this asserts the spelling.
 *
 * ## The two that are allowed, and why
 *
 * **`components/admin/primitives.tsx`.** The admin `Panel` is deliberately flat
 * and denser than a member-facing card. A staff dashboard is scanned, not read,
 * and lifting forty panels off the page turns a table of work into a pile of
 * objects. It is a different component that happens to share three of four
 * properties, not a copy that forgot the fourth.
 *
 * **`components/landing/moderation-banner.tsx`.** The landing page is a fixed
 * composition rather than a themed one, and its own file says so. Adding a
 * shadow there is a change to a poster, which is a design decision for the
 * person who drew it, not a consistency fix.
 *
 * **`components/announcements/announcement-list.tsx`.** Its border colour
 * carries state: an unread notice is edged in coral, a read one in the ordinary
 * hairline. A utility with a fixed border cannot express that, so the three
 * properties it can share are written out longhand, shadow included.
 *
 * All three are named here rather than silently skipped, so that adding a
 * fourth means writing down why.
 */

const ROOTS = ["app", "components"].map((dir) =>
  join(import.meta.dirname, "..", "src", dir),
);

const EXEMPT = [
  join("components", "admin", "primitives.tsx"),
  join("components", "landing", "moderation-banner.tsx"),
  join("components", "announcements", "announcement-list.tsx"),
];

/**
 * The hand-rolled shape: the card radius together with the card's own ground.
 *
 * Deliberately not matching on `border-line` alone, which is a legitimate
 * hairline in dozens of places that are not cards, nor on `--radius-card` alone,
 * which a sunken inset panel may reasonably borrow. It is the pairing of the
 * card radius with `bg-surface` that means "this is a card", and that is the
 * thing `card-surface` already says in one word.
 */
const HAND_ROLLED = /rounded-\[var\(--radius-card\)\][^"']*\bbg-surface\b(?!-)/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "generated" ? [] : sourceFiles(full);
    }
    return /\.tsx$/.test(entry.name) ? [full] : [];
  });
}

/** Comments explain the rule and may quote the thing the rule forbids. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const files = ROOTS.flatMap(sourceFiles)
  .map((path) => ({
    path,
    label: relative(join(import.meta.dirname, "..", "src"), path),
  }))
  .filter(({ label }) => !EXEMPT.some((exempt) => label.endsWith(exempt)));

describe("cards use the card utility", () => {
  it.each(files.map((f) => f.label))("%s", (label) => {
    const file = files.find((f) => f.label === label)!;
    const source = withoutComments(readFileSync(file.path, "utf8"));

    const offender = source.match(HAND_ROLLED);

    expect(
      offender?.[0] ?? null,
      `${label} builds a card by hand. Use the \`card-surface\` utility, ` +
        "which carries the shadow this spelling usually drops.",
    ).toBeNull();
  });
});
