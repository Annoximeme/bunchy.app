import { z } from "zod";

/**
 * Validated server environment.
 *
 * Fails fast and loudly at boot rather than producing confusing runtime errors
 * three layers deep. Never import this from client components — it would leak
 * secrets into the browser bundle.
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().optional(),
  AI_PROVIDER: z.enum(["local", "anthropic"]).default("local"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),
  EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  EMAIL_FROM: z.string().default("Bunchy <hello@bunchy.app>"),
  APP_URL: z.string().default("http://localhost:3000"),
});

/**
 * `next build` evaluates route modules to collect page data. That runs with
 * NODE_ENV=production but legitimately has no runtime secrets — a build machine
 * should not need the session key. Shape validation still applies; only the
 * secret assertions are deferred to the first real server start.
 */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid server environment:\n${issues}`);
  }

  const env = parsed.data;

  if (env.NODE_ENV === "production" && !isBuildPhase()) {
    if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) {
      throw new Error(
        "AUTH_SECRET must be set to at least 32 characters in production.",
      );
    }
    if (env.AI_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
      throw new Error(
        'AI_PROVIDER is "anthropic" but ANTHROPIC_API_KEY is not set.',
      );
    }
  }

  return env;
}

let cached: ReturnType<typeof load> | undefined;

export function env() {
  cached ??= load();
  return cached;
}

/**
 * Development-only fallback so a fresh clone runs without ceremony.
 *
 * Guarded twice: `load()` refuses to boot a production server without a real
 * secret, and this throws outright rather than ever handing back the
 * development value in production — the build-phase exemption above must not
 * become a way to ship with a known key.
 */
export function authSecret(): string {
  const configured = env().AUTH_SECRET;
  if (configured && configured.length >= 32) return configured;

  if (env().NODE_ENV === "production" && !isBuildPhase()) {
    throw new Error("AUTH_SECRET is missing or too short in production.");
  }

  return "bunchy-insecure-development-secret-do-not-use-in-production";
}
