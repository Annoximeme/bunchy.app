import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "pg-connection-string";
import { describe, expect, it } from "vitest";

/**
 * The container entrypoint that builds DATABASE_URL.
 *
 * This is tested because it has already failed in production once. A password
 * generated with `openssl rand -base64` contained a `/`, which ends the
 * authority section of a URL, so `prisma migrate deploy` reported
 * `P1013: invalid port number in database URL` while the database sat there
 * perfectly healthy. The fix was to percent-encode; this suite is what stops
 * someone "simplifying" that back out.
 *
 * It runs the real script through `sh` rather than reimplementing it, because
 * a test of a paraphrase of the script proves nothing about the script.
 */

const ENTRYPOINT = fileURLToPath(new URL("../docker/entrypoint.sh", import.meta.url));

/** Runs the entrypoint and returns the DATABASE_URL it handed to the command. */
function resolveUrl(env: Record<string, string>): string {
  return execFileSync(
    "sh",
    [ENTRYPOINT, "sh", "-c", 'printf %s "$DATABASE_URL"'],
    {
      // A clean environment, so a DATABASE_URL in the developer's own shell
      // cannot make a failing case pass.
      env: {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        NODE_ENV: "test",
        ...env,
      },
      encoding: "utf8",
    },
  );
}

const BASE = {
  POSTGRES_USER: "bunchy",
  POSTGRES_PASSWORD: "correct-horse",
  POSTGRES_DB: "bunchy",
};

describe("docker entrypoint", () => {
  it("builds a URL from the parts", () => {
    expect(resolveUrl(BASE)).toBe(
      "postgresql://bunchy:correct-horse@db:5432/bunchy?schema=public",
    );
  });

  it("survives every character that means something in a URL", () => {
    // The full set: the slash that caused the outage, plus the delimiters that
    // would each have broken a different part of the string.
    const password = "a/b@c#d?e:f&g=h+i%j";
    const url = resolveUrl({ ...BASE, POSTGRES_PASSWORD: password });

    const parsed = parse(url);
    expect(parsed.password).toBe(password);
    expect(parsed.host).toBe("db");
    expect(parsed.port).toBe("5432");
    expect(parsed.database).toBe("bunchy");
  });

  it("encodes the user as well as the password", () => {
    const parsed = parse(resolveUrl({ ...BASE, POSTGRES_USER: "bun chy" }));
    expect(parsed.user).toBe("bun chy");
  });

  it("rejects a database name it cannot encode rather than mangling it", () => {
    // Deliberately not encoded: pg-connection-string unescapes the credentials
    // and leaves the path alone, so `bun/chy` encoded would arrive as a
    // database literally named "bun%2Fchy" and connect to nothing.
    expect(() => resolveUrl({ ...BASE, POSTGRES_DB: "bun/chy" })).toThrow();
    expect(() => resolveUrl({ ...BASE, POSTGRES_HOST: "db:5432/x" })).toThrow();
    expect(() => resolveUrl({ ...BASE, POSTGRES_PORT: "54 32" })).toThrow();
  });

  it("lets an explicit DATABASE_URL win, so an external database still works", () => {
    const url = "postgresql://someone:else@managed.example.com:6543/prod";
    expect(resolveUrl({ ...BASE, DATABASE_URL: url })).toBe(url);
  });

  it("honours POSTGRES_HOST and POSTGRES_PORT", () => {
    const parsed = parse(
      resolveUrl({ ...BASE, POSTGRES_HOST: "pg.internal", POSTGRES_PORT: "6432" }),
    );
    expect(parsed.host).toBe("pg.internal");
    expect(parsed.port).toBe("6432");
  });

  it("fails loudly rather than connecting to something half-configured", () => {
    // An empty password must not silently produce `postgresql://bunchy:@db/...`,
    // which is a valid URL that fails much later and much less clearly.
    expect(() => resolveUrl({ ...BASE, POSTGRES_PASSWORD: "" })).toThrow();
    expect(() =>
      resolveUrl({ POSTGRES_USER: "bunchy", POSTGRES_DB: "bunchy" }),
    ).toThrow();
  });
});
