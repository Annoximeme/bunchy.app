import { db } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import { notify } from "@/server/modules/notifications/service";
import { recordModerationEvent } from "@/server/modules/admin/audit";
import type { StaffViewer } from "@/server/modules/admin/guard";
import type { Prisma } from "@/generated/prisma/client";
import type { FeedbackKind, FeedbackStatus } from "@/generated/prisma/enums";

/**
 * Feedback about the product, and the loop that closes it.
 *
 * ## The only hard part is answering
 *
 * Collecting feedback is a form. What makes a feedback system work or not is
 * whether anything comes back, and almost nothing does: the overwhelming
 * default experience of sending a product a suggestion is silence, which
 * teaches people not to bother a second time. So the states here are visible to
 * the author, "nobody has read this yet" is one of them, and saying no is a
 * first-class outcome rather than the absence of an outcome.
 *
 * ## No voting, no public board
 *
 * See the schema note. Counting ideas ranks them by how loud their audience is,
 * and ranking is the thing this product refuses to do.
 */

/** Long enough to say something, short enough to stay a message. */
const MAX_MESSAGE = 4000;
const MIN_MESSAGE = 10;
const MAX_REPLY = 4000;

export interface FeedbackView {
  id: string;
  kind: FeedbackKind;
  message: string;
  pagePath: string | null;
  status: FeedbackStatus;
  reply: string | null;
  repliedAt: Date | null;
  createdAt: Date;
  announcement: { slug: string; title: string } | null;
}

const FEEDBACK_SELECT = {
  id: true,
  kind: true,
  message: true,
  pagePath: true,
  status: true,
  reply: true,
  repliedAt: true,
  createdAt: true,
  announcement: { select: { slug: true, title: true } },
} as const satisfies Prisma.ProductFeedbackSelect;

export async function submitFeedback(input: {
  profileId: string;
  kind: FeedbackKind;
  message: string;
  pagePath?: string | null;
}): Promise<FeedbackView> {
  const message = input.message.trim();

  if (message.length < MIN_MESSAGE) {
    throw new AppError(
      "validation_failed",
      "A sentence or two, so there is something to act on.",
    );
  }
  if (message.length > MAX_MESSAGE) {
    throw new AppError(
      "validation_failed",
      `That is longer than ${MAX_MESSAGE} characters. Send the shorter version and we will ask if we need more.`,
    );
  }

  // Bounded like every other member-triggered write. Generous, because
  // somebody with five real things to say on one evening is the best kind of
  // member to have and should not be told to come back tomorrow.
  await consume("feedback", input.profileId);

  const created = await db.productFeedback.create({
    data: {
      profileId: input.profileId,
      kind: input.kind,
      message,
      // Stored only when it is one of our own paths. A full URL from an
      // address bar can carry a query string somebody did not mean to send.
      pagePath: normalisePath(input.pagePath),
    },
    select: FEEDBACK_SELECT,
  });

  return created;
}

/**
 * Only a path, and only one that looks like ours.
 *
 * The form shows the author what will be attached, so this is not a secret
 * collection. It is here so that a crafted value cannot turn the staff queue
 * into a list of clickable links to somewhere else.
 */
function normalisePath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value.split("?")[0]!.slice(0, 200);
}

/** Everything one member has sent, newest first. */
export async function feedbackFrom(profileId: string): Promise<FeedbackView[]> {
  return db.productFeedback.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: FEEDBACK_SELECT,
  });
}

export interface QueueItem extends FeedbackView {
  author: { username: string; displayName: string } | null;
}

export async function feedbackQueue(filter: {
  status?: FeedbackStatus;
  kind?: FeedbackKind;
}): Promise<QueueItem[]> {
  return db.productFeedback.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.kind ? { kind: filter.kind } : {}),
    },
    // Oldest first within the queue: the whole failure mode of a feedback
    // inbox is that the bottom of it is never reached.
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      ...FEEDBACK_SELECT,
      profile: { select: { username: true, displayName: true } },
    },
  }).then((rows) =>
    rows.map(({ profile, ...rest }) => ({ ...rest, author: profile })),
  );
}

export async function feedbackCounts(): Promise<Record<FeedbackStatus, number>> {
  const rows = await db.productFeedback.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  const counts = { NEW: 0, READ: 0, PLANNED: 0, SHIPPED: 0, DECLINED: 0 } as Record<
    FeedbackStatus,
    number
  >;
  for (const row of rows) counts[row.status] = row._count.status;
  return counts;
}

/**
 * Answer a piece of feedback.
 *
 * The notification fires only when there is something worth telling somebody:
 * moving a row from NEW to READ is bookkeeping, and a message saying "we have
 * read your message" is noise dressed as courtesy. A reply, or a decision, is
 * not.
 */
export async function answerFeedback(
  actor: StaffViewer,
  id: string,
  input: { status: FeedbackStatus; reply?: string | null; announcementId?: string | null },
): Promise<void> {
  const reply = input.reply?.trim() || null;
  if (reply && reply.length > MAX_REPLY) {
    throw new AppError("validation_failed", "That reply is too long.");
  }

  if (input.status === "DECLINED" && !reply) {
    throw new AppError(
      "validation_failed",
      "Declining needs a reason. An unexplained no is the thing that stops people writing again.",
    );
  }

  const existing = await db.productFeedback.findUnique({
    where: { id },
    select: { id: true, profileId: true, status: true, reply: true },
  });
  if (!existing) throw new AppError("not_found", "That feedback is gone.");

  const updated = await db.productFeedback.update({
    where: { id },
    data: {
      status: input.status,
      reply,
      repliedAt: reply && reply !== existing.reply ? new Date() : undefined,
      announcementId: input.announcementId ?? null,
    },
    select: { status: true, announcement: { select: { slug: true, title: true } } },
  });

  await recordModerationEvent({
    actor,
    action: "REPORT_ACTIONED",
    targetType: "SITE",
    targetId: id,
    reason: `Feedback marked ${input.status}`,
    metadata: { status: input.status, replied: Boolean(reply) },
  });

  const decided = input.status !== "NEW" && input.status !== "READ";
  if (!existing.profileId || (!reply && !decided)) return;
  if (existing.status === input.status && reply === existing.reply) return;

  await notify({
    profileId: existing.profileId,
    type: "FEEDBACK_ANSWERED",
    title: OUTCOME_TITLE[updated.status],
    body: reply ?? undefined,
    linkPath: updated.announcement ? `/whats-new/${updated.announcement.slug}` : "/feedback",
    groupKey: `feedback:${id}`,
  });
}

/**
 * Written from the reader's side, not the tracker's.
 *
 * "Status changed to DECLINED" is what a system says. These are what a person
 * says, and the difference decides whether the next message gets written.
 */
const OUTCOME_TITLE: Record<FeedbackStatus, string> = {
  NEW: "About your feedback",
  READ: "Somebody read your feedback",
  PLANNED: "Your feedback is on the list",
  SHIPPED: "The thing you asked for is live",
  DECLINED: "We are not going to do this one",
};
