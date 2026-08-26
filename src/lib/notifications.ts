import type { NotificationType } from "@/generated/prisma/enums";
import { phrase, type PhraseRef } from "@/lib/i18n/phrase";

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
/** The four headings the settings screen groups the switches under. */
export type NotificationGroup = "people" | "bunches" | "activities" | "account";

export interface NotificationTypeInfo {
  type: NotificationType;
  /**
   * Phrase refs rather than words, because this table is module scope and the
   * language is a fact about a request. The unsubscribe page and the settings
   * screen both render it, in whatever language the reader is in.
   */
  label: PhraseRef;
  description: PhraseRef;
  group: NotificationGroup;
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
    label: phrase("notifications.types.connectionrequest.label"),
    description: phrase("notifications.types.connectionrequest.description"),
    group: "people",
    person: true,
    push: true,
  },
  {
    type: "CONNECTION_ACCEPTED",
    label: phrase("notifications.types.connectionaccepted.label"),
    description: phrase("notifications.types.connectionaccepted.description"),
    group: "people",
    person: true,
    push: true,
  },
  {
    type: "DIRECT_MESSAGE",
    label: phrase("notifications.types.directmessage.label"),
    description: phrase("notifications.types.directmessage.description"),
    group: "people",
    person: true,
    push: true,
  },
  {
    type: "BUNCH_INVITE",
    label: phrase("notifications.types.bunchinvite.label"),
    description: phrase("notifications.types.bunchinvite.description"),
    group: "bunches",
    person: true,
    push: true,
  },
  {
    type: "BUNCH_JOIN_REQUEST",
    label: phrase("notifications.types.bunchjoinrequest.label"),
    description: phrase("notifications.types.bunchjoinrequest.description"),
    group: "bunches",
    person: true,
    push: true,
  },
  {
    type: "BUNCH_MESSAGE_REPLY",
    label: phrase("notifications.types.bunchmessagereply.label"),
    description: phrase("notifications.types.bunchmessagereply.description"),
    group: "bunches",
    person: true,
    push: true,
  },
  {
    type: "BUNCH_MENTION",
    label: phrase("notifications.types.bunchmention.label"),
    description: phrase("notifications.types.bunchmention.description"),
    group: "bunches",
    person: true,
    push: true,
  },
  {
    type: "BUNCH_RECOMMENDATION",
    label: phrase("notifications.types.bunchrecommendation.label"),
    description: phrase("notifications.types.bunchrecommendation.description"),
    group: "bunches",
    person: false,
    push: false,
  },
  {
    type: "ACTIVITY_INVITE",
    label: phrase("notifications.types.activityinvite.label"),
    description: phrase("notifications.types.activityinvite.description"),
    group: "activities",
    person: true,
    push: true,
  },
  {
    type: "ACTIVITY_REMINDER",
    label: phrase("notifications.types.activityreminder.label"),
    description: phrase("notifications.types.activityreminder.description"),
    group: "activities",
    person: true,
    push: true,
  },
  {
    type: "ACTIVITY_CHANGED",
    label: phrase("notifications.types.activitychanged.label"),
    description: phrase("notifications.types.activitychanged.description"),
    group: "activities",
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
    label: phrase("notifications.types.activityfollowup.label"),
    description: phrase("notifications.types.activityfollowup.description"),
    group: "activities",
    person: true,
    // The exception `push` exists for. This is the only notification that
    // comes after the thing rather than before it, so nobody is waiting on the
    // answer and there is nothing to be late for.
    push: false,
  },
  {
    type: "FEEDBACK_ANSWERED",
    label: phrase("notifications.types.feedbackanswered.label"),
    description: phrase("notifications.types.feedbackanswered.description"),
    group: "account",
    person: true,
    push: true,
  },
];

export const NOTIFICATION_GROUPS = [
  "people",
  "bunches",
  "activities",
  "account",
] as const satisfies readonly NotificationGroup[];

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

/**
 * Where this notification type's name lives, for whoever is rendering it.
 *
 * Returns a phrase ref rather than a word: the caller knows the language and
 * this file does not. The fallback for an unknown type is the enum spelled out
 * in lower case, which is not a phrase and is returned as one.
 */
export function notificationLabel(type: NotificationType): PhraseRef | string {
  return (
    NOTIFICATION_TYPE_INFO.find((i) => i.type === type)?.label ??
    type.toLowerCase().replace(/_/g, " ")
  );
}
