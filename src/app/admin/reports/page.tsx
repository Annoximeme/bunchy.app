import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/server/modules/admin/guard";
import { countReportsByStatus, listReports } from "@/server/modules/admin/reports";
import { relativeTime } from "@/lib/format";
import { AdminHeader, Panel, StatusPill } from "@/components/admin/primitives";
import { ActionRow, AdminAction } from "@/components/admin/action-button";
import type { ReportStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const TABS: Array<{ status?: ReportStatus; label: string }> = [
  { status: "OPEN", label: "Open" },
  { status: "REVIEWING", label: "Reviewing" },
  { status: "ACTIONED", label: "Actioned" },
  { status: "DISMISSED", label: "Dismissed" },
  { status: undefined, label: "All" },
];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const status = TABS.find((t) => t.status === params.status)?.status;

  const [{ reports }, counts] = await Promise.all([
    listReports({ status: params.status ? status : "OPEN", limit: 50 }),
    countReportsByStatus(),
  ]);

  const activeStatus = params.status ?? "OPEN";

  return (
    <>
      <AdminHeader
        title="Reports"
        subtitle="Oldest first. Nothing is auto-actioned — a coordinated group filing reports must not be able to mute anyone."
      />

      <nav className="mb-5 flex flex-wrap gap-1" aria-label="Report status">
        {TABS.map((tab) => {
          const key = tab.status ?? "ALL";
          const active = activeStatus === key;
          return (
            <Link
              key={key}
              href={tab.status ? `/admin/reports?status=${tab.status}` : "/admin/reports?status=ALL"}
              className={
                active
                  ? "rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-full px-3 py-1.5 text-sm text-ink-soft hover:bg-surface"
              }
            >
              {tab.label}
              {tab.status && (counts[tab.status] ?? 0) > 0 && (
                <span className="ml-1.5 opacity-70">{counts[tab.status]}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {reports.length === 0 ? (
        <Panel>
          <p className="px-4 py-14 text-center text-sm text-muted">
            Nothing here. That is the good outcome.
          </p>
        </Panel>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Panel key={report.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={report.status} />
                    <span className="text-sm font-semibold">
                      {report.reason.replace(/_/g, " ").toLowerCase()}
                    </span>
                    <span className="text-xs text-muted">
                      {report.targetType.replace(/_/g, " ").toLowerCase()} ·{" "}
                      {relativeTime(report.createdAt)}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-muted">
                    {/* Null once the reporter has deleted their account. The
                        report deliberately survives them, so say so plainly
                        rather than rendering a blank name. */}
                    Reported by{" "}
                    {report.reporter?.displayName ?? "a member who has since left"}
                    {report.reported && (
                      <>
                        {" · about "}
                        <Link
                          href={`/admin/users?q=${encodeURIComponent(report.reported.username)}`}
                          className="text-accent-ink hover:underline"
                        >
                          {report.reported.displayName}
                        </Link>
                        <span className="ml-1.5">
                          <StatusPill status={report.reported.status} />
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {report.details && (
                <p className="mt-3 rounded-[var(--radius-control)] bg-surface-sunken p-3 text-sm text-ink-soft">
                  &ldquo;{report.details}&rdquo;
                </p>
              )}

              {/* The reported content itself, so a decision needs no extra clicks. */}
              {report.target ? (
                <div className="mt-3 rounded-[var(--radius-control)] border border-line p-3">
                  <p className="text-xs font-medium text-muted">
                    {report.target.context}
                    {report.target.author && ` · ${report.target.author}`}
                    {report.target.removed && " · already removed"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                    {report.target.body ?? "(no text)"}
                  </p>
                  {report.target.href && (
                    <Link
                      href={report.target.href}
                      className="mt-2 inline-block text-xs text-accent-ink hover:underline"
                    >
                      Open in the app →
                    </Link>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  The reported content no longer exists.
                </p>
              )}

              <div className="mt-4 border-t border-line pt-3">
                <ActionRow>
                  <AdminAction
                    label="Mark reviewing"
                    endpoint={`/api/admin/reports/${report.id}`}
                    method="PATCH"
                    payload={{ decision: "REVIEWING" }}
                    requiresReason={false}
                    confirmLabel="Claim this report"
                  />
                  <AdminAction
                    label="Action"
                    endpoint={`/api/admin/reports/${report.id}`}
                    method="PATCH"
                    payload={{ decision: "ACTIONED" }}
                    confirmLabel="Record that you acted on this"
                    requiresReason={false}
                    extraField={{
                      name: "note",
                      label: "What did you do?",
                      type: "text",
                      placeholder: "Removed the message and warned the author",
                    }}
                  />
                  <AdminAction
                    label="Dismiss"
                    endpoint={`/api/admin/reports/${report.id}`}
                    method="PATCH"
                    payload={{ decision: "DISMISSED" }}
                    confirmLabel="Dismiss without action"
                    requiresReason={false}
                    extraField={{
                      name: "note",
                      label: "Why not?",
                      type: "text",
                      placeholder: "No rule broken",
                    }}
                  />

                  {report.targetType === "BUNCH_MESSAGE" &&
                    report.target &&
                    !report.target.removed && (
                      <AdminAction
                        label="Remove message"
                        endpoint="/api/admin/content"
                        payload={{
                          action: "remove_message",
                          messageId: report.targetId,
                        }}
                        danger
                        confirmLabel="Remove this message"
                      />
                    )}

                  {report.reported && (
                    <AdminAction
                      label="Suspend author"
                      endpoint={`/api/admin/users/${report.reported.userId}`}
                      method="PATCH"
                      payload={{ action: "suspend" }}
                      danger
                      confirmLabel={`Suspend ${report.reported.displayName}`}
                      extraField={{
                        name: "days",
                        label: "Days (blank = indefinite)",
                        type: "number",
                        placeholder: "7",
                        emptyValue: null,
                      }}
                    />
                  )}
                </ActionRow>
              </div>

              {report.reviewNote && (
                <p className="mt-3 text-xs text-muted">
                  Note: {report.reviewNote}
                </p>
              )}
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
