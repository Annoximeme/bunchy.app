import type { NotificationType } from "@/generated/prisma/enums";

/**
 * How each notification type is described to the member controlling it.
 *
 * Written from their point of view, "Someone wants to connect", not
 * "CONNECTION_REQUEST", and grouped so the settings screen reads as a set of
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
  group: "People" | "Bunches" | "Activities" | "Your account";
  /** True when a person is waiting, false when it is our idea. */
  person: boolean;
  /**
   * Whether this is worth interrupting somebody's day for.
   *
   * Almost always the same answer as `person`, and the two types where it is
   * not are the whole reason it is a separate field rather than a derivation.
   * "How did it go?" is about something that has already finished, so nobody
   * is waiting and there is nothing to be late for; it can sit in the app.
   *
   * Nothing here reaches anybody who has not granted their browser permission
   * on a device first, so this is not the consent gate. It is the question of
   * what deserves the interruption once consent exists.
   */
  push: boolean;
}

export const NOTIFICATION_TYPE_INFO: readonly NotificationTypeInfo[] = [
  {
    type: "CONNECTION_REQUEST",
    label: "Someone wants to connect",
    description: "A request is waiting for your answer.",
    group: "People",
    person: true,
    push: true,
  },
  {
    type: "CONNECTION_ACCEPTED",
    label: "Your request was accepted",
    description: "You can start talking.",
    group: "People",
    person: true,
    push: true,
  },
  {
    type: "DIRECT_MESSAGE",
    label: "New message",
    description: "Someone you're connected to wrote to you.",
    group: "People",
    person: true,
    push: true,
  },
  {
    type: "BUNCH_INVITE",
    label: "Invited to a bunch",
    description: "Someone thought you'd fit.",
    group: "Bunches",
    person: true,
    push: true,
  },
  {
    type: "BUNCH_JOIN_REQUEST",
    label: "Someone asked to join",
    description: "Only sent to moderators of the bunch.",
    group: "Bunches",
    person: true,
    push: true,
  },
  {
    type: "BUNCH_MESSAGE_REPLY",
    label: "A reply to you",
    description: "Someone replied to something you said.",
    group: "Bunches",
    person: true,
    push: true,
  },
  {
    type: "BUNCH_MENTION",
    label: "You were mentioned",
    description: "Someone used your name in a bunch.",
    group: "Bunches",
    person: true,
    push: true,
  },
  {
    type: "BUNCH_RECOMMENDATION",
    label: "A bunch you might like",
    description: "Our suggestion, not a person waiting. Off by default.",
    group: "Bunches",
    person: false,
    push: false,
  },
  {
    type: "ACTIVITY_INVITE",
    label: "Your bunch planned something",
    description: "A new activity in a bunch you're in.",
    group: "Activities",
    person: true,
    push: true,
  },
  {
    type: "ACTIVITY_REMINDER",
    label: "Something's coming up",
    description: "A reminder shortly before an activity you joined.",
    group: "Activities",
    person: true,
    push: true,
  },
  {
    type: "ACTIVITY_CHANGED",
    label: "An activity changed",
    description: "Moved, cancelled, or a spot opened up for you.",
    group: "Activities",
    person: true,
    push: true,
  },
  {
    /*
      This was missing, and missing here meant switched off everywhere.

      `defaultPreference` treats a type it does not recognise as a suggestion
      and returns silent, so every "How was it?" was created and then dropped
      before it reached anybody. Not one member had a preference row for it,
      because the row is written from this list at signup and the settings
      screen is drawn from this list too, so there was no switch to find.

      That mattered more than one quiet notification. The answer to it is what
      writes ActivityOutcome, which is where the `met_well` signal in the
      matching engine comes from. The loop that makes the next introduction
      better was open at both ends.
    */
    type: "ACTIVITY_FOLLOW_UP",
    label: "How did it go?",
    description:
      "Asked once after something you went to. It is the only message that comes after an activity rather than before it, and the answer is what makes the next suggestion better.",
    group: "Activities",
    person: true,
    // The exception `push` exists for. This is the only notification that
    // comes after the thing rather than before it, so nobody is waiting on the
    // answer and there is nothing to be late for.
    push: false,
  },
  {
    type: "FEEDBACK_ANSWERED",
    label: "We answered your feedback",
    description:
      "Only ever because you wrote to us first. Says what happened to it, including when the answer is no.",
    group: "Your account",
    person: true,
    push: true,
  },
];

export const NOTIFICATION_GROUPS = [
  "People",
  "Bunches",
  "Activities",
  "Your account",
] as const;

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
  push: boolean;
} {
  const info = NOTIFICATION_TYPE_INFO.find((i) => i.type === type);
  // Unknown types are treated as suggestions: silent until asked for.
  //
  // Push follows `person` rather than starting off, and that is not the
  // channel being treated casually. Nothing can be pushed at all until the
  // member has granted the browser permission on that device, which is a
  // deliberate, revocable act with a system prompt attached. Having done it,
  // being told when a person is actually waiting on you is the thing they
  // just asked for; being told about a bunch we thought they would like is
  // not, which is exactly the line `person` already draws.
  return {
    inApp: info?.person ?? false,
    email: false,
    push: info?.push ?? false,
  };
}

export function notificationLabel(type: NotificationType): string {
  return (
    NOTIFICATION_TYPE_INFO.find((i) => i.type === type)?.label ??
    type.toLowerCase().replace(/_/g, " ")
  );
}
