import Stripe from "stripe";
import { db } from "@/server/db/client";
import { env, supporterEnabled } from "@/server/env";
import { AppError, validationFailed } from "@/server/errors";
import type { SupporterStatus } from "@/generated/prisma/enums";

/**
 * Supporters — the tip jar.
 *
 * ## What money may and may not buy
 *
 * Cosmetics, exhaustively: a badge, a ring on an avatar, a choice of app icon.
 * Nothing this module writes is read by the matching engine, by notifications,
 * by rate limits or by moderation, and `supporterCosmetics` is the only thing
 * it exports for the rest of the product to consume — a shape with three
 * booleans in it and no way to express an advantage.
 *
 * That constraint is published: /about says a tier that makes the matching
 * better for people who pay "would break the only thing this product is for".
 * A perk with any functional effect makes that sentence false, so the boundary
 * is kept narrow enough to see in one function.
 *
 * ## Where the money goes, in the order promised
 *
 * /about also says that if Bunchy earns money, paying the volunteers who keep
 * it safe is the first thing that money should do — before features, before
 * marketing, before anyone takes a salary. The page built on top of this module
 * lists the three destinations in that order rather than in the order a pitch
 * deck would.
 *
 * ## Off unless fully configured
 *
 * Every entry point checks `supporterEnabled()`. A deploy with a secret key but
 * no webhook secret would take payments whose confirmation never arrives — a
 * subscription that exists at Stripe and not here, where the member has paid
 * and the product does not know. All five variables or none.
 */

/** The single price of the thing, in the only two shapes it comes in. */
export const PLANS = {
  monthly: { label: "Monthly", amount: 400, suffix: "a month" },
  yearly: { label: "Yearly", amount: 3840, suffix: "a year" },
} as const;

export type PlanKey = keyof typeof PLANS;

let client: Stripe | undefined;

function stripe(): Stripe {
  if (!supporterEnabled()) {
    throw new AppError("internal", "Supporting Bunchy is not open yet.", 503);
  }
  client ??= new Stripe(env().STRIPE_SECRET_KEY!, {
    // Pinned to the version this code was written against. A payment
    // integration that silently follows the provider's current default is one
    // whose behaviour changes on somebody else's deploy.
    apiVersion: "2026-07-29.dahlia",
    // Bounded, because a hung call here happens while somebody is looking at a
    // spinner with their card details on screen.
    timeout: 12_000,
    maxNetworkRetries: 2,
  });
  return client;
}

/**
 * What a supporter gets. The entire surface, deliberately.
 *
 * Three booleans and a date. There is no field here that any part of the
 * product could read to treat one member's evening as more important than
 * another's, and that is the point of returning a shape rather than the row.
 */
export interface SupporterCosmetics {
  /** Draw the badge beside their name. */
  badge: boolean;
  /** Draw the gradient ring around their avatar. */
  ring: boolean;
  /** Let them pick an alternative app icon. */
  appIcons: boolean;
  /** When they first supported, for the thank-you line. Never shown publicly. */
  since: Date | null;
}

/**
 * The empty shape, exported so the guard test can assert it without a database.
 * A fourth key here is a fourth thing money can buy and has to be argued for.
 */
export const NO_COSMETICS: SupporterCosmetics = {
  badge: false,
  ring: false,
  appIcons: false,
  since: null,
};

/** Still paid up, including inside a period they have already cancelled. */
function isCurrent(status: SupporterStatus, periodEnd: Date | null): boolean {
  if (status === "ACTIVE" || status === "PAST_DUE") return true;
  // Cancelled but paid until the end of the period. They bought the month.
  return periodEnd !== null && periodEnd > new Date();
}

export async function supporterCosmetics(
  userId: string,
): Promise<SupporterCosmetics> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      createdAt: true,
      supporter: {
        select: { status: true, currentPeriodEnd: true, since: true },
      },
    },
  });
  if (!user) return NO_COSMETICS;

  /*
   * Staff get it complimentary, and that is checked before the payment state
   * and before `supporterEnabled()`. The volunteers read the report queue for
   * nothing; charging them for a ring while they do it would be a strange way
   * to say thank you, and a moderator's cosmetics should not switch off because
   * a Stripe key is missing.
   *
   * They still get the *staff* mark rather than the supporter one — see
   * `NameMarks`. Complimentary means the perks, not the claim.
   */
  if (user.role !== "MEMBER") {
    return { badge: true, ring: true, appIcons: true, since: user.createdAt };
  }

  if (!supporterEnabled()) return NO_COSMETICS;

  const row = user.supporter;
  if (!row || !isCurrent(row.status, row.currentPeriodEnd)) return NO_COSMETICS;

  return { badge: true, ring: true, appIcons: true, since: row.since };
}

