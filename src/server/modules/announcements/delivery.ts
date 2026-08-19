import { db } from "@/server/db/client";
import { env } from "@/server/env";
import { sendEmail } from "@/server/email";
import { announcementEmail } from "@/server/email/templates";
import { DELIVERY } from "@/server/modules/announcements/service";
import {
  type AnnouncementBlock,
  blocksToText,
} from "@/server/modules/announcements/blocks";

/**
 * Getting a critical notice to somebody who is not signed in.
 *
 * ## The hole this fills
 *
 * `DELIVERY` has said `mayEmail: true` for CRITICAL since the module was
 * written, and nothing read it. So notice existed only inside the product, and
 * the member it was written for — the one who is not signed in, has not been
 * for weeks, and whose data is about to be treated differently — was the exact
 * member it never reached. Privacy §14 and Terms §14 both promise notice
 * *before* a change takes effect, and a banner cannot keep that promise on its
 * own because it waits to be visited.
 *
 * ## Why this is a job and not part of publishing
 *
 * Sending inside the publish request would put a loop over the whole
 * membership in the path of an admin pressing a button. It would time out,
 * and worse, a failure halfway leaves no record of who was reached — so the
 * retry either sends nothing or sends everything twice.
 *
 * Instead the send is driven off `AnnouncementEmail`, one row written after
 * each successful delivery. The query selects members with no row, so the job
 * is resumable by construction: a crash, a timeout, an SMTP outage, or simply
 * more members than one run's budget all resolve into "pick up where it left
 * off" on the next pass. Publishing stays a database write that returns
 * immediately.
 *
 * `run-jobs.ts` runs hourly, which is the right granularity for a notice tied
 * to a date rather than a minute.
 */

/**
 * How many messages one pass will send.
 *
 * A ceiling rather than a target. It bounds the damage from a mistake — a
 * notice published with the wrong tier stops after this many rather than
 * reaching everybody before anyone notices — and it keeps one run from holding
 * an SMTP connection open for an hour. The remainder goes out on the next pass,
 * and the whole point of the delivery table is that the next pass knows where
 * it got to.
 */
const SEND_BUDGET = 500;

/** How close to the effective date a reminder goes out. */
const REMINDER_WINDOW_MS = 72 * 60 * 60 * 1000;

export interface DeliveryResult {
  notices: number;
  reminders: number;
}

function appUrl(path: string): string {
  return new URL(path, env().APP_URL).toString();
}

/**
 * Which paragraphs the email carries.
 *
 * The summary first, because it is the sentence written to be read on its own,
 * then the body. `blocksToText` is reused rather than reimplemented so a new
 * block kind cannot render one way on the page and another way in the inbox.
 */
function paragraphsFor(summary: string, body: AnnouncementBlock[]): string[] {
  const rendered = blocksToText(body)
    .split("\n\n")
    .map((part) => part.trim())
    .filter(Boolean);
  return [summary, ...rendered];
}

/**
 * Who is entitled to a notice.
 *
 * Verified addresses only. An unverified address has never been proved to
 * belong to the person who typed it, and a notice about somebody's account and
 * data is precisely the message that must not be delivered to a stranger who
 * was typed in by mistake.
 *
 * No filter on account status, which is deliberate and worth defending. A
 * suspended or banned member still has data we hold, and a notice that the
 * handling of that data is changing is owed to whoever it is about rather than
 * to whoever is currently in good standing. A deactivated member can sign back
 * in and is even more likely to need telling. The one thing that removes
 * somebody from this query is deleting their account, which removes the row.
 *
 * The suppression list is *not* checked here. `sendEmail` is the single door
 * out and checks it there, which is the arrangement that stops the next caller
 * forgetting.
 */
async function recipientsWithout(
  announcementId: string,
  kind: "NOTICE" | "REMINDER",
  extraWhere: object,
  limit: number,
) {
  return db.profile.findMany({
    where: {
      user: { emailVerifiedAt: { not: null } },
      // `AND` rather than spreading `extraWhere` alongside the `none` clause.
      // Both conditions are about the same relation, so as sibling keys the
      // second silently replaces the first — and the failure is invisible:
      // the reminder query would drop its "not already sent" guard and mail
      // the same person every hour.
      AND: [
        { announcementEmails: { none: { announcementId, kind } } },
        extraWhere,
      ],
    },
    take: limit,
    select: { id: true, user: { select: { email: true } } },
  });
}

