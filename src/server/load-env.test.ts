import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadEnvFiles } from "@/server/load-env";

/**
 * The precedence, pinned.
 *
 * `process.loadEnvFile` keeps the first value it sees rather than the last, so
 * the order of the two filenames is the whole behaviour, and reading the code
 * tells you the opposite of what it does. Four entry points wrote the obvious
 * order and all four silently gave `.env` the last word while their comments
 * claimed `.env.local` had it.
 *
 * A test rather than a comment because the failure is invisible: no error, no
 * warning, just a variable holding the value you were trying to override. The
 * only way to notice is to assert on it.
 */

const KEY = "BUNCHY_LOAD_ENV_FIXTURE";
let dir: string;
let cwd: string;

beforeEach(() => {
  cwd = process.cwd();
  dir = mkdtempSync(join(tmpdir(), "bunchy-env-"));
  process.chdir(dir);
  delete process.env[KEY];
});

afterEach(() => {
  process.chdir(cwd);
  rmSync(dir, { recursive: true, force: true });
  delete process.env[KEY];
});

function write(file: string, value: string) {
  writeFileSync(join(dir, file), `${KEY}=${value}\n`);
}

describe("loadEnvFiles", () => {
  it("gives .env.local the last word over .env", () => {
    write(".env", "from-env");
    write(".env.local", "from-env-local");

    loadEnvFiles();

    expect(process.env[KEY]).toBe("from-env-local");
  });

  it("falls back to .env for keys .env.local does not set", () => {
    write(".env", "from-env");
    writeFileSync(join(dir, ".env.local"), "SOMETHING_ELSE=1\n");

    loadEnvFiles();

    expect(process.env[KEY]).toBe("from-env");
  });

  it("lets the real environment beat both files", () => {
    // This is what makes `DATABASE_URL=... npm run test:integration` work, and
    // it falls out of the same non-overwriting rule that made the order matter.
    process.env[KEY] = "from-the-shell";
    write(".env", "from-env");
    write(".env.local", "from-env-local");

    loadEnvFiles();

    expect(process.env[KEY]).toBe("from-the-shell");
  });

  it("does not mind either file being absent", () => {
    write(".env.local", "only-local");

    expect(() => loadEnvFiles()).not.toThrow();
    expect(process.env[KEY]).toBe("only-local");
  });
});
