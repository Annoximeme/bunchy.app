import { db } from "@/server/db/client";
import { notify } from "@/server/modules/notifications/service";
import { recommendBunches } from "@/server/modules/matching/bunches";

/**
 * The notifications that are not caused by a person doing something.
 *
 * Every other notification in this product is a reaction: someone wrote to you,
 * someone invited you, someone replied. These two are the exceptions, and both
 * were shipped as preference toggles with nothing behind them — a member could
 * switch on "a reminder shortly before an activity you joined" and never
 * receive one. That is the kind of half-feature this codebase is supposed not
 * to have, so it is a job now rather than a promise.
 *
 * There is no scheduler in the app. This is a plain function; `npm run jobs`
 * runs it, and a cron or a platform scheduler calls that. Deliberately not a
 * setInterval inside the web process — work that must happen once should not be
 * attached to something that runs in N replicas.
 *
 * **Idempotent by group key.** Each job derives a stable key per member per
 * subject and skips anyone who already has it. Running the job twice in a
 * minute, or twice because a deploy overlapped, sends nothing extra.
 */

/** How far ahead of an activity the reminder goes out. */
const REMINDER_LEAD_HOURS = 24;
/** At most one bunch suggestion per member per fortnight. */
const RECOMMENDATION_COOLDOWN_DAYS = 14;

/** Long enough that the evening has actually ended before anyone is asked. */
const FOLLOW_UP_SETTLE_HOURS = 3;
/** And not so long that the job re-asks about last month on every run. */
const FOLLOW_UP_WINDOW_HOURS = 48;

export interface JobResult {
  activityReminders: number;
  bunchRecommendations: number;
  activityFollowUps: number;
}

export async function runScheduledNotifications(
  now = new Date(),
): Promise<JobResult> {
  return {
    activityReminders: await sendActivityReminders(now),
    bunchRecommendations: await sendBunchRecommendations(now),
    activityFollowUps: await sendActivityFollowUps(now),
  };
}

/**
 * "Did you go?" — the only notification sent after something rather than before.
 *
 * Sent once, a few hours after an activity ends, to the people who said they
 * were coming. It asks the question the product is actually built to answer,
 * and it is the one notification whose value to the member is indirect: they
 * answer it so the introductions get better, which is worth saying out loud
 * rather than dressing up as a favour.
 *
 * Deliberately no chasing. One prompt, and silence is an answer.
 */
export async function sendActivityFollowUps(
  now = new Date(),
): Promise<number> {
  const settled = new Date(now.getTime() - FOLLOW_UP_SETTLE_HOURS * 3_600_000);
  const horizon = new Date(now.getTime() - FOLLOW_UP_WINDOW_HOURS * 3_600_000);

  const activities = await db.activity.findMany({
    where: {
      status: { not: "CANCELLED" },
      startsAt: { gte: horizon, lte: settled },
    },
    select: {
      id: true,
      title: true,
      participants: {
        where: { status: "JOINED" },
        select: { profileId: true },
      },
      outcomes: { select: { profileId: true } },
    },
  });

  let sent = 0;
  for (const activity of activities) {
    const groupKey = `activity-follow-up:${activity.id}`;
    const answered = new Set(activity.outcomes.map((o) => o.profileId));

    for (const participant of activity.participants) {
      if (answered.has(participant.profileId)) continue;

      const already = await db.notification.findFirst({
        where: { profileId: participant.profileId, groupKey },
        select: { id: true },
      });
      if (already) continue;

      await notify({
        profileId: participant.profileId,
        type: "ACTIVITY_FOLLOW_UP",
        title: `How was ${activity.title}?`,
        body: "Two taps: did you go, and did you meet anyone worth seeing again? It is what makes the next introduction better.",
        linkPath: "/discover",
        groupKey,
      });
      sent += 1;
    }
  }

  return sent;
}

/**
 * "Something you joined is happening tomorrow."
 *
 * Only for activities that are still scheduled, and only to people who said
 * they were coming. A reminder about a cancelled plan is worse than silence.
 */
export async function sendActivityReminders(now = new Date()): Promise<number> {
  const horizon = new Date(now.getTime() + REMINDER_LEAD_HOURS * 3_600_000);

  const activities = await db.activity.findMany({
    where: {
      status: "SCHEDULED",
      startsAt: { gt: now, lte: horizon },
    },
    select: {
      id: true,
      title: true,
      startsAt: true,
      locationLabel: true,
      mode: true,
      participants: {
        where: { status: "JOINED" },
        select: { profileId: true, profile: { select: { timezone: true } } },
      },
    },
  });

  let sent = 0;
  for (const activity of activities) {
    const groupKey = `activity-reminder:${activity.id}`;

    for (const participant of activity.participants) {
      const already = await db.notification.findFirst({
        where: { profileId: participant.profileId, groupKey },
        select: { id: true },
      });
      if (already) continue;

      const where =
        activity.mode === "ONLINE"
          ? "online"
          : (activity.locationLabel ?? "the usual place");

      await notify({
        profileId: participant.profileId,
        type: "ACTIVITY_REMINDER",
        title: `${activity.title} is tomorrow`,
        // Each recipient gets the time in their own zone. The same reminder
        // reads differently for a member in Tokyo, which is the point.
        body: `Starting ${formatWhen(activity.startsAt, participant.profile.timezone)}, ${where}.`,
        linkPath: `/activities/${activity.id}`,
        groupKey,
      });
      sent += 1;
    }
  }

  return sent;
}

/**
 * "A bunch you might like."
 *
 * The only notification here that nobody asked for, which is why it is the most
 * constrained: off by default, sent only to members who switched it on, at most
 * one a fortnight, and only when there is a genuinely strong match with room in
 * it. A weak suggestion sent on a schedule is engagement bait with a friendly
 * name.
 */
export async function sendBunchRecommendations(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - RECOMMENDATION_COOLDOWN_DAYS * 86_400_000);

  // Only people who explicitly opted in. The default is off, so an absent row
  // is a no — this deliberately does not fall back to `defaultPreference`.
  const optedIn = await db.notificationPreference.findMany({
    where: { type: "BUNCH_RECOMMENDATION", inApp: true },
    select: { profileId: true },
  });

  let sent = 0;
  for (const { profileId } of optedIn) {
    const recent = await db.notification.findFirst({
      where: {
        profileId,
        type: "BUNCH_RECOMMENDATION",
        createdAt: { gte: cutoff },
      },
      select: { id: true },
    });
    if (recent) continue;

    const [best] = await recommendBunches(profileId, 1);
    // 70 is "we would lead with this on Discover". Anything less is not worth
    // interrupting someone for.
    if (!best || best.score === undefined || best.score < 70) continue;

    await notify({
      profileId,
      type: "BUNCH_RECOMMENDATION",
      title: `${best.name} looks like your kind of bunch`,
      body: best.highlights?.[0] ?? "It matches what you're into.",
      linkPath: `/bunches/${best.slug}`,
      groupKey: `bunch-recommendation:${best.id}`,
    });
    sent += 1;
  }

  return sent;
}

/**
 * The time, in the recipient's own zone, and labelled with it.
 *
 * A member with no zone on file falls back to UTC — stated explicitly, because
 * an unlabelled hour in a reminder for a real-world meetup is someone turning
 * up at the wrong time.
 */
function formatWhen(date: Date, timezone: string | null): string {
  const zone = timezone ?? "UTC";
  const formatted = date.toLocaleString("en-GB", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zone,
    timeZoneName: "short",
  });
  return formatted;
}
