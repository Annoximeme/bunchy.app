import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `prisma.config.ts` may only import what the migration image actually ships.
 *
 * That image is deliberately minimal. The Dockerfile's `migrate` stage copies
 * `package.json`, `prisma.config.ts`, `prisma/` and `node_modules`, and nothing
 * else, because `prisma migrate deploy` needs the schema engine and the web
 * process has no use for tens of megabytes of it.
 *
 * So an import from `src` in that config file is a deploy that fails, and it
 * fails in a way no local check catches: typecheck passes, the unit suite
 * passes, `next build` passes, and every one of them runs in a working tree
 * where `src` is right there. The break only appears inside the container, at
 * the migrate step, on the machine serving the site.
 *
 * It is a safe failure, `app` waits on `migrate` completing successfully, so a
 * broken config stops the deploy rather than starting a server against a schema
 * it does not match. But safe is not the same as cheap: the deploy is where you
 * find out, and finding out there costs a round trip through a push.
 *
 * This is the check that belongs upstream of that. It reads the config as text
 * rather than importing it, because importing it would load the env files as a
 * side effect and change the environment the rest of the suite runs in.
 */

const CONFIG = join(import.meta.dirname, "..", "prisma.config.ts");

/**
 * Any module specifier that leaves the project's own root files. `src` is the
 * one that has actually happened; `./tests` and `./scripts` are absent from the
 * image for the same reason and would fail identically.
 */
const OUT_OF_IMAGE = /from\s+["'](\.\/|\.\.\/)?(src|tests|scripts)\//g;

describe("prisma.config.ts", () => {
  const source = readFileSync(CONFIG, "utf8");

  it("imports nothing the migration image does not carry", () => {
    const offenders = [...source.matchAll(OUT_OF_IMAGE)].map((m) => m[0]);

    expect(
      offenders,
      "The migrate stage in the Dockerfile copies package.json, " +
        "prisma.config.ts and prisma/ only. Anything this file imports from " +
        "src, tests or scripts is missing at runtime and the deploy stops at " +
        "the migrate step. Write the code out here instead.",
    ).toEqual([]);
  });

  it("still reads .env.local ahead of .env", () => {
    // The duplicated loader is the cost of the constraint above, so the thing
    // most worth pinning is that the copy did not drift back to the order that
    // silently discards the override. `src/server/load-env.test.ts` proves the
    // behaviour; this proves this copy asks for it.
    const order = source.match(/\[\s*"\.env\.local"\s*,\s*"\.env"\s*\]/);
    expect(
      order,
      'prisma.config.ts must load [".env.local", ".env"] in that order. ' +
        "process.loadEnvFile keeps the first value it sees, so reading .env " +
        "first gives it precedence and the override is discarded in silence.",
    ).not.toBeNull();
  });
});
