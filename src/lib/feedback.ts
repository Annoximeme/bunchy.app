import type { FeedbackKind, FeedbackStatus } from "@/generated/prisma/enums";

/**
 * How the states are named where a member can see them.
 *
 * Written as things a person would say. "NEW" and "READ" are how a tracker
 * describes its own rows; "Not read yet" is what somebody actually wants to
 * know, and being told plainly that nothing has happened yet is far better
 * than a status that implies more progress than there has been.
 */
export const STATUS_LABEL: Record<FeedbackStatus, string> = {
  NEW: "Not read yet",
  READ: "Read",
  PLANNED: "On the list",
  SHIPPED: "Shipped",
  DECLINED: "Not doing this",
};

/** Chip tones. Declined is neutral rather than red: a no is not a failure. */
export const STATUS_TONE: Record<
  FeedbackStatus,
  "neutral" | "accent" | "teal" | "positive" | "suggested"
> = {
  NEW: "neutral",
  READ: "neutral",
  PLANNED: "suggested",
  SHIPPED: "positive",
  DECLINED: "neutral",
};

export const KIND_LABEL: Record<FeedbackKind, string> = {
  IDEA: "An idea",
  BROKEN: "Something is broken",
  CONFUSING: "Something is confusing",
  OTHER: "Something else",
};

/** The order they are offered in, commonest first. */
export const KINDS: FeedbackKind[] = ["IDEA", "BROKEN", "CONFUSING", "OTHER"];
