import webpush from "web-push";
import { db } from "@/server/db/client";
import { env, pushEnabled } from "@/server/env";

/**
 * Web push: the only channel that reaches somebody who is not looking.
 *
 * In-app notifications require the member to already be here, and email is
 * where the notification about the thing starting in an hour arrives some time
 * after it started. Someone who installed the app from `manifest.ts` got
 * nothing at all when a plan they had joined was about to begin, which is the
 * one moment a notification is genuinely worth an interruption.
 *
 * ## The consent model
 *
 * Three gates, and all three must be open. The browser's own permission
 * prompt, which nothing here can bypass; a subscription row, which only exists
 * because somebody granted that permission on that device; and the per-type
 * switch alongside in-app and email, so "tell me when a person is waiting" and
 * "tell me about a bunch you thought I'd like" stay separate decisions.
 *
 * ## Failure
 *
 * Push endpoints die quietly and permanently: an uninstalled browser answers
 * 404 or 410 for ever. Those two statuses are the push service saying the
 * subscription is gone, so the row is marked and stops being tried. Anything
 * else is treated as transient and left alone, because deleting a subscription
 * on a timeout would unsubscribe somebody for being on a train.
 */

let configured = false;

function configure(): boolean {
  if (!pushEnabled()) return false;
  if (!configured) {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env();
    webpush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body?: string;
  /** Where tapping it should land. */
  linkPath?: string;
  /** Collapses repeats on the device the way `groupKey` does in the database. */
  tag?: string;
}

/**
 * Deliver to every live subscription this member has.
 *
 * Never throws. A notification that could not be pushed must not fail the
 * action that caused it, exactly as the notification email must not: somebody
 * should still get connected when their friend's old phone has an endpoint
 * that no longer answers.
 */
export async function sendPush(
  profileId: string,
  payload: PushPayload,
): Promise<void> {
  if (!configure()) return;

  const subscriptions = await db.pushSubscription.findMany({
    where: { profileId, failedAt: null },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
          { TTL: 60 * 60 },
        );
        await db.pushSubscription
          .update({
            where: { id: subscription.id },
            data: { lastUsedAt: new Date() },
          })
          .catch(() => {});
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.pushSubscription
            .update({
              where: { id: subscription.id },
              data: { failedAt: new Date() },
            })
            .catch(() => {});
        } else {
          console.error("Push delivery failed:", error);
        }
      }
    }),
  );
}

/** Records the browser's subscription, or refreshes one it already had. */
export async function savePushSubscription(input: {
  profileId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<void> {
  await db.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    // A re-subscribe is how a browser recovers a dead endpoint, and how a
    // second person signing in on a shared device takes it over. Both mean the
    // row's owner and keys are whatever arrived just now.
    update: {
      profileId: input.profileId,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent ?? null,
      failedAt: null,
    },
    create: {
      profileId: input.profileId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent ?? null,
    },
  });
}

/** Forgets one browser. Scoped to the member so an endpoint is not a handle. */
export async function removePushSubscription(
  profileId: string,
  endpoint: string,
): Promise<void> {
  await db.pushSubscription.deleteMany({ where: { profileId, endpoint } });
}
