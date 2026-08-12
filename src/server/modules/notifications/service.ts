import { db } from "@/server/db/client";
import { sendEmail } from "@/server/email";
import { env } from "@/server/env";
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

  const preference = await db.notificationPreference.findUnique({
    where: { profileId_type: { profileId: input.profileId, type: input.type } },
    select: { inApp: true, email: true },
  });

  // An absent row means the member has never touched this setting; fall back to
  // in-app only, never email.
  const inApp = preference?.inApp ?? true;
  const wantsEmail = preference?.email ?? false;

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
      await sendEmail({
        to: profile.user.email,
        subject: input.title,
        text: [
          input.body ?? input.title,
          "",
          input.linkPath ? `${env().APP_URL}${input.linkPath}` : "",
          "",
          "Change what Bunchy emails you about in Settings.",
        ]
          .filter(Boolean)
          .join("\n"),
      }).catch((error) => {
        // A failed notification email must never fail the action that caused it.
        console.error("Notification email failed:", error);
      });
    }
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
    select: { type: true, inApp: true, email: true },
    orderBy: { type: "asc" },
  });
}

export async function setPreference(
  profileId: string,
  type: NotificationType,
  values: { inApp: boolean; email: boolean },
): Promise<void> {
  await db.notificationPreference.upsert({
    where: { profileId_type: { profileId, type } },
    create: { profileId, type, ...values },
    update: values,
  });
}
