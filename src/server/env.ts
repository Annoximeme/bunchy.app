import { z } from "zod";

/**
 * Validated server environment.
 *
 * Fails fast and loudly at boot rather than producing confusing runtime errors
 * three layers deep. Never import this from client components, it would leak
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
  // metered API, see `modules/assistant/provider.ts`.
  EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  EMAIL_FROM: z.string().default("Bunchy <hello@bunchy.app>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  APP_URL: z.string().default("http://localhost:3000"),
  /**
   * Bypass for the public on/off gate. Caddy recognises exactly this value in
   * a `bunchy_preview` cookie; the admin dashboard sets that cookie when it
   * takes the site down, so whoever flipped the switch is not locked out by it.
   * Unset means the dashboard refuses to turn the gate on at all.
   */
  PREVIEW_TOKEN: z.string().optional(),
  /**
   * Signing secret for the provider's bounce/complaint webhook, as
   * `whsec_...`. Unset means the endpoint refuses every request rather than
   * trusting unsigned ones, an unauthenticated endpoint that suppresses
   * addresses is a way for anybody to stop somebody else's password reset.
   */
  RESEND_WEBHOOK_SECRET: z.string().optional(),

  /* --- Supporters -------------------------------------------------------
   *
   * Every one of these is optional, and the whole programme is off until they
   * are all present. That is deliberate: a half-configured payment integration
   * is the one kind of half-configured thing that can take somebody's money and
   * not know what to do with it. `supporterEnabled()` is the single check, and
   * the UI, the API routes and the webhook all read it rather than each
   * deciding for themselves.
   */
  STRIPE_SECRET_KEY: z.string().optional(),
  /** Safe to ship to the browser. Everything else here must never be. */
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_MONTHLY: z.string().optional(),
  STRIPE_PRICE_YEARLY: z.string().optional(),
});

/**
 * `next build` evaluates route modules to collect page data. That runs with
 * NODE_ENV=production but legitimately has no runtime secrets, a build machine
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
 * Test seam. Drops the memoised environment so the next `env()` re-reads
 * `process.env`.
 *
 * The cache is process-wide and deliberately so, the environment does not
 * change under a running server, and re-validating on every access would be
 * waste. That makes any test asserting on a *different* configuration depend
 * on being the first to call `env()`, which is a test that passes until
 * somebody adds a case above it. Calling this in `beforeEach` removes the
 * ordering dependency.
 */
export function resetEnv(): void {
  cached = undefined;
}

/**
 * Whether the supporter programme is open.
 *
 * All five or none. A deploy holding a secret key but no price ids would render
 * a checkout that cannot charge, and one holding no webhook secret would take
 * payments it never hears the confirmation for, a subscription that exists at
 * Stripe and not here, which is the worst of the failure modes because the
 * member has paid and the product does not know.
 */
export function supporterEnabled(): boolean {
  const config = env();
  return Boolean(
    config.STRIPE_SECRET_KEY &&
      config.STRIPE_PUBLISHABLE_KEY &&
      config.STRIPE_WEBHOOK_SECRET &&
      config.STRIPE_PRICE_MONTHLY &&
      config.STRIPE_PRICE_YEARLY,
  );
}

/**
 * Development-only fallback so a fresh clone runs without ceremony.
 *
 * Guarded twice: `load()` refuses to boot a production server without a real
 * secret, and this throws outright rather than ever handing back the
 * development value in production, the build-phase exemption above must not
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
