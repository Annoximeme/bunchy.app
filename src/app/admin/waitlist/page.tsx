import type { Metadata } from "next";
import { requireAdmin } from "@/server/modules/admin/guard";
import { AdminHeader, Panel } from "@/components/admin/primitives";
import { announcementProgress } from "@/server/modules/waitlist/announce";
import { MIN_PUBLIC_COUNT } from "@/server/modules/waitlist/service";
import { suppressionCounts } from "@/server/email/suppression";

export const metadata: Metadata = { title: "Waiting list" };
export const dynamic = "force-dynamic";

/**
 * The waiting list, and how much of it has been told.
 *
 * Admin-only, and it shows counts rather than addresses. The list holds one
 * column for one purpose and nobody needs to read it — a screen that renders
 * every address is a screen that leaks the whole list to a shoulder, a
 * screenshot or a session left open, in exchange for answering a question
 * ("who is on it?") that nothing here has to ask.
 *
 * It exists mostly for the ten minutes of launch day when a send is in
 * progress. Refreshing this is how you watch it move without reading the log
 * of the container running it.
 */
export default async function AdminWaitlistPage() {
  await requireAdmin();

  const [{ total, pending }, suppressed] = await Promise.all([
    announcementProgress(),
    suppressionCounts(),
  ]);

  const told = total - pending;
  // Percentages of a handful of people are noise; the bar only means something
  // once there is a list.
  const percent = total > 0 ? Math.round((told / total) * 100) : 0;

  return (
    <>
      <AdminHeader
        title="Waiting list"
        subtitle="Addresses collected by the coming-soon page, and how many have been sent the one message they were promised."
      />

      <div className="space-y-6">
        <Panel title="The list">
          <dl className="grid gap-4 p-5 sm:grid-cols-3">
            <Stat label="Waiting" value={total} note="Addresses on the list." />
            <Stat
              label="Told"
              value={told}
              note="Sent the launch announcement."
            />
            <Stat
              label="Still owed"
              value={pending}
              note="What the next run would write to."
            />
          </dl>

          {total > 0 && (
            <div className="border-t border-line p-5">
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-raised"
                role="img"
                aria-label={`${told} of ${total} told`}
              >
                <div
                  className="h-full rounded-full bg-coral-primary"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-muted">
                {told} of {total} told ({percent}%).
              </p>
            </div>
          )}

          <p className="border-t border-line p-5 text-sm text-muted">
            The public count on the coming-soon page stays hidden until there
            are {MIN_PUBLIC_COUNT}. Below that it is close enough to nobody that
            announcing it identifies people, and &ldquo;3 people are
            waiting&rdquo; is worse than saying nothing.
          </p>
        </Panel>

        <Panel
          title="Undeliverable"
          note="fed by the provider's webhook, and never written to again"
        >
          <dl className="grid gap-4 p-5 sm:grid-cols-2">
            <Stat
              label="Bounced"
              value={suppressed.bounced}
              note="The mailbox does not exist. Writing again cannot succeed."
            />
            <Stat
              label="Complaints"
              value={suppressed.complained}
              note="Someone pressed report spam. The strongest instruction there is."
            />
          </dl>
          <p className="border-t border-line p-5 text-sm text-muted">
            These apply to every kind of email, not just the announcement, and
            there is no way to undo one from here on purpose: an address is
            listed because a mail server said it does not exist or a person said
            this is spam, and neither should be overrulable by a button.
          </p>
        </Panel>

        <Panel title="Sending the announcement">
          <div className="space-y-3 p-5 text-sm text-muted">
            <p>
              Run by hand, from the <code>jobs</code> container. It rehearses by
              default and sends nothing without <code>--send</code>:
            </p>
            <pre className="overflow-x-auto rounded-[var(--radius-control)] border border-line bg-raised p-3 text-xs">
              {`docker compose exec jobs /usr/local/bin/entrypoint.sh \\
  node node_modules/.bin/tsx scripts/announce-launch.ts --send --limit 5`}
            </pre>
            <p>
              Interrupting it is safe. Progress is recorded per address, so
              running it again picks up exactly the people it did not finish.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div>
      <dt className="text-sm font-semibold text-ink">{label}</dt>
      {/* Tabular figures, so the number does not jog sideways on refresh
          while a send is running. */}
      <dd className="mt-1 text-3xl font-bold tabular-nums text-ink">{value}</dd>
      <p className="mt-1 text-sm text-muted">{note}</p>
    </div>
  );
}
