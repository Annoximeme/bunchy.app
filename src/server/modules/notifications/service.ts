import { db } from "@/server/db/client";
import { sendEmail } from "@/server/email";
import { notificationEmail } from "@/server/email/templates";
import { env } from "@/server/env";
import { defaultPreference } from "@/lib/notifications";
import { isBlockedBetween } from "@/server/modules/moderation/service";
import { sendPush } from "@/server/modules/notifications/push";
import type { NotificationType } from "@/generated/prisma/enums";

/**
 * Notifications.
 *
 * The rule this module enforces is that a notification must correspond to
 * something a *person* did that involves you. There is no API here for
 * "we noticed you haven't been back", no digest of activity you did not ask
 * about, and no way to notify someone about their own action. If a future
 * feature wants to nudge people back into the app, it will have to add a new
 * path rather than quietly reuse this one.
 */

export interface NotifyInput {
  profileId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkPath?: string;
  /** Collapses repeats: five messages in one conversation is one notification. */
  groupKey?: string;
  /** Set when the notification would be about the recipient's own action. */
  actorProfileId?: string;
}

/** Repeats inside this window update the existing row instead of adding one. */
const COLLAPSE_WINDOW_MS = 60 * 60 * 1000;

export async function notify(input: NotifyInput): Promise<void> {
  if (input.actorProfileId && input.actorProfileId === input.profileId) return;

  // A block means you stop hearing from that person, and this is the one place
  // every producer already passes through, so it is the only place the rule can
  // be made true for producers that do not exist yet.
  //
  // The services that perform a directed action check the block themselves and
  // refuse before writing anything, which is the right layer for that: an
  // invite suppressed only here would leave a real membership row the recipient
  // could still see. This check is the backstop underneath them, and it is what
  // catches the indirect cases nobody thinks to guard, a shared bunch, a
  // mention, a reply in a thread the blocked person is also in.
  //
  // Checked in both directions, because the blocker is the one owed the
  // silence and the blocked person is the one owed no signal that anything
  // happened. Only when an actor is named: a reminder about your own activity
  // has nobody to be blocked by, and paying for a lookup on every one of those
  // would be a query per notification for nothing.
  if (
    input.actorProfileId &&
    (await isBlockedBetween(input.profileId, input.actorProfileId))
  ) {
    return;
  }

  const preference = await db.notificationPreference.findUnique({
    where: { profileId_type: { profileId: input.profileId, type: input.type } },
    select: { inApp: true, email: true, push: true },
  });

  // An absent row means the member has never touched this setting. The fallback
  // is the same one the settings screen draws, so what they see is what they
  // get, a suggestion type stays silent until it is switched on.
  const fallback = defaultPreference(input.type);
  const inApp = preference?.inApp ?? fallback.inApp;
  const wantsEmail = preference?.email ?? fallback.email;
  const wantsPush = preference?.push ?? fallback.push;

  if (inApp) {
    const existing = input.groupKey
      ? await db.notification.findFirst({
          where: {
            profileId: input.profileId,
            groupKey: input.groupKey,
            readAt: null,
            createdAt: { gte: new Date(Date.now() - COLLAPSE_WINDOW_MS) },
          },
          select: { id: true },
        })
      : null;

    if (existing) {
      await db.notification.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          body: input.body ?? null,
          createdAt: new Date(),
        },
      });
    } else {
      await db.notification.create({
        data: {
          profileId: input.profileId,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          linkPath: input.linkPath ?? null,
          groupKey: input.groupKey ?? null,
        },
      });
    }
  }

  if (wantsEmail) {
    const profile = await db.profile.findUnique({
      where: { id: input.profileId },
      select: { user: { select: { email: true } } },
    });
    if (profile?.user.email) {
      const appUrl = env().APP_URL.replace(/\/$/, "");
      await sendEmail({
        to: profile.user.email,
        ...notificationEmail({
          title: input.title,
          body: input.body,
          link: input.linkPath ? `${appUrl}${input.linkPath}` : undefined,
          settingsUrl: `${appUrl}/profile`,
          unsubscribe: { kind: "notifications", profileId: input.profileId },
        }),
      }).catch((error) => {
        // A failed notification email must never fail the action that caused it.
        console.error("Notification email failed:", error);
      });
    }
  }

  if (wantsPush) {
    // Same rule as the email above: never let a delivery problem fail the
    // action. `sendPush` already swallows its own failures, and this is the
    // belt to that pair of braces.
    await sendPush(input.profileId, {
      title: input.title,
      body: input.body,
      linkPath: input.linkPath,
      // The same key that collapses repeats in the database collapses them on
      // the device, so five messages in one conversation is one banner there
      // too rather than five.
      tag: input.groupKey,
    }).catch((error) => {
      console.error("Push notification failed:", error);
    });
  }
}

export async function listNotifications(profileId: string, limit = 30) {
  return db.notification.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      linkPath: true,
      readAt: true,
      createdAt: true,
    },
  });
}

export async function unreadCount(profileId: string): Promise<number> {
  return db.notification.count({ where: { profileId, readAt: null } });
}

export async function markRead(
  profileId: string,
  notificationId: string,
): Promise<void> {
  await db.notification.updateMany({
    where: { id: notificationId, profileId },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(profileId: string): Promise<void> {
  await db.notification.updateMany({
    where: { profileId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function getPreferences(profileId: string) {
  return db.notificationPreference.findMany({
    where: { profileId },
    select: { type: true, inApp: true, email: true, push: true },
    orderBy: { type: "asc" },
  });
}

export async function setPreference(
  profileId: string,
  type: NotificationType,
  values: { inApp: boolean; email: boolean; push: boolean },
): Promise<void> {
  await db.notificationPreference.upsert({
    where: { profileId_type: { profileId, type } },
    create: { profileId, type, ...values },
    update: values,
  });
}
