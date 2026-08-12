import { runScheduledNotifications } from "@/server/modules/notifications/scheduled";
import { purgeExpiredAvailability } from "@/server/modules/availability/service";

/**
 * Scheduled work, run from outside the web process.
 *
 * `npm run jobs` — point a cron, a platform scheduler or a Kubernetes CronJob
 * at this. Hourly is right: activity reminders go out 24 hours ahead, so an
 * hourly pass gives at worst an hour of jitter on a day of notice, and every
 * job here is idempotent so an overlapping run sends nothing extra.
 *
 * Deliberately not a `setInterval` inside the server. Work that must happen
 * once should not be attached to a process that runs in N replicas.
 */
async function main() {
  const started = Date.now();
  const result = await runScheduledNotifications();
  // Reads already filter on `expiresAt`, so this is about deletion rather than
  // correctness: a spent availability status should not still be sitting in a
  // backup next week.
  const purged = await purgeExpiredAvailability();

  console.log(
    `[jobs] activity reminders: ${result.activityReminders}, ` +
      `bunch recommendations: ${result.bunchRecommendations}, ` +
      `expired statuses purged: ${purged} ` +
      `(${Date.now() - started}ms)`,
  );
}

main().then(
  () => process.exit(0),
  (error) => {
    // A failed job must exit non-zero, or the scheduler reports success and
    // nobody finds out that reminders stopped going out.
    console.error("[jobs] failed:", error);
    process.exit(1);
  },
);