/** The same question for a page full of people, in one query. */
export async function supporterUserIds(
  userIds: string[],
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();

  const rows = await db.user.findMany({
    where: {
      id: { in: userIds },
      OR: [
        // Staff, complimentary.
        { role: { not: "MEMBER" } },
        {
          supporter: {
            OR: [
              { status: { in: ["ACTIVE", "PAST_DUE"] } },
              { currentPeriodEnd: { gt: new Date() } },
            ],
          },
        },
      ],
    },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

async function customerFor(
  userId: string,
  email: string,
): Promise<string> {
  const existing = await db.supporter.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });
  if (existing) return existing.stripeCustomerId;

  const customer = await stripe().customers.create({
    email,
    // The only identifier that leaves here. No display name, no location, no
    // interests — Stripe is a payment processor and has no reason to hold a
    // social graph.
    metadata: { userId },
  });

  await db.supporter.create({
    data: { userId, stripeCustomerId: customer.id, status: "ENDED" },
  });

  return customer.id;
}

/**
 * Start a subscription and hand back the secret the browser confirms with.
 *
 * `default_incomplete` is what makes this safe: Stripe creates the subscription
 * in a state that grants nothing until the payment actually succeeds, and the
 * webhook is what flips this side over. Nothing in this function marks anybody
 * a supporter — a code path that did would be one that could be reached by a
 * request that never paid.
 */
export async function startSubscription(
  userId: string,
  email: string,
  plan: PlanKey,
): Promise<{ clientSecret: string; publishableKey: string }> {
  const config = env();
  const price =
    plan === "yearly" ? config.STRIPE_PRICE_YEARLY : config.STRIPE_PRICE_MONTHLY;
  if (!price) throw validationFailed("That plan is not available.");

  const customerId = await customerFor(userId, email);

  // An existing live subscription is changed in the billing portal, not by
  // stacking a second one on top of it.
  const current = await db.supporter.findUnique({
    where: { userId },
    select: { status: true },
  });
  if (current && (current.status === "ACTIVE" || current.status === "PAST_DUE")) {
    throw validationFailed(
      "You are already supporting Bunchy. Change or cancel it in Manage billing.",
    );
  }

  const subscription = await stripe().subscriptions.create({
    customer: customerId,
    items: [{ price }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.confirmation_secret"],
    metadata: { userId },
  });

  const invoice = subscription.latest_invoice;
  const secret =
    typeof invoice === "object" && invoice
      ? invoice.confirmation_secret?.client_secret
      : null;

  if (!secret) {
    throw new AppError(
      "internal",
      "Stripe did not return a way to complete this payment.",
      502,
    );
  }

  await db.supporter.update({
    where: { userId },
    data: { stripeSubscriptionId: subscription.id },
  });

  return { clientSecret: secret, publishableKey: config.STRIPE_PUBLISHABLE_KEY! };
}

/**
 * A link into Stripe's billing portal.
 *
 * Cancelling happens there, in one click, with no email to send and nobody to
 * ask. That is a guardrail rather than a convenience: a cancel flow the
 * operator controls is a cancel flow the operator can make slow, and the whole
 * argument of this product is that it does not rely on friction.
 */
export async function billingPortalUrl(
  userId: string,
  returnTo: string,
): Promise<string> {
  const row = await db.supporter.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });
  if (!row) throw validationFailed("There is no billing account to manage.");

  const session = await stripe().billingPortal.sessions.create({
    customer: row.stripeCustomerId,
    return_url: returnTo,
  });
  return session.url;
}

/**
 * What the member sees on their own settings page.
 *
 * Includes `cancelAtPeriodEnd` and the date, because somebody who has cancelled
 * should be told plainly that they keep what they paid for until it runs out,
 * rather than wondering why the badge is still there.
 */
export async function mySupport(userId: string) {
  if (!supporterEnabled()) return null;

  const row = await db.supporter.findUnique({
    where: { userId },
    select: {
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      since: true,
      stripeSubscriptionId: true,
    },
  });
  if (!row || !row.stripeSubscriptionId) return null;

  return {
    status: row.status,
    current: isCurrent(row.status, row.currentPeriodEnd),
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    since: row.since,
  };
}

/** Stripe's word for it, mapped to ours. Anything unknown ends the perks. */
export function statusFromStripe(value: string): SupporterStatus {
  if (value === "active" || value === "trialing") return "ACTIVE";
  if (value === "past_due" || value === "unpaid") return "PAST_DUE";
  return "ENDED";
}

/**
 * Apply what Stripe just told us.
 *
 * The only path that grants cosmetics, and it is reachable only from a
 * signature-verified webhook. Keyed on the customer id rather than on anything
 * in the request body a caller could choose.
 */
export async function applySubscriptionState(subscription: {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  currentPeriodEnd: Date | null;
}): Promise<void> {
  const row = await db.supporter.findUnique({
    where: { stripeCustomerId: subscription.customer },
    select: { userId: true, status: true },
  });
  // A customer we have never seen is not an error worth failing the webhook
  // over — Stripe would retry it forever. Logged and acknowledged.
  if (!row) {
    console.warn(
      `stripe webhook: no supporter row for customer ${subscription.customer}`,
    );
    return;
  }

  const status = statusFromStripe(subscription.status);

  await db.supporter.update({
    where: { userId: row.userId },
    data: {
      stripeSubscriptionId: subscription.id,
      status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: subscription.currentPeriodEnd,
      // `since` is set once, on the first activation, and never moved by a
      // later cancellation and restart. Somebody who has supported this on and
      // off for two years has supported it for two years.
      ...(status === "ACTIVE" && row.status === "ENDED"
        ? { since: new Date() }
        : {}),
    },
  });
}

export { stripe as stripeClient };
