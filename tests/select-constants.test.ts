import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every select constant is checked against its model at compile time.
 *
 * ## The bug this exists because of
 *
 * `PROFILE_SELECT` in the matching repository once asked for `outcomes` on
 * `Profile`. That is the relation name on `Activity`; on `Profile` it is
 * `activityOutcomes`. It typechecked, passed the entire unit suite, shipped,
 * and turned every Discover render into a `PrismaClientValidationError`. The
 * page showed its error boundary for two days.
 *
 * Nothing caught it, and both misses were structural rather than bad luck:
 *
 * TypeScript did not, because a select declared as a standalone object and
 * spread into a query later is never seen by Prisma in the position where it
 * validates field names against the model. It is checked as a plain object
 * literal, and a plain object literal may contain anything.
 *
 * The unit suite did not, because it mocks the database. A mock will happily
 * accept a query the real client refuses, which is the whole point of a mock
 * and also its whole risk.
 *
 * ## Why this is a lint rather than a runtime check
 *
 * The fix is one word: `satisfies ProfileSelect` puts the object back in
 * argument position and the compiler does the rest. So the useful test is not
 * "does this query run", which needs a database and would only cover the
 * selects somebody remembered to exercise. It is "is every select constant
 * wearing the annotation", which needs nothing and covers all of them,
 * including the one written next week.
 *
 * `ACTIVITY_SELECT` already carried it when this was written. The pattern was
 * known; it just was not applied everywhere, which is exactly the shape of gap
 * a test closes and a convention does not.
 */

/**
 * Walked from disk rather than shelled out to `git ls-files`.
 *
 * The first version used git, which is not installed in the container the
 * suite runs in, so the describe body threw during collection and vitest
 * reported "no tests" rather than a failure. A guard that reports success by
 * finding nothing is the exact failure this file exists to prevent, which is
 * why the second test below asserts it found something.
 */
function sourceFiles(dir = "src/server"): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")
      ? [path]
      : [];
  });
}

/** `const NAME_SELECT = {` at the top level, the shape being guarded. */
const DECLARATION = /^(?:export )?const (\w*SELECT) = \{/gm;

describe("Prisma select constants", () => {
  const offenders: string[] = [];

  for (const file of sourceFiles()) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(DECLARATION)) {
      const name = match[1]!;
      // Walk from the opening brace to its partner, then look at what follows.
      let depth = 0;
      let i = source.indexOf("{", match.index!);
      for (; i < source.length; i += 1) {
        if (source[i] === "{") depth += 1;
        else if (source[i] === "}") {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      const tail = source.slice(i, i + 60);
      if (!tail.includes("satisfies")) {
        offenders.push(`${file}: ${name}`);
      }
    }
  }

  it("are all pinned to a model with `satisfies`", () => {
    // A select without it compiles whatever it likes and fails in front of a
    // member instead. See the note above for the one that did.
    expect(offenders).toEqual([]);
  });

  it("found some selects to check, so the pattern above still matches", () => {
    // A regex that silently stops matching turns this file into a test that
    // passes by finding nothing, which is worse than no test at all.
    const found = sourceFiles()
      .flatMap((f) => [...readFileSync(f, "utf8").matchAll(DECLARATION)])
      .map((m) => m[1]);

    expect(found.length).toBeGreaterThanOrEqual(5);
    expect(found).toContain("PROFILE_SELECT");
  });
});
