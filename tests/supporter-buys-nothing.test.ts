import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLANS } from "@/server/modules/supporter/service";

/**
 * Money buys cosmetics here, and this is what keeps it that way.
 *
 * /about promises that "a tier that makes the matching better for people who
 * pay would break the only thing this product is for". That sentence is the
 * product's whole pitch about itself, and the pressure on it will not come from
 * somebody deciding to break it — it will come from a reasonable-looking change
 * two years from now that gives supporters a slightly bigger radius, or skips
 * them past a rate limit, in a file nobody thinks of as the paywall.
 *
 * So the rule is enforced by where the supporter module is allowed to be
 * imported: the matching engine, notifications, rate limiting and moderation
 * may not read it at all. A perk cannot become functional if the code that
 * implements function cannot see who paid.
 */

const SRC = join(import.meta.dirname, "..", "src");

/** Everything the product does that decides an outcome for a member. */
const OFF_LIMITS = [
  join("server", "modules", "matching"),
  join("server", "modules", "discovery"),
  join("server", "modules", "recommendations"),
  join("server", "ratelimit"),
  join("server", "modules", "moderation"),
  join("server", "modules", "admin"),
  join("server", "modules", "notifications"),
  join("server", "modules", "availability"),
];

function sourceFiles(dir: string): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("what a supporter buys", () => {
  it("is invisible to everything that decides an outcome", () => {
    const offenders: string[] = [];

    for (const area of OFF_LIMITS) {
      for (const file of sourceFiles(join(SRC, area))) {
        const source = readFileSync(file, "utf8");
        if (/modules\/supporter|supporterCosmetics|supporterUserIds/.test(source)) {
          offenders.push(file.slice(file.indexOf("/src/") + 1));
        }
      }
    }

    expect(
      offenders,
      `these decide what happens to a member and must not know who paid:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("is three cosmetics and nothing else", async () => {
    const { NO_COSMETICS } = await import(
      "@/server/modules/supporter/service"
    );
    // The *shape* is the contract, and asserting it needs no database — which
    // matters now that `supporterCosmetics` reads the role, because staff get
    // the cosmetics complimentary and that must not depend on a Stripe key.
    expect(Object.keys(NO_COSMETICS).sort()).toEqual([
      "appIcons",
      "badge",
      "ring",
      "since",
    ]);
  });

  it("has one price in two shapes, not a ladder of tiers", () => {
    // A three-column pricing table is a device for making the middle column
    // look sensible. There is one thing being sold.
    expect(Object.keys(PLANS).sort()).toEqual(["monthly", "yearly"]);
  });
});

describe("the terms", () => {
  // Collapsed, because JSX wraps a sentence wherever the line length says so
  // and an assertion that depends on where Prettier broke a line is an
  // assertion that fails for the wrong reason.
  const terms = readFileSync(
    join(SRC, "app", "(legal)", "terms", "page.tsx"),
    "utf8",
  ).replace(/\s+/g, " ");

  it("say how to stop paying, since the code can take money", () => {
    // The clause has to exist before the switch is flipped, not after somebody
    // asks for a refund. This test is what couples the two.
    expect(terms).toMatch(/Cancelling takes one click/);
  });

  it("carry the fourteen-day withdrawal right", () => {
    // A Belgian sole trader selling a digital subscription to EU consumers.
    expect(terms).toMatch(/fourteen-day right of withdrawal/);
  });

  it("say the product stays free", () => {
    expect(terms).toMatch(/buys nothing functional/);
  });
});
