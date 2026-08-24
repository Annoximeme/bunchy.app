import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * One micro-label, spelled one way.
 *
 * The sibling of `card-consistency`, and the same failure a size down. The
 * all-caps annotation, "Unread", "Every week", "Interrupts", "Scheduled", had
 * been written out longhand in six places across three files. Five agreed on
 * `px-2 py-0.5`. `TierChip` used `px-2.5 py-1`, and it renders on the same row
 * as the "Unread" one, touching it: two labels in the same style, side by side,
 * at two different heights, which reads as one of them being broken rather than
 * as a distinction being drawn.
 *
 * The admin announcements page had four pill variants in a single flex row,
 * differing in weight and case as well as size.
 *
 * None of that is a bug in the sense of something failing. It is the way a
 * design system stops being one: nobody decides to have two sizes of tag, they
 * just accumulate, and by the time it is obvious the fix touches every page.
 *
 * `Tag` in `components/ui.tsx` is the one spelling. This checks nothing else
 * writes its geometry out by hand.
 */

const ROOTS = ["app", "components"].map((dir) =>
  join(import.meta.dirname, "..", "src", dir),
);

/** The definition itself, which necessarily contains the utilities. */
const EXEMPT = [join("components", "ui.tsx")];

/**
 * The tell is a *pill*: rounded-full together with the 11px uppercase pairing.
 *
 * All three parts are required. The font size alone catches unrelated small
 * text. `uppercase` alone catches section eyebrows, which are a different and
 * legitimate object, a heading above a group rather than a label attached to
 * one, and they carry no background. It is the pill that says "this is a tag".
 */
const HAND_ROLLED =
  /rounded-full(?![\w-])[^"'`]*text-\[11px\][^"'`]*\buppercase\b|rounded-full(?![\w-])[^"'`]*\buppercase\b[^"'`]*text-\[11px\]/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "generated" ? [] : sourceFiles(full);
    }
    return /\.tsx$/.test(entry.name) ? [full] : [];
  });
}

/** Comments describe the forbidden spelling in order to forbid it. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const files = ROOTS.flatMap(sourceFiles)
  .map((path) => ({
    path,
    label: relative(join(import.meta.dirname, "..", "src"), path),
  }))
  .filter(({ label }) => !EXEMPT.some((exempt) => label.endsWith(exempt)));

describe("micro-labels use the Tag component", () => {
  it.each(files.map((f) => f.label))("%s", (label) => {
    const file = files.find((f) => f.label === label)!;
    const source = withoutComments(readFileSync(file.path, "utf8"));

    const offender = source.match(HAND_ROLLED);

    expect(
      offender?.[0] ?? null,
      `${label} writes an 11px uppercase label by hand. Use \`Tag\` from ` +
        "components/ui, which owns the padding, weight and tracking, so two " +
        "of them sitting next to each other cannot be different sizes.",
    ).toBeNull();
  });
});
