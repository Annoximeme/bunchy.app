import { db } from "@/server/db/client";
import { Prisma } from "@/generated/prisma/client";
import {
  ANALYTICS_EVENTS,
  ONBOARDING_FUNNEL,
  RETENTION_EVENTS,
} from "@/server/modules/analytics/events";

/**
 * Questions the operational tables cannot answer.
 *
 * Cohort retention and funnel drop-off both need to know *when* something
 * happened, not just that it is currently true, which is exactly what the
 * event table adds.
 *
 * Everything here is honest about incompleteness. A cohort that joined four
 * days ago has not had the chance to be a 30-day return, so it is reported as
 * "too soon" rather than as 0%. A dashboard that shows a young cohort at 0%
 * retention is worse than one that shows nothing: it invites a decision based
 * on a number that means nothing.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RetentionCohort {
  /** ISO date of the Monday that starts the cohort week. */
  week: string;
  size: number;
  /** Null when the cohort is too young for this window to be meaningful. */
  d1: number | null;
  d7: number | null;
  d30: number | null;
}

/**
 * Weekly signup cohorts, with the share who did something real at least 1, 7
 * and 30 days later.
 *
 * "Something real" is the `RETENTION_EVENTS` list, connecting, messaging,
 * joining. Deliberately not "opened the app": a member who loaded a page and
 * left has not returned in any sense worth optimizing for, and counting it
 * would quietly make this a time-on-site metric.
 */
export async function retentionCohorts(weeks = 8): Promise<RetentionCohort[]> {
  const rows = await db.$queryRaw<
    Array<{
      week: Date;
      size: bigint;
      d1: bigint;
      d7: bigint;
      d30: bigint;
      newest_signup: Date;
    }>
  >`
    WITH signups AS (
      SELECT "profileId", MIN("occurredAt") AS joined_at
      FROM "AnalyticsEvent"
      WHERE name = ${ANALYTICS_EVENTS.ACCOUNT_CREATED}
        AND "profileId" IS NOT NULL
      GROUP BY "profileId"
    ),
    returns AS (
      SELECT DISTINCT e."profileId", date_trunc('day', e."occurredAt") AS day
      FROM "AnalyticsEvent" e
      WHERE e.name IN (${Prisma.join([...RETENTION_EVENTS])})
        AND e."profileId" IS NOT NULL
    )
    SELECT
      date_trunc('week', s.joined_at)                     AS week,
      COUNT(DISTINCT s."profileId")                       AS size,
      MAX(s.joined_at)                                    AS newest_signup,
      COUNT(DISTINCT CASE WHEN r.day >= date_trunc('day', s.joined_at) + interval '1 day'
                          THEN s."profileId" END)         AS d1,
      COUNT(DISTINCT CASE WHEN r.day >= date_trunc('day', s.joined_at) + interval '7 day'
                          THEN s."profileId" END)         AS d7,
      COUNT(DISTINCT CASE WHEN r.day >= date_trunc('day', s.joined_at) + interval '30 day'
                          THEN s."profileId" END)         AS d30
    FROM signups s
    LEFT JOIN returns r ON r."profileId" = s."profileId"
    WHERE s.joined_at >= now() - (${weeks} * interval '1 week')
    GROUP BY 1
    ORDER BY 1 DESC
  `;

  const now = Date.now();

  return rows.map((row) => {
    // Age of the *youngest* member of the cohort decides what is measurable.
    const ageDays = (now - row.newest_signup.getTime()) / DAY_MS;
    const measurable = (window: number, value: bigint) =>
      ageDays >= window ? Number(value) : null;

    return {
      week: row.week.toISOString().slice(0, 10),
      size: Number(row.size),
      d1: measurable(1, row.d1),
      d7: measurable(7, row.d7),
      d30: measurable(30, row.d30),
    };
  });
}

export interface FunnelStep {
  label: string;
  count: number;
  /** Share of the people who reached the previous step. */
  conversion: number | null;
  /**
   * True when this step has *more* people than the one before it, which is
   * structurally impossible in a real funnel and therefore means the earlier
   * step was not instrumented for some of them. Reported as a gap rather than
   * as a conversion above 100%, which would just look broken.
   */
  dataGap: boolean;
}

/**
 * Onboarding drop-off.
 *
 * Counts distinct profiles that reached each step. Reported as conversion from
 * the previous step rather than from the top, because the useful question is
 * "which screen loses people", not "how many made it all the way".
 */
export async function onboardingFunnel(): Promise<FunnelStep[]> {
  const rows = await db.analyticsEvent.groupBy({
    by: ["name"],
    where: { name: { in: ONBOARDING_FUNNEL.map((s) => s.event) } },
    _count: { profileId: true },
  });

  const counts = new Map(rows.map((r) => [r.name, r._count.profileId]));

  let previous: number | null = null;
  return ONBOARDING_FUNNEL.map((step) => {
    const count = counts.get(step.event) ?? 0;
    const dataGap = previous !== null && count > previous;
    const conversion =
      previous === null || previous === 0 || dataGap ? null : count / previous;
    previous = count;
    return { label: step.label, count, conversion, dataGap };
  });
}

