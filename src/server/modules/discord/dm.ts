import { db } from "@/server/db/client";
import { env } from "@/server/env";
import { pendingOutcome } from "@/server/modules/activities/outcomes";

/**
 * Things worth saying to somebody privately, and the rules about which.
 *
 * ## Why direct messages at all
 *
 * Two of the product's most valuable moments happen when nobody is looking at
 * the site. An activity starts in twenty minutes and somebody has forgotten.
 * An evening finished last night and the question "did you meet anybody" is
 * only answerable while it is fresh. Both already exist in the product and both
 * only reach people who happen to open Discover.
 *
 * ## The line
 *
 * Every message here is tied to something the member themselves did: they
 * joined a thing, or they went to one. Nothing here fires because somebody has
 * been quiet, because a streak is at risk, or because there is something new to
 * look at. Those are the messages /about promises do not exist, and a private
 * channel is exactly where it would be easiest to break that promise quietly.
 *
 * Sent once, tracked on the same row the site uses, so a member never gets both
 * a Discord message and a repeat of it.
 */

export interface DueDm {
  discordId: string;
  content: string;
  /** What to mark once it is sent, so nothing repeats. */
  mark: () => Promise<void>;
}

function appUrl(path: string): string {
  return new URL(path, env().APP_URL).toString();
}

/**
 * Reminders for things somebody joined, and outcome questions for things they
 * went to.
 *
 * Both are collected in one pass so the bot makes one call and the ordering
 * between them is deterministic.
 */
export async function dueDirectMessages(now = new Date()): Promise<DueDm[]> {
  const soon = new Date(now.getTime() + 30 * 60_000);
  const messages: DueDm[] = [];

  /*
    Starting soon.

    Thirty minutes: long enough to get somewhere or open a client, short enough
    that it is still about tonight. Only for people who joined, never for people
    who might like it, which is the difference between a reminder and an advert.
  */
  const starting = await db.activityParticipant.findMany({
    where: {
      status: "JOINED",
      discordRemindedAt: null,
      profile: { discordLink: { isNot: null } },
      activity: {
        status: "SCHEDULED",
        startsAt: { gt: now, lte: soon },
      },
    },
    take: 25,
    select: {
      activityId: true,
      profileId: true,
      profile: { select: { discordLink: { select: { discordId: true } } } },
      activity: { select: { id: true, title: true, startsAt: true } },
    },
  });

  for (const row of starting) {
    const discordId = row.profile.discordLink?.discordId;
    if (!discordId) continue;

    const when = row.activity.startsAt.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    messages.push({
      discordId,
      content: `**${row.activity.title}** starts at ${when}. ${appUrl(`/activities/${row.activity.id}`)}`,
      mark: async () => {
        await db.activityParticipant.updateMany({
          where: { activityId: row.activityId, profileId: row.profileId },
          data: { discordRemindedAt: new Date() },
        });
      },
    });
  }

  return messages;
}

/**
 * The outcome question, for one linked member.
 *
 * Reuses `pendingOutcome`, which already decides what is worth asking about and
 * already refuses to ask twice. This adds no new rule; it only carries the
 * existing question to somebody who is in Discord rather than on the site.
 *
 * Answering happens on the site. A two-button DM would need components,
 * interaction routing and a second copy of the outcome rules, to save one tap
 * on a question asked at most once a week.
 */
export async function outcomeDm(
  profileId: string,
  discordId: string,
): Promise<DueDm | null> {
  const prompt = await pendingOutcome(profileId);
  if (!prompt) return null;

  return {
    discordId,
    content:
      `How was **${prompt.title}**? It takes two taps and it is what teaches Bunchy ` +
      `who to introduce you to next. ${appUrl("/discover")}`,
    // Nothing to mark: `pendingOutcome` stops offering it the moment it is
    // answered, and an unanswered one should keep being askable on the site.
    mark: async () => {},
  };
}
