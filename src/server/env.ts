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
  // No AI keys, by design. Bunchy's assistant is deterministic and runs
  // in-process, so there is no variable here that could put the product on a
  // metered API — see `modules/ai/provider.ts`.
  EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  EMAIL_FROM: z.string().default("Bunchy <hello@bunchy.app>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
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
    // Refused at boot rather than at the moment someone is locked out of their
    // account and the reset mail has nowhere to go.
    if (env.EMAIL_PROVIDER === "smtp" && !env.SMTP_HOST) {
      throw new Error(
        'EMAIL_PROVIDER is "smtp" but SMTP_HOST is not set.',
      );
    }
    if (env.EMAIL_PROVIDER === "console") {
      console.warn(
        "[email] EMAIL_PROVIDER is \"console\" in production: verification " +
          "and password-reset mail will be written to the log and never sent.",
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
