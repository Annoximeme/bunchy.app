import type { Metadata } from "next";
import { requireStaff } from "@/server/modules/admin/guard";
import {
  eventBreakdown,
  eventVolume,
  onboardingFunnel,
  retentionCohorts,
  socialHealth,
} from "@/server/modules/analytics/insights";
import {
  AdminHeader,
  Cell,
  DataTable,
  Panel,
} from "@/components/admin/primitives";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireStaff();

  const [cohorts, funnel, health, volume, breakdown] = await Promise.all([
    retentionCohorts(8),
    onboardingFunnel(),
    socialHealth(),
    eventVolume(14),
    eventBreakdown(30),
  ]);

  const totalEvents = breakdown.reduce((sum, e) => sum + e.count, 0);
  const peak = Math.max(1, ...volume.map((d) => d.count));

  return (
    <>
      <AdminHeader
        title="Analytics"
        subtitle="Cohorts, funnel and network health, computed from recorded events, not current state."
      />

      {totalEvents === 0 && (
        <Panel className="mb-6 p-5">
          <p className="text-sm font-medium">No events recorded yet.</p>
          <p className="mt-1 text-sm text-muted">
            The event spine starts collecting from the moment it ships, so this
            page fills in as people use the product. Historical signups are
            backfilled from account creation dates; nothing else is
            reconstructed, because inventing history would make every number
            here untrustworthy.
          </p>
        </Panel>
      )}

      <div className="space-y-6">
        <Panel
          title="Weekly signup cohorts"
          note="share who came back and did something real"
        >
          <DataTable
            label="Weekly signup cohorts and how many of each came back"
            headers={["Cohort", "Size", "Came back after 1d", "after 7d", "after 30d"]}
            empty="No signups recorded in the last 8 weeks."
          >
            {cohorts.map((cohort) => (
              <tr key={cohort.week}>
                <Cell className="whitespace-nowrap font-medium">
                  week of {cohort.week}
                </Cell>
                <Cell className="tabular-nums">{cohort.size}</Cell>
                {([cohort.d1, cohort.d7, cohort.d30] as const).map((value, i) => (
                  <Cell key={i} className="tabular-nums">
                    {value === null ? (
                      <span className="text-muted" title="This cohort is too young to say">
                        too soon
                      </span>
                    ) : (
                      <>
                        {value}
                        <span className="ml-1.5 text-xs text-muted">
                          {cohort.size > 0
                            ? `${Math.round((value / cohort.size) * 100)}%`
                            : "-"}
                        </span>
                      </>
                    )}
                  </Cell>
                ))}
              </tr>
            ))}
          </DataTable>
          <p className="border-t border-line px-4 py-2.5 text-xs text-muted">
            &ldquo;Came back&rdquo; means connecting, messaging, joining a bunch
            or joining an activity, not opening a page. A cohort younger than
            the window reads <em>too soon</em> rather than 0%.
          </p>
        </Panel>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Onboarding funnel" note="conversion from previous step">
            <ol className="divide-y divide-line">
              {funnel.map((step) => (
                <li key={step.label} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm">{step.label}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {step.count}
                      {step.conversion !== null && (
                        <span
                          className={
                            step.conversion < 0.7
                              ? "ml-2 text-xs font-medium text-danger"
                              : "ml-2 text-xs font-medium text-muted"
                          }
                        >
                          {Math.round(step.conversion * 100)}%
                        </span>
                      )}
                      {step.dataGap && (
                        <span
                          className="ml-2 text-xs font-medium text-muted"
                          title="More people here than at the previous step. The earlier step was not recorded for some of them."
                        >
                          gap
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      /* Teal, like the volume bars below. Coral is what the
                         product uses for something you can press, and a funnel
                         is not something you can press: two quantities on one
                         screen were being drawn in two colours that mean
                         different things elsewhere. */
                      className="h-full rounded-full bg-teal/70"
                      style={{
                        width: `${
                          funnel[0] && funnel[0].count > 0
                            ? Math.round((step.count / funnel[0].count) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
            <p className="border-t border-line px-4 py-2.5 text-xs text-muted">
              Only steps taken since the event spine shipped are counted. Accounts
              that onboarded before then show at the first and last step but not
              in between. Those intermediate moments were never recorded, and guessing
              them would make this chart fiction.
            </p>
          </Panel>

          <Panel title="Network health">
            <dl className="divide-y divide-line">
              {health.map((metric) => (
                /*
                  A description list may wrap each pair in one div, and only
                  one. This used to nest a second div for the flex row and put
                  the hint in a sibling paragraph, which put the dt and dd two
                  levels down and left a <p> where the grammar allows only a
                  term or a description. The grid does the same job in one
                  level, and the hint belongs to the term it qualifies.
                */
                <div
                  key={metric.label}
                  className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 px-4 py-3"
                >
                  <dt className="text-sm text-ink-soft">
                    {metric.label}
                    {metric.hint && (
                      <span className="mt-0.5 block text-xs text-muted">
                        {metric.hint}
                      </span>
                    )}
                  </dt>
                  <dd className="text-lg font-semibold tabular-nums">
                    {metric.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Event volume" note="last 14 days">
            {volume.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">
                Nothing recorded yet.
              </p>
            ) : (
              <div className="flex h-32 items-end gap-0.5 px-4 py-4">
                {volume.map((day) => (
                  <div
                    key={day.day}
                    // A silent day is a hairline in the line colour, not a
                    // short teal bar. This chart is read to find the days
                    // where nothing fired, so those have to look like nothing.
                    className={
                      day.count === 0 ? "flex-1 rounded-t bg-line" : "flex-1 rounded-t bg-teal/60"
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
                      {day.day}: {day.count} events
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Events firing"
            note="last 30 days. A zero usually means a missing call site"
          >
            <DataTable
              label="Recorded events and how many of each"
              headers={["Event", "Count"]}
              empty="Nothing recorded yet."
            >
              {breakdown.map((event) => (
                <tr key={event.name}>
                  <Cell>
                    <code className="text-xs">{event.name}</code>
                  </Cell>
                  <Cell className="tabular-nums">{event.count}</Cell>
                </tr>
              ))}
            </DataTable>
          </Panel>
        </div>
      </div>
    </>
  );
}
