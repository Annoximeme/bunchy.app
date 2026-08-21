import { runScheduledNotifications } from "@/server/modules/notifications/scheduled";
import { purgeExpiredAvailability } from "@/server/modules/availability/service";
import { recomputeAllChemistry } from "@/server/modules/bunches/health";
import { deliverAnnouncementEmails } from "@/server/modules/announcements/delivery";
import { materialiseDueOccurrences } from "@/server/modules/activities/series";
import { expireStaleCalls } from "@/server/modules/activities/quick";
import { pruneExpiredLinkCodes } from "@/server/modules/discord/link";

/**
 * Scheduled work, run from outside the web process.
 *
 * `npm run jobs`, point a cron, a platform scheduler or a Kubernetes CronJob
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
  // Precomputed here rather than per render: a full reading scores every pair
  // in the bunch, which is 78ms of work against 4ms for the page itself.
  const chemistry = await recomputeAllChemistry();
  // Notice of a change to somebody's rights or data, to the address we have,
  // because a banner only reaches a member who happens to sign in. Resumable
  // and idempotent: it selects members with no delivery row, so an hourly pass
  // that overlaps or crashes sends nothing twice.
  const announcements = await deliverAnnouncementEmails();
  // Rituals become real activities a fortnight ahead. Convergent: each pass
  // materialises one occurrence per series and advances nextAt, so passes keep
  // filling the horizon and then stop. No duplicates under repetition, because
  // nextAt moves in the same transaction as the occurrence.
  const series = await materialiseDueOccurrences();
  // Open calls nobody took up. Only the ones still holding just their author:
  // one other person joining makes it a real plan, and closing that because a
  // clock ran out would be cancelling somebody else's evening.
  const calls = await expireStaleCalls();
  // Not needed for correctness, redeem checks the expiry itself. This is so a
  // spent five-minute credential is not still sitting in a backup next week.
  const codes = await pruneExpiredLinkCodes();

  console.log(
    `[jobs] activity reminders: ${result.activityReminders}, ` +
      `follow-ups: ${result.activityFollowUps}, ` +
      `bunch recommendations: ${result.bunchRecommendations}, ` +
      `expired statuses purged: ${purged}, ` +
      `bunches scored: ${chemistry.scored}, ` +
      `announcement notices: ${announcements.notices}, ` +
      `announcement reminders: ${announcements.reminders}, ` +
      `occurrences created: ${series.created}, ` +
      `calls expired: ${calls.expired}, ` +
      `link codes pruned: ${codes} ` +
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