/**
 * One announcement, one kind, to as many people as the budget allows.
 *
 * Returns how many were sent so the caller can spend what is left of the
 * budget on the next announcement rather than giving each one a full share.
 */
async function deliver(
  announcement: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    body: AnnouncementBlock[];
    effectiveAt: Date | null;
  },
  kind: "NOTICE" | "REMINDER",
  extraWhere: object,
  budget: number,
): Promise<number> {
  if (budget <= 0) return 0;

  const recipients = await recipientsWithout(
    announcement.id,
    kind,
    extraWhere,
    budget,
  );
  if (recipients.length === 0) return 0;

  const body = announcementEmail({
    title:
      kind === "REMINDER"
        ? `Coming into effect: ${announcement.title}`
        : announcement.title,
    paragraphs: paragraphsFor(announcement.summary, announcement.body),
    link: appUrl(`/whats-new/${announcement.slug}`),
    effectiveAt: announcement.effectiveAt,
    archiveUrl: appUrl("/whats-new"),
  });

  let sent = 0;

  for (const recipient of recipients) {
    try {
      await sendEmail({ to: recipient.user.email, ...body });
    } catch (error) {
      // One bad address must not stop the notice reaching everybody else, and
      // no row is written, so the next pass tries this member again. A
      // permanently undeliverable address ends up on the suppression list via
      // the bounce webhook, after which `sendEmail` returns without sending
      // and the row below records that we are done trying.
      console.error(
        `[announcements] ${kind} for ${announcement.slug} failed:`,
        error,
      );
      continue;
    }

    // Written after the send, never before. The failure this ordering chooses
    // is sending twice rather than sending never, which is the right way round
    // for a notice somebody is owed.
    await db.announcementEmail.create({
      data: {
        announcementId: announcement.id,
        profileId: recipient.id,
        kind,
      },
    });
    sent += 1;
  }

  return sent;
}

/**
 * The hourly pass.
 *
 * Two kinds of message, and the difference between them is who still needs it:
 *
 * NOTICE goes to everybody, once, as soon as the announcement is live. It is
 * the notice itself and it is not conditional on anything.
 *
 * REMINDER goes only within three days of the effective date, and only to
 * members who have not read the announcement in the product. Somebody who read
 * it has been told, and telling them again would be the "designed to pull you
 * back" message that /about promises does not exist here. Somebody who has not
 * read it is about to be affected by a change they have not seen, and the
 * reminder is the last chance to give the fair warning the terms promise.
 */
export async function deliverAnnouncementEmails(): Promise<DeliveryResult> {
  const now = new Date();

  const mailableTiers = (
    Object.keys(DELIVERY) as (keyof typeof DELIVERY)[]
  ).filter((tier) => DELIVERY[tier].mayEmail);

  // Only what the tier table permits. Reading the permission rather than
  // hard-coding CRITICAL means the one place that decides who may be mailed is
  // still the one place, and the test asserting only one tier may mail keeps
  // guarding this path too.
  const announcements = await db.announcement.findMany({
    where: {
      tier: { in: mailableTiers },
      publishedAt: { not: null, lte: now },
    },
    orderBy: { publishedAt: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      body: true,
      effectiveAt: true,
    },
  });

  let budget = SEND_BUDGET;
  const result: DeliveryResult = { notices: 0, reminders: 0 };

  for (const row of announcements) {
    const announcement = { ...row, body: (row.body as AnnouncementBlock[]) ?? [] };

    const notices = await deliver(announcement, "NOTICE", {}, budget);
    result.notices += notices;
    budget -= notices;

    // A reminder only makes sense while the change is still ahead. Past the
    // effective date there is nothing left to warn about, and the announcement
    // is on the record either way.
    const due =
      announcement.effectiveAt !== null &&
      announcement.effectiveAt > now &&
      announcement.effectiveAt.getTime() - now.getTime() <= REMINDER_WINDOW_MS;

    if (due) {
      const reminders = await deliver(
        announcement,
        "REMINDER",
        // Not read in the product, and the original notice did reach them.
        // Reminding somebody about a message they never received would be the
        // first thing they hear about it, and it would be framed as a nudge.
        {
          announcementReads: { none: { announcementId: announcement.id } },
          announcementEmails: {
            some: { announcementId: announcement.id, kind: "NOTICE" },
          },
        },
        budget,
      );
      result.reminders += reminders;
      budget -= reminders;
    }

    if (budget <= 0) break;
  }

  return result;
}
