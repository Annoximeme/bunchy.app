import type { Metadata } from "next";
import { Link } from "@/components/link";
import { requireStaff } from "@/server/modules/admin/guard";
import { platformMetrics, signupTrend } from "@/server/modules/admin/metrics";
import { countReportsByStatus } from "@/server/modules/admin/reports";
import { AdminHeader, Panel } from "@/components/admin/primitives";

export const metadata: Metadata = { title: "Staff overview" };
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireStaff();

  const [{ groups, northStar }, trend, reportCounts] = await Promise.all([
    platformMetrics(),
    signupTrend(30),
    countReportsByStatus(),
  ]);

  const openReports = (reportCounts.OPEN ?? 0) + (reportCounts.REVIEWING ?? 0);
  const peak = Math.max(1, ...trend.map((d) => d.count));

  return (
    <>
      <AdminHeader
        title="Overview"
        subtitle="How the platform is actually doing."
      />

      {openReports > 0 && (
        <Link
          href="/admin/reports"
          className="mb-6 flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-danger/25 bg-danger-soft px-4 py-3 transition-opacity hover:opacity-90"
        >
          <span className="text-sm font-medium text-danger">
            {openReports} report{openReports === 1 ? "" : "s"} waiting for review
          </span>
          <span className="text-sm text-danger">Open the queue →</span>
        </Link>
      )}

      {/* North star, given the prominence the spec asks for. */}
      <Panel className="mb-6 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          North star
        </p>
        <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">
          {northStar.value}
        </p>
        <p className="mt-1 text-sm font-medium">{northStar.label}</p>
        <p className="mt-2 max-w-2xl text-sm text-muted">{northStar.definition}</p>
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <Panel
            key={group.label}
            title={group.label}
            note={group.exact ? undefined : "approximate"}
          >
            <dl className="divide-y divide-line">
              {group.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="flex items-baseline justify-between gap-4 px-4 py-2.5"
                >
                  <dt className="text-sm text-ink-soft">
                    {metric.label}
                    {metric.hint && (
                      <span className="ml-2 text-xs text-muted">{metric.hint}</span>
                    )}
                  </dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {metric.value.toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        ))}

        <Panel title="Signups" note="last 30 days">
          {trend.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">
              No signups in the last 30 days.
            </p>
          ) : (
            /*
              One bar per day in the window, empty days included. A day with
              nothing gets a hairline in the line colour rather than a short
              coral bar, so "no signups" cannot be misread as "a few".
            */
            <div className="flex h-40 items-end gap-0.5 px-4 py-4">
              {trend.map((day) => (
                <div
                  key={day.day}
                  className={
                    day.count === 0
                      ? "flex-1 rounded-t bg-line"
                      : "flex-1 rounded-t bg-accent/70 transition-colors hover:bg-accent"
                  }
                  style={{
                    height:
                      day.count === 0
                        ? "2px"
                        : `${Math.max(6, (day.count / peak) * 100)}%`,
                  }}
                  title={`${day.day}: ${day.count}`}
                >
                  <span className="sr-only">
                    {day.day}: {day.count} signups
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <p className="mt-6 text-xs text-muted">
        Figures marked <em>approximate</em> are derived from current state rather
        than recorded events. True cohort retention, onboarding drop-off and
        network health live on{" "}
        <Link href="/admin/analytics" className="text-accent-ink underline underline-offset-2">
          Analytics
        </Link>
        , which is computed from the event log.
      </p>
    </>
  );
}
