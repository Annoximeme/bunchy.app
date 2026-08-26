import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Every module that calls a hook has to say it is a client module.
 *
 * This is not a lint preference, it is a production outage in waiting.
 * TypeScript is perfectly happy with a server component calling `useTranslate`:
 * nothing fails to compile, nothing fails in a test that renders the component
 * directly, and the build succeeds. It throws at render, in production, inside
 * a Suspense boundary, so the reader gets "this page didn't load" and the only
 * trace of the real cause is a line in the server log.
 *
 * It shipped exactly once, on Discover, the page a member opens most, and it
 * shipped because the component looked innocent: adding a translated tooltip to
 * a badge turned a server component into an illegal one.
 */

const HOOK = /\buse[A-Z]\w*\s*\(/;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return entry.name.endsWith(".tsx") || entry.name.endsWith(".ts") ? [path] : [];
  });
}

describe("modules that call hooks", () => {
  it("all declare themselves as client modules", () => {
    const offenders = walk("src")
      .filter((path) => !path.endsWith(".test.ts") && !path.endsWith(".test.tsx"))
      .filter((path) => {
        const source = readFileSync(path, "utf8");
        if (source.trimStart().startsWith('"use client"')) return false;
        // Strip comments, so a hook named in prose does not count as a call.
        const code = source
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/^\s*\/\/.*$/gm, "")
          .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
        // `use` on its own is React's own promise hook and is allowed anywhere;
        // what matters is the camel-cased ones that carry state or context.
        return HOOK.test(code);
      });

    expect(offenders).toEqual([]);
  });
});
