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

export interface JobResult {
  activityReminders: number;
  bunchRecommendations: number;
}

export async function runScheduledNotifications(
  now = new Date(),
): Promise<JobResult> {
  return {
    activityReminders: await sendActivityReminders(now),
    bunchRecommendations: await sendBunchRecommendations(now),
  };
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
        select: { profileId: true },
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
        body: `Starting ${formatWhen(activity.startsAt)}, ${where}.`,
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
 * Times are rendered in UTC and *labelled* UTC.
 *
 * Profiles carry no timezone yet (see the known limitations), so the server
 * cannot render a member's local hour. Everywhere else that is a mild
 * inaccuracy; in a reminder for a real-world meetup it is someone turning up at
 * the wrong time, so the zone is stated rather than implied. The notification
 * links to the activity, where the browser formats it locally.
 */
function formatWhen(date: Date): string {
  const formatted = date.toLocaleString("en-GB", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `${formatted} UTC`;
}
