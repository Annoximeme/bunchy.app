import { db } from "@/server/db/client";

/**
 * Platform metrics.
 *
 * Everything here is computed from the operational tables. That is a deliberate
 * limitation, not an oversight: without an analytics event spine there is no
 * record of *when* something first happened, only of its current state. So the
 * numbers below are honest about which are exact and which are approximations,
 * and nothing is invented to fill a gap.
 *
 * What the event spine (the next module) unlocks: true cohort retention,
 * acquisition source attribution, funnel drop-off between onboarding steps, and
 * time-to-first-connection. Until then, retention here is a *proxy* based on
 * last-active recency, and it is labelled as such everywhere it is shown.
 */

const DAY = 24 * 60 * 60 * 1000;
const since = (days: number) => new Date(Date.now() - days * DAY);

export interface MetricGroup {
  label: string;
  /** True when the figure is exact; false when it is a documented proxy. */
  exact: boolean;
  metrics: Array<{ label: string; value: number; hint?: string }>;
}

/**
 * A "meaningful connection" (spec §43), made concrete.
 *
 * The spec is explicit that a single click must not count. So this requires an
 * accepted connection *plus* evidence the two people actually engaged: a
 * conversation both of them spoke in, or an activity they both attended. That
 * is stricter than most engagement metrics and it is the point, it is the one
 * number that should be hard to game.
 */
async function countMeaningfulConnections(): Promise<number> {
  const conversations = await db.conversation.findMany({
    where: { connection: { status: "ACCEPTED" } },
    select: {
      messages: {
        where: { deletedAt: null },
        select: { senderId: true },
      },
    },
  });

  // Both sides must have said something. One person messaging into silence is
  // not a connection.
  const twoWayConversations = conversations.filter(
    (c) => new Set(c.messages.map((m) => m.senderId)).size >= 2,
  ).length;

  // The other qualifying path: they turned up to the same thing.
  const coAttended = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "Connection" c
    WHERE c.status = 'ACCEPTED'
      AND EXISTS (
        SELECT 1
        FROM "ActivityParticipant" a
        JOIN "ActivityParticipant" b
          ON a."activityId" = b."activityId"
        WHERE a."profileId" = c."requesterId"
          AND b."profileId" = c."addresseeId"
          AND a.status = 'JOINED'
          AND b.status = 'JOINED'
      )
      AND NOT EXISTS (
        SELECT 1 FROM "Conversation" conv
        WHERE conv."connectionId" = c.id
      )
  `;

  return twoWayConversations + Number(coAttended[0]?.count ?? 0);
}

export async function platformMetrics(): Promise<{
  groups: MetricGroup[];
  northStar: { value: number; label: string; definition: string };
}> {
  const [
    totalUsers,
    newUsers7,
    newUsers30,
    activeUsers7,
    activeUsers30,
    onboarded,
    verifiedEmails,
    suspended,
    banned,
    connectionsAccepted,
    connectionsPending,
    bunches,
    activeBunches,
    bunchMemberships,
    messagesTotal,
    messages7,
    activitiesUpcoming,
    activitiesPast,
    activityJoins,
    openReports,
    meaningful,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since(7) } } }),
    db.user.count({ where: { createdAt: { gte: since(30) } } }),
    db.profile.count({ where: { lastActiveAt: { gte: since(7) } } }),
    db.profile.count({ where: { lastActiveAt: { gte: since(30) } } }),
    db.profile.count({ where: { onboardingStage: "COMPLETE" } }),
    db.user.count({ where: { emailVerifiedAt: { not: null } } }),
    db.user.count({ where: { status: "SUSPENDED" } }),
    db.user.count({ where: { status: "BANNED" } }),
    db.connection.count({ where: { status: "ACCEPTED" } }),
    db.connection.count({ where: { status: "PENDING" } }),
    db.bunch.count({ where: { archivedAt: null } }),
    db.bunch.count({ where: { archivedAt: null, activityScore: { gt: 0.1 } } }),
    db.bunchMembership.count({ where: { status: "ACTIVE" } }),
    db.bunchMessage.count({ where: { kind: "TEXT", deletedAt: null } }),
    db.bunchMessage.count({
      where: { kind: "TEXT", deletedAt: null, createdAt: { gte: since(7) } },
    }),
    db.activity.count({
      where: { status: "SCHEDULED", startsAt: { gte: new Date() } },
    }),
    db.activity.count({ where: { startsAt: { lt: new Date() } } }),
    db.activityParticipant.count({ where: { status: "JOINED" } }),
    db.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    countMeaningfulConnections(),
  ]);

  const perActive = activeUsers30 > 0 ? meaningful / activeUsers30 : 0;

  return {
    northStar: {
      value: Math.round(perActive * 100) / 100,
      label: "Meaningful connections per active member",
      definition:
        "Accepted connections where both people have spoken in the conversation, or both attended the same activity, divided by members active in the last 30 days.",
    },
    groups: [
      {
        label: "Acquisition",
        exact: true,
        metrics: [
          { label: "Total accounts", value: totalUsers },
          { label: "New (7 days)", value: newUsers7 },
          { label: "New (30 days)", value: newUsers30 },
          {
            label: "Email verified",
            value: verifiedEmails,
            hint: `${percent(verifiedEmails, totalUsers)} of accounts`,
          },
        ],
      },
      {
        label: "Activation",
        exact: true,
        metrics: [
          {
            label: "Completed onboarding",
            value: onboarded,
            hint: `${percent(onboarded, totalUsers)} of accounts`,
          },
          { label: "Accepted connections", value: connectionsAccepted },
          { label: "Pending requests", value: connectionsPending },
          { label: "Bunch memberships", value: bunchMemberships },
          { label: "Activity sign-ups", value: activityJoins },
        ],
      },
      {
        label: "Engagement (proxy)",
        exact: false,
        metrics: [
          {
            label: "Active in 7 days",
            value: activeUsers7,
            hint: "By last-active timestamp, not a true cohort",
          },
          { label: "Active in 30 days", value: activeUsers30 },
          { label: "Messages (7 days)", value: messages7 },
          { label: "Messages (all time)", value: messagesTotal },
        ],
      },
      {
        label: "Community health",
        exact: true,
        metrics: [
          { label: "Bunches", value: bunches },
          {
            label: "Bunches with recent chat",
            value: activeBunches,
            hint: `${percent(activeBunches, bunches)} of bunches`,
          },
          { label: "Upcoming activities", value: activitiesUpcoming },
          { label: "Activities held", value: activitiesPast },
        ],
      },
      {
        label: "Safety",
        exact: true,
        metrics: [
          { label: "Open reports", value: openReports },
          { label: "Suspended accounts", value: suspended },
          { label: "Banned accounts", value: banned },
        ],
      },
    ],
  };
}

function percent(part: number, whole: number): string {
  if (whole === 0) return "-";
  return `${Math.round((part / whole) * 100)}%`;
}

/** Signups per day, for a simple trend line on the dashboard. */
export async function signupTrend(days = 30) {
  const rows = await db.$queryRaw<Array<{ day: Date; count: bigint }>>`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
    FROM "User"
    WHERE "createdAt" >= ${since(days)}
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    count: Number(r.count),
  }));
}
