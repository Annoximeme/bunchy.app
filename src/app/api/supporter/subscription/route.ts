import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { startSubscription } from "@/server/modules/supporter/service";
import { consume } from "@/server/ratelimit";

const schema = z.object({ plan: z.enum(["monthly", "yearly"]) });

/**
 * Begin a subscription and return the secret the browser confirms with.
 *
 * Grants nothing. The subscription is created `default_incomplete` and only the
 * signature-verified webhook marks anybody a supporter, so a request that never
 * pays leaves no trace but a Stripe customer.
 */
export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    const { plan } = await parseJson(request, schema);
    // Each call creates a customer or a subscription at Stripe. Bounded on the
    // account rather than the address so a loop cannot fill somebody's
    // dashboard with abandoned intents.
    await consume("message", viewer.profileId);
    return startSubscription(viewer.userId, viewer.email, plan);
  });
}
