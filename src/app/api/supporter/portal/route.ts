import { handleAuthed } from "@/server/http/route";
import { billingPortalUrl } from "@/server/modules/supporter/service";
import { env } from "@/server/env";

/**
 * A link into Stripe's billing portal, where cancelling takes one click.
 *
 * Deliberately not a cancel endpoint of our own. A cancel flow the operator
 * controls is one the operator can make slow, and /about promises this product
 * does not run on friction.
 */
export async function POST() {
  return handleAuthed(async (viewer) => {
    const url = await billingPortalUrl(
      viewer.userId,
      `${env().APP_URL.replace(/\/$/, "")}/settings/supporter`,
    );
    return { url };
  });
}
