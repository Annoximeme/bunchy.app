import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/modules/admin/guard";
import {
  applicationCounts,
  listApplications,
} from "@/server/modules/admin/moderator-applications";
import { AdminHeader, Panel, StatusPill } from "@/components/admin/primitives";
import { ApplicationDecision } from "@/components/admin/application-decision";

export const metadata: Metadata = { title: "Moderator applications" };
export const dynamic = "force-dynamic";

/**
 * The volunteer queue.
 *
 * Admin-only rather than staff-wide: deciding who becomes a moderator is a
 * staffing decision, and a moderator reviewing applications to their own team is
 * a conflict nobody needs on day one.
 *
 * Accepting here does not grant the role. It marks a decision to talk to
 * somebody; making them staff is `npm run role`, which needs database access —
 * the same bar as the first admin, and for the same reason. A queue that can
 * promote people is a queue worth compromising.
 */
export default async function AdminModeratorsPage() {
  await requireAdmin();
  const [applications, counts] = await Promise.all([
    listApplications(),
    applicationCounts(),
  ]);

  return (
    <>
      <AdminHeader
        title="Moderator applications"
        subtitle="People offering to work the report queue. Accepting one is a decision to talk to them, not a promotion — the role is still granted from the CLI."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(["NEW", "REVIEWING", "ACCEPTED", "DECLINED", "WITHDRAWN"] as const).map(
          (status) => (
            <span
              key={status}
              className="rounded-full border border-line px-3 py-1.5 text-xs text-muted"
            >
              {status.toLowerCase()}: {counts[status] ?? 0}
            </span>
          ),
        )}
      </div>

      {applications.length === 0 ? (
        <Panel className="p-5">
          <p className="text-sm font-medium">No applications yet.</p>
          <p className="mt-1 text-sm text-muted">
            The page is at{" "}
            <Link href="/moderators" className="text-accent-ink underline underline-offset-2">
              /moderators
            </Link>
            . It is linked from the footer; nothing else points at it yet.
          </p>
        </Panel>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Panel key={application.id}>
              <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href={`/u/${application.profile.username}`}
                      className="font-semibold hover:underline"
                    >
                      {application.profile.displayName}
                    </Link>
                    <span className="text-sm text-muted">
                      @{application.profile.username}
                    </span>
                    <StatusPill status={application.status} />
                  </div>

                  <p className="mt-1 text-xs text-muted">
                    {application.profile.cityLabel ??
                      application.profile.countryCode ??
                      "location not set"}{" "}
                    · member since{" "}
                    {new Date(
                      application.profile.createdAt,
                    ).toLocaleDateString()}{" "}
                    · offering {application.hoursPerWeek}h/week · applied{" "}
                    {new Date(application.createdAt).toLocaleDateString()}
                  </p>

                  <p className="mt-4 whitespace-pre-wrap text-sm text-ink-soft">
                    {application.motivation}
                  </p>

                  {application.experience && (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted">
                      <span className="font-medium text-ink-soft">
                        Experience:{" "}
                      </span>
                      {application.experience}
                    </p>
                  )}

                  {application.reviewNote && (
                    <p className="mt-3 rounded-[var(--radius-control)] bg-surface-sunken px-3 py-2 text-xs text-muted">
                      Note: {application.reviewNote}
                    </p>
                  )}
                </div>

                <ApplicationDecision
                  id={application.id}
                  status={application.status}
                  username={application.profile.username}
                />
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
