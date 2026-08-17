import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/modules/admin/guard";
import {
  DELIVERY,
  listAllForStaff,
} from "@/server/modules/announcements/service";
import { AdminHeader, Panel } from "@/components/admin/primitives";
import { AnnouncementComposer } from "@/components/admin/announcement-composer";

export const metadata: Metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

/**
 * Telling every member something.
 *
 * Admin-only, and for the same reason the site gate is: a moderator recruited
 * to work the report queue has no business interrupting the whole membership.
 *
 * This page is the operator's half of two promises made in the policies —
 * Privacy §14 and Terms §14 both say a member is told in the product before a
 * change takes effect. The composer is shaped by that: the effective date is a
 * field rather than a sentence somebody remembers to write, and the tier is
 * chosen against a description of exactly who it interrupts.
 */
export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  const announcements = await listAllForStaff();

  return (
    <>
      <AdminHeader
        title="Announcements"
        subtitle="What members are told, and when. Publishing writes to the audit trail like every other staff action."
      />

      <Panel
        title="Who each tier reaches"
        note="The tier picks the route in code, not in the copy. Nothing outside Important is allowed to interrupt anybody."
      >
        <dl className="grid gap-4 p-5 text-sm sm:grid-cols-3">
          {(
            [
              [
                "Important",
                "CRITICAL",
                "A banner on every page until dismissed. Rights, data, or whether the site is up — nothing else.",
              ],
              [
                "New",
                "NOTABLE",
                "On What's new and on the Buzz board. Pushes nothing.",
              ],
              ["Noted", "NOTED", "On the record. Findable, never shown."],
            ] as const
          ).map(([label, tier, blurb]) => (
            <div key={tier}>
              <dt className="font-semibold text-ink">
                {label}
                {DELIVERY[tier].banner && (
                  <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent-ink">
                    Interrupts
                  </span>
                )}
              </dt>
              <dd className="mt-1.5 leading-relaxed text-ink-soft">{blurb}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="Write one" className="mt-6">
        <div className="p-5">
          <AnnouncementComposer />
        </div>
      </Panel>

      <Panel
        title="Published"
        note="Withdrawing takes it off the board and leaves the audit trail alone."
        className="mt-6"
      >
        {announcements.length === 0 ? (
          <p className="p-5 text-sm text-ink-soft">Nothing published yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {announcements.map((a) => (
              <li key={a.slug} className="flex flex-wrap gap-x-4 gap-y-1 p-5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{a.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{a.summary}</p>
                </div>
                <div className="text-right text-sm text-muted">
                  <p>{a.tier}</p>
                  <p>
                    {a.publishedAt
                      ? a.publishedAt.toLocaleDateString("en-GB")
                      : "Withdrawn"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="mt-6 text-sm text-muted">
        Members read these at{" "}
        <Link href="/whats-new" className="text-accent-ink underline underline-offset-2">
          What&rsquo;s new
        </Link>
        .
      </p>
    </>
  );
}
