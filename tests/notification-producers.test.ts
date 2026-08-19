import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NOTIFICATION_TYPE_INFO } from "@/lib/notifications";

/**
 * Every notification a member can switch off must be one they could receive.
 *
 * This exists because two of them weren't. `BUNCH_RECOMMENDATION` and
 * `ACTIVITY_REMINDER` shipped as rows in the settings table, with copy
 * describing exactly when they would arrive, and nothing in the codebase ever
 * produced either. A member could carefully switch on "a reminder shortly
 * before an activity you joined" and wait forever.
 *
 * A toggle for something that cannot happen is worse than a missing feature: it
 * is a claim. This test is the thing that stops it happening again, add a type
 * to the settings screen without wiring a sender and the suite fails.
 */

const SOURCE_ROOTS = ["src/server", "src/app"];

/** Files that describe the types rather than produce them. */
const NOT_PRODUCERS = [
  "src/lib/notifications.ts",
  "src/server/modules/notifications/defaults.ts",
  "src/app/api/notifications/preferences/route.ts",
];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      out.push(...sourceFiles(path));
    } else if (/\.tsx?$/.test(path) && !path.endsWith(".test.ts")) {
      out.push(path);
    }
  }
  return out;
}

const corpus = SOURCE_ROOTS.flatMap(sourceFiles)
  .filter((path) => !NOT_PRODUCERS.some((skip) => path.endsWith(skip.replace("src/", "src/"))))
  .map((path) => ({ path, text: readFileSync(path, "utf8") }));

describe("every notification type has a sender", () => {
  it.each(NOTIFICATION_TYPE_INFO.map((info) => info.type))(
    "%s is produced somewhere",
    (type) => {
      const producers = corpus.filter((file) =>
        file.text.includes(`type: "${type}"`),
      );

      expect(
        producers.length,
        `No code calls notify() with type "${type}". Either wire a sender or ` +
          `remove it from NOTIFICATION_TYPE_INFO, a settings toggle for a ` +
          `notification that cannot arrive is a promise the product does not keep.`,
      ).toBeGreaterThan(0);
    },
  );

  it("checks a corpus that actually contains the senders", () => {
    // Guards the test itself: if the globbing broke, every assertion above
    // would pass vacuously against an empty corpus.
    expect(corpus.length).toBeGreaterThan(50);
    expect(corpus.some((f) => f.path.includes("notifications/scheduled"))).toBe(true);
  });
});
