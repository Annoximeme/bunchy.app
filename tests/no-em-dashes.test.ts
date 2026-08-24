import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * No em dashes, anywhere the product speaks.
 *
 * This is Gianni's rule and the reason for it is not typographic: heavy em dash
 * use is one of the clearest tells that text was generated rather than written,
 * and it undermines a product whose entire positioning is that one person built
 * it by hand. The rule covers everything, prose in the interface, commit
 * messages, comments, and the Discord bot, not only marketing copy.
 *
 * There was already a test for this. It checked two functions in one file, the
 * rules embed and the welcome message, on the reasoning that those are the
 * longest prose the product puts in front of a stranger. It passed, and
 * meanwhile two slash command replies in the file next door were building their
 * output around an em dash, on every invocation:
 *
 *   • **Board games tonight** — 3 going, closes in 40 min
 *
 * A rule enforced on two functions is a rule enforced nowhere. So the check
 * reads the whole source tree instead, which is the only scope that matches
 * what the rule actually says.
 *
 * ## What is allowed
 *
 * An em dash that is *data* rather than prose: something being parsed, a
 * fixture, or content somebody else wrote. There is nothing in that category
 * here today, and the exception list is empty on purpose. If one arrives, name
 * the file and say which of those it is, because "it is data" is a claim worth
 * having to make out loud.
 *
 * The en dash is checked too, because swapping one dash for the other satisfies
 * a grep and not the reason behind it. But only where it is doing an em dash's
 * job: standing between clauses, with a space on each side. An en dash closed
 * up between two numbers is a range, "4-8MB", "1-12", "30-39", which is what
 * the character is actually for and reads as care rather than as a machine.
 * Ten of those exist in the tree and all ten are correct.
 */

const ROOTS = ["src", "prisma", "scripts"].map((dir) =>
  join(import.meta.dirname, "..", dir),
);

/** Generated Prisma output is not ours and is not prose. */
const SKIP_DIRS = new Set(["generated", "node_modules", "migrations"]);

/**
 * This file, which necessarily contains the characters it forbids in order to
 * search for them, and the older Discord test, which asserts their absence the
 * same way.
 */
const EXEMPT = [
  join("tests", "no-em-dashes.test.ts"),
  join("discord", "messages.test.ts"),
];

/**
 * The em dash is banned outright. The en dash only when spaced, which is the
 * shape that means it is being used as a clause separator rather than a range.
 */
const BANNED: Array<[RegExp, string]> = [
  [/\u2014/, "em dash"],
  [/\s\u2013\s/, "spaced en dash, which is an em dash wearing a hat"],
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return SKIP_DIRS.has(entry.name) ? [] : sourceFiles(full);
    }
    return /\.(tsx?|mts|css|md)$/.test(entry.name) ? [full] : [];
  });
}

const root = join(import.meta.dirname, "..");
const files = ROOTS.flatMap(sourceFiles)
  .map((path) => ({ path, label: relative(root, path) }))
  .filter(({ label }) => !EXEMPT.some((exempt) => label.endsWith(exempt)));

describe("the writing", () => {
  it("contains no em dashes, and no en dash doing an em dash's job", () => {
    const offenders: string[] = [];

    for (const { path, label } of files) {
      const lines = readFileSync(path, "utf8").split("\n");
      lines.forEach((line, index) => {
        for (const [pattern, name] of BANNED) {
          if (pattern.test(line)) {
            offenders.push(`${label}:${index + 1} has an ${name}: ${line.trim().slice(0, 72)}`);
          }
        }
      });
    }

    expect(
      offenders,
      "Use a full stop and a new sentence, a comma, a colon, brackets or a " +
        "semicolon. A spaced en dash is not a substitute for an em dash; an "  +
        "unspaced one between numbers is a range and is fine.",
    ).toEqual([]);
  });
});
