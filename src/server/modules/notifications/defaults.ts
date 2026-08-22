import type { NotificationType } from "@/generated/prisma/enums";

/**
 * Default notification settings for a new member.
 *
 * The bias is deliberate: notify when a *person* is waiting on you, stay quiet
 * otherwise. Nothing that exists to pull someone back into the app, no
 * "people are active near you", no re-engagement nudges, is on by default, and
 * email is off for everything except the two events you would want to know
 * about while away.
 */
export const NOTIFICATION_DEFAULTS: ReadonlyArray<{
  type: NotificationType;
  inApp: boolean;
  email: boolean;
}> = [
  { type: "CONNECTION_REQUEST", inApp: true, email: true },
  { type: "CONNECTION_ACCEPTED", inApp: true, email: false },
  { type: "DIRECT_MESSAGE", inApp: true, email: false },
  { type: "BUNCH_INVITE", inApp: true, email: true },
  { type: "BUNCH_JOIN_REQUEST", inApp: true, email: false },
  { type: "BUNCH_MESSAGE_REPLY", inApp: true, email: false },
  { type: "BUNCH_MENTION", inApp: true, email: false },
  // Suggestions are opt-in. A recommendation is our idea, not a person waiting.
  { type: "BUNCH_RECOMMENDATION", inApp: false, email: false },
  { type: "ACTIVITY_INVITE", inApp: true, email: false },
  { type: "ACTIVITY_REMINDER", inApp: true, email: false },
  { type: "ACTIVITY_CHANGED", inApp: true, email: false },
  // Missing until now, which is why it never fired. See the note in
  // src/lib/notifications.ts.
  { type: "ACTIVITY_FOLLOW_UP", inApp: true, email: false },
  // An answer to something the member wrote. Email on, because the whole point
  // is that it reaches somebody who has stopped checking.
  { type: "FEEDBACK_ANSWERED", inApp: true, email: true },
];
