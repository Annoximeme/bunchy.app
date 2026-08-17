import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * No component hard-codes a colour that the theme is supposed to move.
 *
 * This exists because of one bug repeated in five places. The public pages were
 * built as fixed compositions with their colours written literally, on the
 * reasoning that a poster is a poster whatever the reader's settings say. The
 * consequence was a product where a reader who chose dark got it on their own
 * profile and not on the privacy policy, and where the landing page mounted a
 * theme toggle in its own footer that changed nothing on the page it sat on.
 *
 * The fix was tokens for every ground and every ink. This is what stops the
 * next literal creeping back in, because the failure is invisible in the theme
 * you happen to be developing in — a hard-coded `#172033` looks perfect all day
 * in light mode and is unreadable at night.
 *
 * ## What is deliberately allowed
 *
 * **Accent fills.** `#FF5C6C`, `#7657FF`, `#FFC857`, `#55D6BE` are the same in
 * both themes by design — a coral button is the same coral at night — so they
 * are legitimate literals. The palette in globals.css says so explicitly.
 *
 * **The bright inks on a deep band.** `#9B85FF` and `#55D6BE` as *text* are
 * correct on `band-deep`, which is dark in both themes. The pairing of a fixed
 * colour with a ground that never moves is the thing that is fine; it is the
 * mismatch that is not.
 *
 * So the list below is the unambiguous half: grounds and inks that exist in two
 * versions, where writing either one down means one theme gets the wrong one.
 */

/**
 * The themed UI, and only that.
 *
 * `src/server` is excluded on purpose and not as an oversight. The HTML emails
 * are rendered by mail clients that cannot be relied on for custom properties
 * and are not themed at all, and the brand assets are generated images. Both
 * are correct to write their colours literally, and both would otherwise fail
 * this test for doing the right thing.
 *
 * `opengraph-image.tsx` is in `src/app` but is the same case — an image, not a
 * page — so it is named out below.
 */
const ROOTS = ["app", "components"].map((dir) =>
  join(import.meta.dirname, "..", "src", dir),
);

/**
 * The named exceptions, each for a stated reason rather than because it was
 * inconvenient to fix.
 *
 *   opengraph-image  renders to a PNG, not to a themed page.
 *   manifest         PWA metadata, read by the OS, not by a stylesheet.
 *   admin/brand      swatches whose whole job is to show the logo *on light*
 *                    and *on dark*. With tokens the pair swapped in dark mode
 *                    and the knockout logo was drawn white on a near-white
 *                    panel — invisible, on the one page that exists to show
 *                    people what the logo looks like.
 */
const EXEMPT = [
  "opengraph-image.tsx",
  join("app", "manifest.ts"),
  join("admin", "brand", "page.tsx"),
];

/** Every one of these has a token, and the token is the only correct spelling. */
const MOVED = new Map<string, string>([
  ["#172033", "--color-ink (or --color-on-accent for a label on a fill)"],
  ["#3d4759", "--color-ink-soft"],
  ["#646977", "--color-muted"],
  ["#6b7280", "--color-muted"],
  ["#5f6470", "--color-muted"],
  ["#f5f7fa", "--color-ink"],
  ["#c3cad6", "--color-ink-soft"],
  ["#fff9f3", "--color-band-soft / --color-canvas"],
  ["#f9f0e6", "--color-band-warm / --color-surface-sunken"],
  ["#f3efe9", "--color-band-warm"],
  ["#101826", "--color-canvas"],
  ["#182231", "--color-surface"],
  ["#efe6da", "--color-line"],
  ["#c42a40", "--color-accent-ink"],
  ["#ce2f45", "--color-accent-ink"],
  ["#8a5e00", "--color-yellow-ink"],
  ["#0e7a69", "--color-mint-ink"],
  ["#6a47f5", "--color-purple-ink"],
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Generated Prisma output is not ours and contains no colours.
      return entry.name === "generated" ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/**
 * Comments are prose and may name a colour while explaining why it was wrong —
 * several of them do, and that is the opposite of the problem.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("colours that the theme moves", () => {
  it("are written as tokens, never as literals", () => {
    const offences: string[] = [];

    const files = ROOTS.flatMap(sourceFiles).filter(
      (file) => !EXEMPT.some((name) => file.endsWith(name)),
    );

    for (const file of files) {
      const source = withoutComments(readFileSync(file, "utf8"));
      source.split("\n").forEach((line, i) => {
        for (const [hex, token] of MOVED) {
          if (!line.toLowerCase().includes(hex)) continue;
          offences.push(
            `${file.slice(file.indexOf("/src/") + 1)}:${i + 1} uses ${hex} — use ${token}`,
          );
        }
      });
    }

    expect(offences, `hard-coded themed colours:\n  ${offences.join("\n  ")}`).toEqual([]);
  });
});

describe("the bands", () => {
  const css = readFileSync(
    join(import.meta.dirname, "..", "src", "app", "globals.css"),
    "utf8",
  );

  it("give the reading ground and the app canvas the same value", () => {
    // By alias rather than by a second copy of the hex. Two literals that
    // happen to match today are two literals that stop matching the first time
    // one of them is tuned, and the symptom is a seam between a public page and
    // the app that nobody can quite point at.
    expect(css).toContain("--color-band-soft: var(--color-canvas)");
    expect(css).toContain("--color-band-warm: var(--color-surface-sunken)");
  });

  it("keep the deep band darker than the reading ground in both themes", () => {
    // The public pages alternate the two. If they converge, the composition
    // flattens into one sheet and every section boundary disappears.
    const deep = [...css.matchAll(/--color-band-deep:\s*(#[0-9A-Fa-f]{6})/g)].map(
      (m) => m[1]!.toLowerCase(),
    );
    expect(deep.length).toBeGreaterThanOrEqual(2);

    const luminance = (hex: string) =>
      [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .reduce((sum, c, i) => sum + [0.2126, 0.7152, 0.0722][i]! * c, 0);

    // #101826 is the canvas at night, and every deep value must sit below it.
    for (const value of deep) {
      expect(luminance(value), `${value} is not darker than the dark canvas`).toBeLessThan(
        luminance("#101826"),
      );
    }
  });
});