export interface SocialHealth {
  label: string;
  value: string;
  hint?: string;
}

/**
 * Whether the network is actually working, as opposed to merely growing.
 *
 * These are the numbers that go wrong quietly: a product can add members every
 * week while the median member knows nobody.
 */
export async function socialHealth(): Promise<SocialHealth[]> {
  const [
    onboarded,
    accepted,
    withAnyConnection,
    inAnyBunch,
    attendedPastOffline,
    departed,
    medianRow,
  ] = await Promise.all([
    db.profile.count({ where: { onboardingStage: "COMPLETE" } }),
    db.connection.count({ where: { status: "ACCEPTED" } }),
    db.profile.count({
      where: {
        OR: [
          { sentConnections: { some: { status: "ACCEPTED" } } },
          { receivedConnections: { some: { status: "ACCEPTED" } } },
        ],
      },
    }),
    db.profile.count({
      where: { bunchMemberships: { some: { status: "ACTIVE" } } },
    }),
    // Proxy for "actually met": signed up for an in-person activity whose start
    // time has passed. Real attendance confirmation is a Phase 3 item, so this
    // is labelled as an estimate wherever it is shown.
    db.activityParticipant.count({
      where: {
        status: "JOINED",
        activity: {
          mode: "OFFLINE",
          status: { not: "CANCELLED" },
          startsAt: { lt: new Date() },
        },
      },
    }),
    db.analyticsEvent.count({
      where: { name: ANALYTICS_EVENTS.ACCOUNT_DELETED },
    }),
    db.$queryRaw<Array<{ median: number | null }>>`
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY c)::float AS median
      FROM (
        SELECT p.id,
               COUNT(conn.id) AS c
        FROM "Profile" p
        LEFT JOIN "Connection" conn
          ON conn.status = 'ACCEPTED'
         AND (conn."requesterId" = p.id OR conn."addresseeId" = p.id)
        WHERE p."onboardingStage" = 'COMPLETE'
        GROUP BY p.id
      ) counts
    `,
  ]);

  const share = (part: number, whole: number) =>
    whole === 0 ? "-" : `${Math.round((part / whole) * 100)}%`;

  return [
    {
      label: "Members with at least one connection",
      value: share(withAnyConnection, onboarded),
      hint: `${withAnyConnection} of ${onboarded} onboarded`,
    },
    {
      label: "Members in at least one bunch",
      value: share(inAnyBunch, onboarded),
      hint: `${inAnyBunch} of ${onboarded} onboarded`,
    },
    {
      label: "Median connections per member",
      value: String(medianRow[0]?.median ?? 0),
      hint: "The median, not the mean, averages hide an empty middle",
    },
    {
      label: "Accepted connections",
      value: String(accepted),
    },
    {
      label: "Likely offline meetings",
      value: String(attendedPastOffline),
      hint: "Sign-ups to in-person activities that have happened. An estimate until attendance is confirmed",
    },
    {
      label: "Members who deleted their account",
      value: String(departed),
      hint: "Counted from departure events, which carry no profile. The number is all that survives, by design",
    },
  ];
}

/**
 * Event volume per day, for spotting instrumentation gaps.
 *
 * Every day in the window, including the empty ones, which is the whole point.
 * Grouping alone returns only the days that recorded something, so the one
 * thing this chart exists to show, a day where nothing fired, was the one
 * thing it could not draw: three days of events came out as three fat bars
 * filling a panel labelled "last 14 days", and eleven silent days were simply
 * absent rather than visibly empty.
 */
export async function eventVolume(days = 14) {
  const rows = await db.$queryRaw<Array<{ day: string; count: bigint }>>`
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COUNT(e.id)::bigint AS count
    FROM generate_series(
      date_trunc('day', now() - (${days} * interval '1 day')),
      date_trunc('day', now()),
      interval '1 day'
    ) AS d(day)
    LEFT JOIN "AnalyticsEvent" e
      ON date_trunc('day', e."occurredAt") = d.day
    GROUP BY d.day
    ORDER BY d.day ASC
  `;
  return rows.map((r) => ({ day: r.day, count: Number(r.count) }));
}

/** Which events are firing at all. A zero here usually means a missing call site. */
export async function eventBreakdown(days = 30) {
  const rows = await db.analyticsEvent.groupBy({
    by: ["name"],
    where: { occurredAt: { gte: new Date(Date.now() - days * DAY_MS) } },
    _count: { name: true },
    orderBy: { _count: { name: "desc" } },
  });
  return rows.map((r) => ({ name: r.name, count: r._count.name }));
}
