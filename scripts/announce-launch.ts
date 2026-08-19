import { env } from "@/server/env";
import {
  announceLaunch,
  announcementProgress,
} from "@/server/modules/waitlist/announce";

/**
 * Tell the waiting list that Bunchy is open.
 *
 * Locally:
 *
 *   npm run announce                  # rehearsal: says what it would do
 *   npm run announce -- --limit 5     # rehearse the first five
 *   npm run announce -- --send --limit 5   # actually write to five people
 *   npm run announce -- --send        # the rest of the list
 *
 * On the server it is the `jobs` container, and the invocation is fussier in
 * two ways that are both easy to trip over at the wrong moment:
 *
 *   docker compose exec jobs /usr/local/bin/entrypoint.sh \
 *     node node_modules/.bin/tsx scripts/announce-launch.ts --send
 *
 * `jobs` rather than `app`, because the app image is a standalone Next build
 * with no devDependencies, no tsx, so no way to run any of this. And the
 * entrypoint by name, because `docker compose exec` skips a container's
 * ENTRYPOINT, and that is where DATABASE_URL gets assembled from its parts.
 * Without it the script dies on "DATABASE_URL: expected string, received
 * undefined", which reads like a broken .env rather than a missing wrapper.
 *
 * Run by hand, once, by a person who has decided that today is the day. Not a
 * job, not a cron entry, not a step in the deploy: the whole point of a
 * launch announcement is that somebody chose to send it, and a scheduled task
 * that mass-mails on a condition is a task that will eventually mass-mail on a
 * misread condition.
 *
 * `--send` is required to send anything. Without it this reads the list,
 * renders the message and reports what would happen, which is the form you
 * want when you are checking whether the count looks right at eleven at night.
 *
 * Safe to run again after a failure. Progress is per-address in the database,
 * so a second run picks up exactly the addresses the first did not finish.
 * See `server/modules/waitlist/announce.ts` for why it is at-least-once.
 */

interface Args {
  send: boolean;
  limit?: number;
}

function usage(message: string): never {
  console.error(
    [
      message,
      "",
      "Usage: npm run announce -- [--send] [--limit N]",
      "",
      "  --send      Actually send. Without it, nothing leaves the machine.",
      "  --limit N   Stop after N addresses.",
    ].join("\n"),
  );
  process.exit(1);
}

function parseArgs(argv: string[]): Args {
  const args: Args = { send: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--send") {
      args.send = true;
    } else if (arg === "--limit") {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value) || value < 1) {
        usage(`--limit needs a whole number above zero.`);
      }
      args.limit = value;
    } else {
      // Refused rather than ignored. A typo'd flag on the one command that
      // mass-mails should not quietly become a full send.
      usage(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = env();

  const { total, pending } = await announcementProgress();
  console.info(
    `Waiting list: ${total} address(es), ${pending} not yet told.` +
      (args.limit ? ` Taking the oldest ${args.limit}.` : ""),
  );

  if (pending === 0) {
    console.info("Nobody is waiting to hear from us. Nothing to do.");
    return;
  }

  // The console transport prints to stdout instead of sending. Discovering
  // that after a "successful" run of two thousand addresses, all of them now
  // marked as notified, none of them written to, is not recoverable, so it is
  // a refusal rather than a warning.
  if (args.send && config.EMAIL_PROVIDER !== "smtp") {
    console.error(
      `EMAIL_PROVIDER is "${config.EMAIL_PROVIDER}", so nothing would actually be delivered.\n` +
        "Set EMAIL_PROVIDER=smtp before sending for real.",
    );
    process.exit(1);
  }

  if (args.send) {
    console.info(`Sending, as ${config.EMAIL_FROM}. Ctrl-C stops it safely.`);
  } else {
    console.info("Rehearsal. Nothing will be sent. Add --send to do it.");
  }

  const started = Date.now();
  const result = await announceLaunch({
    send: args.send,
    limit: args.limit,
    onProgress: (event) => {
      const mark =
        event.outcome === "sent" ? "→" : event.outcome === "skipped" ? "·" : "✗";
      // The address is printed here and nowhere else. This is an operator
      // watching their own list scroll past, not a log line that outlives the
      // run, which is why the failure path inside the module logs the error
      // without it.
      console.info(
        `[${event.done}/${event.total}] ${mark} ${event.email}` +
          (event.outcome === "failed" ? `, ${describe(event.error)}` : "") +
          (event.outcome === "skipped" ? " (already a member)" : ""),
      );
    },
  });

  const seconds = Math.round((Date.now() - started) / 1000);
  console.info(
    [
      "",
      result.rehearsal ? "Rehearsal complete." : "Done.",
      `  would send / sent: ${result.sent}`,
      `  skipped (members): ${result.skipped}`,
      `  failed:            ${result.failed}`,
      `  took:              ${seconds}s`,
    ].join("\n"),
  );

  if (result.failed > 0) {
    console.info(
      "\nThe failures were left unmarked. Run this again and it will retry" +
        " exactly those addresses and no others.",
    );
    // Non-zero, so this is visible to whatever ran it rather than only to
    // whoever was watching the output at the time.
    process.exit(1);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error("Failed:", error);
    process.exit(1);
  },
);
