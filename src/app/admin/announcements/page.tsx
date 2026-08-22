import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/modules/admin/guard";
import {
  DELIVERY,
  getForStaff,
  listAllForStaff,
  type AnnouncementState,
} from "@/server/modules/announcements/service";
import { blocksToSource } from "@/server/modules/announcements/blocks";
import { AdminHeader, Panel } from "@/components/admin/primitives";
import { AnnouncementComposer } from "@/components/admin/announcement-composer";
import { AnnouncementWithdraw } from "@/components/admin/announcement-withdraw";

export const metadata: Metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

/**
 * Telling every member something.
 *
 * Admin-only, and for the same reason the site gate is: a moderator recruited
 * to work the report queue has no business interrupting the whole membership.
 *
 * This page is the operator's half of two promises made in the policies,
 * Privacy §14 and Terms §14 both say a member is told in the product before a
 * change takes effect. The composer is shaped by that: the effective date is a
 * field rather than a sentence somebody remembers to write, and the tier is
 * chosen against a description of exactly who it interrupts.
 *
 * The list carries two counts per row, and they are the two questions an
 * operator has straight after publishing: how many people it was emailed to,
 * and how many have read it. Both come from tables rather than from an
 * estimate, so "did the notice actually go out" has an answer that is not a
 * guess.
 */

const STATE: Record<AnnouncementState, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-surface-sunken text-muted" },
  scheduled: { label: "Scheduled", className: "bg-yellow-soft text-yellow-ink" },
  published: { label: "Published", className: "bg-mint-soft text-mint-ink" },
};

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  const { edit } = await searchParams;

  const [announcements, editing] = await Promise.all([
    listAllForStaff(),
    // A bad slug in the query string opens the empty composer rather than
    // erroring. This is a URL people will edit by hand.
    edit ? getForStaff(edit).catch(() => null) : Promise.resolve(null),
  ]);

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
        <dl className="grid grid-cols-1 gap-4 p-5 text-sm sm:grid-cols-3">
          {(
            [
              [
                "Important",
                "CRITICAL",
                "A banner on every page until dismissed, and one email to every member with a verified address. Rights, data, or whether the site is up, and nothing else.",
              ],
              [
                "New",
                "NOTABLE",
                "On What's new, with an unread mark in the nav. Pushes nothing.",
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
                {DELIVERY[tier].mayEmail && (
                  <span className="ml-1.5 rounded-full bg-purple-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-ink">
                    Emails
                  </span>
                )}
              </dt>
              <dd className="mt-1.5 leading-relaxed text-ink-soft">{blurb}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title={editing ? "Correct it" : "Write one"} className="mt-6">
        <div className="p-5">
          {/*
            Keyed on the slug so switching between announcements to edit
            rebuilds the form. Without it React keeps the mounted component and
            its state, and the second announcement opens holding the first
            one's text.
          */}
          <AnnouncementComposer
            key={editing?.slug ?? "new"}
            initial={
              editing
                ? {
                    slug: editing.slug,
                    title: editing.title,
                    summary: editing.summary,
                    bodyText: blocksToSource(editing.body),
                    tier: editing.tier,
                    linkHref: editing.linkHref,
                    linkLabel: editing.linkLabel,
                    effectiveAt: editing.effectiveAt,
                    publicVisible: editing.publicVisible,
                    state: editing.state,
                  }
                : undefined
            }
          />
        </div>
      </Panel>

      <Panel
        title="The record"
        note="Drafts and scheduled notices are here too. Withdrawing takes something off the board and leaves the audit trail alone."
        className="mt-6"
      >
        {announcements.length === 0 ? (
          <p className="p-5 text-sm text-ink-soft">Nothing written yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {announcements.map((a) => (
              <li key={a.slug} className="flex flex-wrap gap-x-4 gap-y-2 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${STATE[a.state].className}`}
                    >
                      {STATE[a.state].label}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      {a.tier}
                    </span>
                    {!a.publicVisible && (
                      <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-muted">
                        Members only
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 font-semibold text-ink">{a.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{a.summary}</p>

                  <p className="mt-2 text-xs text-muted">
                    {a.state === "scheduled" && a.publishedAt
                      ? `Goes out ${a.publishedAt.toLocaleString("en-GB")}`
                      : a.state === "published" && a.publishedAt
                        ? `Published ${a.publishedAt.toLocaleDateString("en-GB")}`
                        : "Not published"}
                    {a.effectiveAt &&
                      ` · takes effect ${a.effectiveAt.toLocaleDateString("en-GB")}`}
                    {/* Only meaningful for the tier that mails, and stating it
                        as a count rather than as "sent" is deliberate: the job
                        works through a budget per pass, so a large membership
                        is part-way through for a while. */}
                    {DELIVERY[a.tier].mayEmail && ` · ${a.emailCount} emailed`}
                    {` · ${a.readCount} read`}
                  </p>

                  {a.state !== "draft" && <AnnouncementWithdraw slug={a.slug} />}
                </div>

                <div className="flex shrink-0 items-start gap-4 text-sm">
                  <Link
                    href={`/admin/announcements?edit=${a.slug}`}
                    className="font-medium text-accent-ink underline underline-offset-2"
                  >
                    Edit
                  </Link>
                  {a.state === "published" && (
                    <Link
                      href={`/whats-new/${a.slug}`}
                      className="font-medium text-muted underline underline-offset-2 hover:text-ink"
                    >
                      View
                    </Link>
                  )}
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
        . The public ones are also on the{" "}
        <Link href="/changelog" className="text-accent-ink underline underline-offset-2">
          changelog
        </Link>{" "}
        and its Atom feed.
      </p>
    </>
  );
}
