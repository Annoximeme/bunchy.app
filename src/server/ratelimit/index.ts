import { db } from "@/server/db/client";
import { rateLimited } from "@/server/errors";

/**
 * Fixed-window rate limiting behind a store interface.
 *
 * The database store is correct across multiple instances and needs no extra
 * infrastructure, which is the right trade for MVP traffic. Swapping in Redis
 * later means implementing `RateLimitStore` and changing one line in
 * `defaultStore`, no caller changes.
 */
export interface RateLimitStore {
  /** Increments the counter for `key` in the current window and returns the new count. */
  hit(key: string, windowMs: number): Promise<number>;
}

export interface RateLimitRule {
  /** Maximum number of hits allowed inside the window. */
  limit: number;
  windowMs: number;
}

export const RULES = {
  signup: { limit: 5, windowMs: 60 * 60 * 1000 },
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  passwordReset: { limit: 5, windowMs: 60 * 60 * 1000 },
  // Asking us to send the confirmation mail again.
  //
  // Every other route that puts a message on the wire is already bounded,
  // signup, password reset, and everything behind `notify`, which a member can
  // switch off. This one was not, and being signed in is not a reason to trust
  // it: an account holding the button down is an outbound mail flood from our
  // domain to an address of their choosing. The cost lands on the domain's
  // sending reputation, and the people it hurts are whoever needs a password
  // reset to arrive afterwards.
  //
  // Five an hour is more than anybody clicks in earnest.
  emailVerification: { limit: 5, windowMs: 60 * 60 * 1000 },
  // Submitting an emailed token, a reset link or a confirmation link.
  //
  // The tokens are 256 bits of randomness, so this is not what stops them
  // being guessed; nothing needs to, at that size. It is here so that an
  // unauthenticated endpoint cannot be held open indefinitely by a script, and
  // so a burst of failures against it is visible as a refusal rather than as
  // load nobody attributed.
  tokenSubmission: { limit: 20, windowMs: 60 * 60 * 1000 },
  // Feedback about the product. Generous on purpose: somebody with five real
  // things to say in one evening is the best kind of member to have, and
  // telling them to come back tomorrow is how you get four of them.
  feedback: { limit: 20, windowMs: 24 * 60 * 60 * 1000 },
  connectionRequest: { limit: 30, windowMs: 24 * 60 * 60 * 1000 },
  message: { limit: 60, windowMs: 60 * 1000 },
  bunchCreate: { limit: 5, windowMs: 24 * 60 * 60 * 1000 },
  activityCreate: { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
  report: { limit: 20, windowMs: 24 * 60 * 60 * 1000 },
  assistant: { limit: 40, windowMs: 60 * 60 * 1000 },
  // Far more than anyone needs, and still a ceiling on how fast a loop can
  // write 256KB files onto the volume.
  avatarUpload: { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
  // The one endpoint reachable before launch without a session, so it is the
  // one most worth a ceiling. Generous enough for a shared office, tight
  // enough that nobody fills the list from a script.
  waitlist: { limit: 8, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;

export type RuleName = keyof typeof RULES;

class DatabaseRateLimitStore implements RateLimitStore {
  async hit(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
    const expiresAt = new Date(windowStart.getTime() + windowMs * 2);

    const row = await db.rateLimitCounter.upsert({
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart, count: 1, expiresAt },
      update: { count: { increment: 1 } },
    });

    return row.count;
  }
}

/**
 * In-memory store for tests and single-process development. Not safe across
 * instances, which is exactly why it is not the default.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly counters = new Map<string, number>();

  async hit(key: string, windowMs: number): Promise<number> {
    const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
    const composite = `${key}:${windowStart}`;
    const next = (this.counters.get(composite) ?? 0) + 1;
    this.counters.set(composite, next);
    return next;
  }

  reset() {
    this.counters.clear();
  }
}

let store: RateLimitStore = new DatabaseRateLimitStore();

/** Test seam. */
export function setRateLimitStore(next: RateLimitStore) {
  store = next;
}

/**
 * Consumes one unit against `rule` for `subject` (a user id, profile id or
 * hashed IP). Throws `rate_limited` when the window is exhausted.
 */
export async function consume(
  rule: RuleName,
  subject: string,
): Promise<void> {
  const { limit, windowMs } = RULES[rule];
  const count = await store.hit(`${rule}:${subject}`, windowMs);
  if (count > limit) throw rateLimited();
}

/** Best-effort cleanup of expired windows. Safe to call from a cron job. */
export async function pruneExpired(): Promise<number> {
  const { count } = await db.rateLimitCounter.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
