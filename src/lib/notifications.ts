import type { NotificationType } from "@/generated/prisma/enums";

/**
 * How each notification type is described to the member controlling it.
 *
 * Written from their point of view — "Someone wants to connect", not
 * "CONNECTION_REQUEST" — and grouped so the settings screen reads as a set of
 * decisions rather than a dump of enum values.
 *
 * The `person` flag marks notifications where a human is actually waiting on
 * you. Those are the ones defaulted on; everything else is a suggestion we
 * thought of, and starts off.
 */
export interface NotificationTypeInfo {
  type: NotificationType;
  label: string;
  description: string;
  group: "People" | "Bunches" | "Activities";
  /** True when a person is waiting, false when it is our idea. */
  person: boolean;
}

export const NOTIFICATION_TYPE_INFO: readonly NotificationTypeInfo[] = [
  {
    type: "CONNECTION_REQUEST",
    label: "Someone wants to connect",
    description: "A request is waiting for your answer.",
    group: "People",
    person: true,
  },
  {
    type: "CONNECTION_ACCEPTED",
    label: "Your request was accepted",
    description: "You can start talking.",
    group: "People",
    person: true,
  },
  {
    type: "DIRECT_MESSAGE",
    label: "New message",
    description: "Someone you're connected to wrote to you.",
    group: "People",
    person: true,
  },
  {
    type: "BUNCH_INVITE",
    label: "Invited to a bunch",
    description: "Someone thought you'd fit.",
    group: "Bunches",
    person: true,
  },
  {
    type: "BUNCH_JOIN_REQUEST",
    label: "Someone asked to join",
    description: "Only sent to moderators of the bunch.",
    group: "Bunches",
    person: true,
  },
  {
    type: "BUNCH_MESSAGE_REPLY",
    label: "A reply to you",
    description: "Someone replied to something you said.",
    group: "Bunches",
    person: true,
  },
  {
    type: "BUNCH_MENTION",
    label: "You were mentioned",
    description: "Someone used your name in a bunch.",
    group: "Bunches",
    person: true,
  },
  {
    type: "BUNCH_RECOMMENDATION",
    label: "A bunch you might like",
    description: "Our suggestion, not a person waiting. Off by default.",
    group: "Bunches",
    person: false,
  },
  {
    type: "ACTIVITY_INVITE",
    label: "Your bunch planned something",
    description: "A new activity in a bunch you're in.",
    group: "Activities",
    person: true,
  },
  {
    type: "ACTIVITY_REMINDER",
    label: "Something's coming up",
    description: "A reminder shortly before an activity you joined.",
    group: "Activities",
    person: true,
  },
  {
    type: "ACTIVITY_CHANGED",
    label: "An activity changed",
    description: "Moved, cancelled, or a spot opened up for you.",
    group: "Activities",
    person: true,
  },
];

export const NOTIFICATION_GROUPS = ["People", "Bunches", "Activities"] as const;

/**
 * What a member gets before they have ever opened the settings screen.
 *
 * Both the sender and the settings UI read this, and that is the point. When
 * the default lived in two places they disagreed: the screen drew the
 * suggestion switch off while the sender delivered the suggestion anyway. A
 * control that misreports what the system is doing is worse than no control.
 */
export function defaultPreference(type: NotificationType): {
  inApp: boolean;
  email: boolean;
} {
  const info = NOTIFICATION_TYPE_INFO.find((i) => i.type === type);
  // Unknown types are treated as suggestions: silent until asked for.
  return { inApp: info?.person ?? false, email: false };
}

export function notificationLabel(type: NotificationType): string {
  return (
    NOTIFICATION_TYPE_INFO.find((i) => i.type === type)?.label ??
    type.toLowerCase().replace(/_/g, " ")
  );
}
