/**
 * The event taxonomy.
 *
 * A closed, typed set rather than free-form strings. Analytics rots the moment
 * two call sites disagree about whether the event is `connection.sent` or
 * `connection_sent`, and by the time anyone notices, the history is
 * unrecoverable. Adding an event means adding it here.
 *
 * Names are `noun.verb`, past tense, describing something that *happened*.
 *
 * What is deliberately absent: any event that exists to measure attention.
 * There is no `page.viewed`, no `session.duration`, no `feed.scrolled`. This
 * product is not optimizing for time on site (spec §29), and the surest way to
 * avoid drifting into that is to have no way to measure it.
 */

export const ANALYTICS_EVENTS = {
  // --- Acquisition ---------------------------------------------------------
  ACCOUNT_CREATED: "account.created",
  EMAIL_VERIFIED: "account.email_verified",
  /// Carries no profile reference — the profile is being erased in the same
  /// breath, and an event that outlived it pointing at a person would defeat
  /// the deletion. It counts departures and nothing else.
  ACCOUNT_DELETED: "account.deleted",

  // --- Activation: the onboarding funnel -----------------------------------
  ONBOARDING_BASICS: "onboarding.basics_completed",
  ONBOARDING_INTERESTS: "onboarding.interests_completed",
  ONBOARDING_PERSONALITY: "onboarding.personality_completed",
  ONBOARDING_GOALS: "onboarding.goals_completed",
  ONBOARDING_COMPLETED: "onboarding.completed",

  // --- Activation: the core loop -------------------------------------------
  RECOMMENDATIONS_SERVED: "discovery.recommendations_served",
  RECOMMENDATION_DISMISSED: "discovery.recommendation_dismissed",
  CONNECTION_SENT: "connection.sent",
  CONNECTION_ACCEPTED: "connection.accepted",
  CONNECTION_DECLINED: "connection.declined",
  DIRECT_MESSAGE_SENT: "message.direct_sent",
  BUNCH_MESSAGE_SENT: "message.bunch_sent",
  BUNCH_CREATED: "bunch.created",
  BUNCH_JOIN_REQUESTED: "bunch.join_requested",
  BUNCH_JOINED: "bunch.joined",
  BUNCH_LEFT: "bunch.left",
  ACTIVITY_CREATED: "activity.created",
  ACTIVITY_JOINED: "activity.joined",
  ACTIVITY_LEFT: "activity.left",

  // --- Safety --------------------------------------------------------------
  MEMBER_BLOCKED: "safety.member_blocked",
  REPORT_FILED: "safety.report_filed",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * Events that count as "this member did something real today".
 *
 * Retention is measured against these rather than against any request, because
 * a member who loaded a page and left did not come back in any sense worth
 * counting. Onboarding steps are excluded — finishing signup is activation, not
 * a return visit.
 */
export const RETENTION_EVENTS: readonly AnalyticsEventName[] = [
  ANALYTICS_EVENTS.CONNECTION_SENT,
  ANALYTICS_EVENTS.CONNECTION_ACCEPTED,
  ANALYTICS_EVENTS.DIRECT_MESSAGE_SENT,
  ANALYTICS_EVENTS.BUNCH_MESSAGE_SENT,
  ANALYTICS_EVENTS.BUNCH_CREATED,
  ANALYTICS_EVENTS.BUNCH_JOINED,
  ANALYTICS_EVENTS.ACTIVITY_CREATED,
  ANALYTICS_EVENTS.ACTIVITY_JOINED,
  ANALYTICS_EVENTS.RECOMMENDATION_DISMISSED,
];

/** The onboarding funnel, in order. Drives the drop-off chart. */
export const ONBOARDING_FUNNEL: ReadonlyArray<{
  event: AnalyticsEventName;
  label: string;
}> = [
  { event: ANALYTICS_EVENTS.ACCOUNT_CREATED, label: "Created an account" },
  { event: ANALYTICS_EVENTS.ONBOARDING_BASICS, label: "Said who they are" },
  { event: ANALYTICS_EVENTS.ONBOARDING_INTERESTS, label: "Picked interests" },
  { event: ANALYTICS_EVENTS.ONBOARDING_PERSONALITY, label: "Answered style questions" },
  { event: ANALYTICS_EVENTS.ONBOARDING_GOALS, label: "Chose what they're looking for" },
  { event: ANALYTICS_EVENTS.ONBOARDING_COMPLETED, label: "Finished onboarding" },
];
