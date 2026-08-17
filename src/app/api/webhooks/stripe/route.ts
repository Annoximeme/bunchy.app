import { env, supporterEnabled } from "@/server/env";
import {
  applySubscriptionState,
  stripeClient,
} from "@/server/modules/supporter/service";

/**
 * Stripe telling us what happened to a subscription.
 *
 * The only path in the product that grants supporter cosmetics, which is why
 * everything about it is defensive.
 *
 * **The signature is checked against the raw bytes.** `constructEvent` is given
 * `request.text()` and never a parsed-then-restringified body: `JSON.parse`
 * followed by `JSON.stringify` drops insignificant whitespace, and the
 * signature is over the bytes. Same reasoning as the Resend webhook next door.
 *
 * **Unconfigured means refuse, not accept.** An endpoint that processed
 * unsigned subscription events would be a way for anybody to hand themselves a
 * badge, which is small, and to write arbitrary rows into a billing table,
 * which is not.
 *
 * **Unknown events are acknowledged and dropped.** Stripe resends anything it
 * does not get a 2xx for and eventually disables the endpoint, so answering 200
 * to the events we do not act on is what keeps the ones we do act on arriving.
 */
export async function POST(request: Request) {
  if (!supporterEnabled()) {
    return new Response("Not configured.", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Unsigned.", { status: 400 });

  const body = await request.text();

  let event;
  try {
    event = stripeClient().webhooks.constructEvent(
      body,
      signature,
      env().STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    console.warn("stripe webhook: rejected", error);
    return new Response("Rejected.", { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const item = subscription.items?.data?.[0];
      await applySubscriptionState({
        id: subscription.id,
        customer:
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        // Lives on the item rather than the subscription in current API
        // versions. Null rather than a guess if it is absent: this date decides
        // how long somebody keeps what they paid for.
        currentPeriodEnd: item?.current_period_end
          ? new Date(item.current_period_end * 1000)
          : null,
      });
      break;
    }
    default:
      break;
  }

  return new Response("OK", { status: 200 });
}
