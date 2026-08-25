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
/**
 * Push follows the in-app column.
 *
 * A member has no push subscription at signup, so none of these can reach
 * anybody until they grant the browser permission on a device. What this
 * settles is what happens the moment after they do: the things a person is
 * waiting on arrive, and the suggestions stay where they were, off.
 */
export const NOTIFICATION_DEFAULTS: ReadonlyArray<{
  type: NotificationType;
  inApp: boolean;
  email: boolean;
  push: boolean;
}> = [
  { type: "CONNECTION_REQUEST", inApp: true, email: true, push: true },
  { type: "CONNECTION_ACCEPTED", inApp: true, email: false, push: true },
  { type: "DIRECT_MESSAGE", inApp: true, email: false, push: true },
  { type: "BUNCH_INVITE", inApp: true, email: true, push: true },
  { type: "BUNCH_JOIN_REQUEST", inApp: true, email: false, push: true },
  { type: "BUNCH_MESSAGE_REPLY", inApp: true, email: false, push: true },
  { type: "BUNCH_MENTION", inApp: true, email: false, push: true },
  // Suggestions are opt-in. A recommendation is our idea, not a person waiting.
  { type: "BUNCH_RECOMMENDATION", inApp: false, email: false, push: false },
  { type: "ACTIVITY_INVITE", inApp: true, email: false, push: true },
  { type: "ACTIVITY_REMINDER", inApp: true, email: false, push: true },
  { type: "ACTIVITY_CHANGED", inApp: true, email: false, push: true },
  // Missing until now, which is why it never fired. See the note in
  // src/lib/notifications.ts.
  //
  // Push off, alone among the person-shaped types. "How did it go?" is the one
  // that arrives after the thing rather than before it, so nobody is waiting on
  // the answer and there is nothing to be late for. It can sit in the app.
  { type: "ACTIVITY_FOLLOW_UP", inApp: true, email: false, push: false },
  // An answer to something the member wrote. Email on, because the whole point
  // is that it reaches somebody who has stopped checking.
  { type: "FEEDBACK_ANSWERED", inApp: true, email: true, push: true },
];
