import { db } from "@/server/db/client";
import { env } from "@/server/env";
import { sendEmail } from "@/server/email";
import { waitlistLaunchEmail } from "@/server/email/templates";

/**
 * The one message the waiting list was collected for.
 *
 * This is the only bulk send Bunchy has, it goes out once, and it goes to
 * people who were promised exactly one email. That makes the failure modes
 * asymmetric in a way worth stating plainly, because they drive every decision
 * below:
 *
 * - **Writing twice is embarrassing.** Somebody who was told "one message"
 *   gets two.
 * - **Writing zero times is worse.** They left an address specifically to hear
 *   about this, and there is no second chance — the list is not kept for a
 *   retry campaign, because there is no campaign.
 * - **Half a send with no record of where it stopped is worst of all.** That
 *   is the one that cannot be recovered from at all.
 *
 * So: progress is committed to the database per message rather than held in
 * the process, the run is a resumable loop over `notifiedAt IS NULL`, and a
 * failure on one address does not abort the rest.
 *
 * ### At-least-once, deliberately
 *
 * The row is marked *after* the provider accepts the message. A crash in that
 * gap means one person gets a duplicate on the next run. Marking first would
 * close that window and open a worse one: a crash would mean somebody who
 * asked to be told never is, and nothing in the system would ever notice.
 * Given the two, a duplicate is the one to choose.
 */

export interface AnnounceOptions {
  /**
   * Nothing is sent and nothing is marked unless this is true.
   *
   * The default is a rehearsal, not a send. A mass mail script whose default
   * behaviour is to mass mail is one keystroke from an irreversible mistake,
   * and this one has no undo — the messages are in inboxes.
   */
  send?: boolean;
  /**
   * Stop after this many addresses. The point of a first run with `--limit 5`
   * is to read five real messages in five real inboxes before committing the
   * rest of the list to something with a typo in it.
   */
  limit?: number;
  /**
   * Pause between messages. Every provider rate-limits, and the response to
   * being over the limit is usually a block on the sending domain rather than
   * a polite 429 — which on launch day is indistinguishable from not having
   * launched.
   */
  delayMs?: number;
  /** Called per address, so a long run says something while it works. */
  onProgress?: (event: AnnounceProgress) => void;
  /** Seam for the tests. */
  sleep?: (ms: number) => Promise<void>;
}

export interface AnnounceProgress {
  email: string;
  outcome: "sent" | "skipped" | "failed";
  /** Present on failure. */
  error?: unknown;
  /** How many have been dealt with so far, including this one. */
  done: number;
  total: number;
}

export interface AnnounceResult {
  /** Addresses waiting to be told, at the moment the run started. */
  pending: number;
  sent: number;
  /** Already members. Marked as handled without being written to. */
  skipped: number;
  failed: number;
  /** True when nothing was actually sent. */
  rehearsal: boolean;
}

const DEFAULT_DELAY_MS = 500;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** How much of the list is still owed a message. */
export async function announcementProgress(): Promise<{
  total: number;
  pending: number;
}> {
  const [total, pending] = await Promise.all([
    db.waitlistSignup.count(),
    db.waitlistSignup.count({ where: { notifiedAt: null } }),
  ]);
  return { total, pending };
}

export async function announceLaunch(
  options: AnnounceOptions = {},
): Promise<AnnounceResult> {
  const {
    send = false,
    limit,
    delayMs = DEFAULT_DELAY_MS,
    onProgress,
    sleep = wait,
  } = options;

  const signups = await db.waitlistSignup.findMany({
    where: { notifiedAt: null },
    // Oldest first. Somebody who has been waiting since the coming-soon page
    // went up should not be behind somebody who signed up this morning.
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, email: true },
  });

  const appUrl = env().APP_URL.replace(/\/$/, "");
  const message = waitlistLaunchEmail(`${appUrl}/signup`);

  const result: AnnounceResult = {
    pending: signups.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    rehearsal: !send,
  };

  for (const [index, signup] of signups.entries()) {
    // Somebody who is already inside does not need to be told the doors
    // opened. Cheap to check, and the alternative is announcing a launch to
    // people who are looking at it.
    const member = await db.user.findUnique({
      where: { email: signup.email },
      select: { id: true },
    });

    const report = (outcome: AnnounceProgress["outcome"], error?: unknown) =>
      onProgress?.({
        email: signup.email,
        outcome,
        error,
        done: index + 1,
        total: signups.length,
      });

    if (member) {
      result.skipped += 1;
      if (send) await markNotified(signup.id);
      report("skipped");
      continue;
    }

    if (!send) {
      result.sent += 1;
      report("sent");
      continue;
    }

    try {
      await sendEmail({ to: signup.email, ...message });
      // Only now. See the note on at-least-once above.
      await markNotified(signup.id);
      result.sent += 1;
      report("sent");
    } catch (error) {
      // Left unmarked on purpose: an unmarked row is retried by the next run,
      // which is the whole recovery story for a provider having a bad ten
      // minutes. The address is never logged with the error — it is somebody's
      // email, and this log ends up in a container's stdout.
      result.failed += 1;
      report("failed", error);
    }

    if (index < signups.length - 1) await sleep(delayMs);
  }

  return result;
}

function markNotified(id: string) {
  return db.waitlistSignup.update({
    where: { id },
    data: { notifiedAt: new Date() },
  });
}
