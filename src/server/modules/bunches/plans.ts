import { db } from "@/server/db/client";
import type { PlanVoteResponse } from "@/generated/prisma/enums";
import { conflict, forbidden, notFound, validationFailed } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";
import { notify } from "@/server/modules/notifications/service";
import { createActivity } from "@/server/modules/activities/service";
import { requireParticipant } from "@/server/modules/messaging/direct";
import type { SocialPlanSelect } from "@/generated/prisma/models/SocialPlan";
import {
  CHALLENGES,
  findChallenge,
  nextIcebreaker,
} from "@/server/modules/bunches/prompts";

/**
 * Social plans, icebreakers and challenges, the three things a bunch does to
 * itself.
 *
 * They share a file because they share the one rule that matters: **every one
 * of them is somebody pressing a button.** Nothing here runs on a schedule,
 * nothing arrives unrequested, and nothing commits the group to anything. A
 * plan reaching a decision does not create an activity; somebody has to choose
 * to make one, which is §10's "do not automatically book or purchase anything".
 *
 * Membership is checked on every call. A bunch is the one place in this product
 * where content is genuinely private, and that guarantee is worth re-asserting
 * per operation rather than trusting a page to have done it.
 */

const MAX_OPTIONS = 6;
const MIN_OPTIONS = 2;

// --- Guards -----------------------------------------------------------------

async function requireMember(bunchId: string, profileId: string) {
  const membership = await db.bunchMembership.findUnique({
    where: { bunchId_profileId: { bunchId, profileId } },
    select: { role: true, status: true },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw forbidden("You're not a member of this bunch.");
  }
  return membership;
}

async function requireModerator(bunchId: string, profileId: string) {
  const membership = await requireMember(bunchId, profileId);
  if (membership.role !== "OWNER" && membership.role !== "MODERATOR") {
    throw forbidden("Only moderators can do that.");
  }
  return membership;
}

/** A plan belongs to one of these two, never both, see the schema. */
export interface PlanOwner {
  bunchId: string | null;
  conversationId: string | null;
}

/**
 * Who may act on a plan, whichever kind of plan it is.
 *
 * The two kinds have genuinely different permission models rather than one
 * being a special case of the other. In a bunch, deciding a time for nine
 * people is an act that needs standing, so it is the proposer or a moderator.
 * Between two people there are no ranks to have: either of them proposed it,
 * both of them are voting on it, and requiring "standing" would mean one half
 * of a pair could settle a Thursday and the other could not.
 *
 * `standing` is therefore only consulted for a bunch.
 */
async function requirePlanActor(
  owner: PlanOwner,
  profileId: string,
  standing: "anyone" | "decider" = "anyone",
): Promise<void> {
  if (owner.conversationId) {
    await requireParticipant(owner.conversationId, profileId);
    return;
  }
  if (!owner.bunchId) throw notFound("That plan no longer exists.");
  if (standing === "decider") await requireModerator(owner.bunchId, profileId);
  else await requireMember(owner.bunchId, profileId);
}

// --- Social plans -----------------------------------------------------------

export interface PlanOptionView {
  id: string;
  startsAt: Date;
  label: string | null;
  yes: number;
  maybe: number;
  no: number;
  /** What this viewer said, if anything. */
  yourResponse: PlanVoteResponse | null;
}

export interface PlanView {
  id: string;
  title: string;
  note: string | null;
  status: "OPEN" | "DECIDED" | "CANCELLED";
  createdBy: string | null;
  memberCount: number;
  options: PlanOptionView[];
  decidedOptionId: string | null;
  activityId: string | null;
  /** "Saturday works for 7 of 9", computed, never stored. */
  best: { optionId: string; yes: number; of: number } | null;
}

export async function createPlan(
  bunchId: string,
  profileId: string,
  input: { title: string; note?: string | null; options: Array<{ startsAt: Date; label?: string | null }> },
): Promise<{ id: string }> {
  await requireMember(bunchId, profileId);
  await consume("activityCreate", profileId);

  const title = input.title.trim();
  if (title.length < 3) throw validationFailed("Give the plan a name.");

  const options = input.options.filter((o) => Number.isFinite(o.startsAt.getTime()));
  if (options.length < MIN_OPTIONS) {
    throw validationFailed("Offer at least two times, or people have nothing to choose between.");
  }
  if (options.length > MAX_OPTIONS) {
    throw validationFailed(`Six options is plenty, more and nobody answers.`);
  }
  const now = Date.now();
  if (options.some((o) => o.startsAt.getTime() < now - 3_600_000)) {
    throw validationFailed("Those times have already passed.");
  }

  const plan = await db.socialPlan.create({
    data: {
      bunchId,
      createdById: profileId,
      title,
      note: input.note?.trim() || null,
      options: {
        create: options.map((o) => ({
          startsAt: o.startsAt,
          label: o.label?.trim() || null,
        })),
      },
    },
    select: { id: true },
  });

  // The chat is where the bunch lives, so a plan announces itself there rather
  // than only existing on a tab somebody has to find.
  await db.bunchMessage.create({
    data: {
      bunchId,
      kind: "SYSTEM",
      body: `${title}. A few times to choose between.`,
    },
  });

  track({
    name: ANALYTICS_EVENTS.PLAN_CREATED,
    profileId,
    properties: { bunchId, planId: plan.id, options: options.length },
  });

  return plan;
}

export async function vote(
  optionId: string,
  profileId: string,
  response: PlanVoteResponse,
): Promise<void> {
  const option = await db.socialPlanOption.findUnique({
    where: { id: optionId },
    select: {
      plan: {
        select: { id: true, bunchId: true, conversationId: true, status: true },
      },
    },
  });
  if (!option) throw notFound("That option no longer exists.");
  await requirePlanActor(option.plan, profileId);
  if (option.plan.status !== "OPEN") {
    throw conflict("That plan has already been decided.");
  }

  await db.socialPlanVote.upsert({
    where: { optionId_profileId: { optionId, profileId } },
    create: { optionId, profileId, response },
    update: { response },
  });

  track({
    name: ANALYTICS_EVENTS.PLAN_VOTED,
    profileId,
    properties: { planId: option.plan.id, response },
  });
}

/**
 * Settles on a time.
 *
 * Deliberately a separate step from creating the activity. A plan that reached
 * a decision is a group agreeing on a day; an activity is a commitment with a
 * participant list and reminders attached. §10 says nothing gets booked
 * automatically, and the honest reading of that is that the two are different
 * actions with different buttons.
 */
export async function decidePlan(
  planId: string,
  profileId: string,
  optionId: string,
): Promise<void> {
  const plan = await db.socialPlan.findUnique({
    where: { id: planId },
    select: {
      bunchId: true,
      conversationId: true,
      status: true,
      createdById: true,
      title: true,
      options: { select: { id: true, startsAt: true } },
    },
  });
  if (!plan) throw notFound("That plan no longer exists.");

  // The person who proposed it, or any moderator. Not just anyone: deciding
  // for a group is exactly the kind of thing that should need standing. A
  // plan between two people has no ranks, so `requirePlanActor` ignores this.
  await requirePlanActor(
    plan,
    profileId,
    plan.createdById === profileId ? "anyone" : "decider",
  );
  if (plan.status !== "OPEN") throw conflict("That plan is already settled.");

  const chosen = plan.options.find((o) => o.id === optionId);
  if (!chosen) throw validationFailed("That option is not part of this plan.");

  await db.socialPlan.update({
    where: { id: planId },
    data: { status: "DECIDED", decidedOptionId: optionId },
  });

  // No formatted time in the body. The server does not know the reader's
  // timezone, and `toUTCString()` showed a Brussels member "19:30 GMT" for the
  // 19:30 they had picked. The plan card renders the time client-side, in
  // their own zone, where it is correct.
  // Only a bunch has a room to announce it in. A pair sees the plan card
  // change in place, above a conversation both of them are already reading,
  // so a message saying what they can both see would be noise.
  if (plan.bunchId) {
    await db.bunchMessage.create({
      data: {
        bunchId: plan.bunchId,
        kind: "SYSTEM",
        body: `${plan.title}. A time has been settled.`,
      },
    });
  }
}

/** Turns a decided plan into a real activity. A second, explicit press. */
export async function planToActivity(
  planId: string,
  profileId: string,
  input: { description: string; mode: "ONLINE" | "OFFLINE"; location?: string | null },
): Promise<{ activityId: string }> {
  const plan = await db.socialPlan.findUnique({
    where: { id: planId },
    select: {
      bunchId: true,
      conversationId: true,
      title: true,
      status: true,
      activityId: true,
      decidedOptionId: true,
      options: { select: { id: true, startsAt: true } },
      bunch: { select: { maxMembers: true, cityLabel: true, countryCode: true } },
    },
  });
  if (!plan) throw notFound("That plan no longer exists.");
  await requirePlanActor(plan, profileId);

  if (plan.status !== "DECIDED") throw conflict("Settle on a time first.");
  if (plan.activityId) throw conflict("That plan already has an activity.");

  const chosen = plan.options.find((o) => o.id === plan.decidedOptionId);
  if (!chosen) throw conflict("That plan has no chosen time.");

  // Goes through the ordinary activity service, so the bunch-membership check,
  // the invite notifications and the reminder job all apply, this is a normal
  // activity that happens to have come from a vote.
  const description = input.description.trim();
  if (description.length < 10) {
    throw validationFailed("A line or two about the plan, so people know what they're agreeing to.");
  }
  if (input.mode === "OFFLINE" && !input.location?.trim()) {
    throw validationFailed("Where is it happening?");
  }

  const activity = await createActivity(profileId, {
    title: plan.title,
    description,
    startsAt: chosen.startsAt,
    mode: input.mode,
    ...(input.location?.trim() ? { locationLabel: input.location.trim() } : {}),
    ...(plan.bunch?.cityLabel ? { cityLabel: plan.bunch.cityLabel } : {}),
    ...(plan.bunch?.countryCode ? { countryCode: plan.bunch.countryCode } : {}),
    // Two seats for a plan between two people, and no bunch to hang it on.
    // Two is not a limit imposed on them: it is what the plan was.
    maxParticipants: plan.bunch?.maxMembers ?? 2,
    ...(plan.bunchId ? { bunchId: plan.bunchId } : {}),
  });

  await db.socialPlan.update({
    where: { id: planId },
    data: { activityId: activity.id },
  });

  // A bunch is told in its own room by `createActivity`. The other half of a
  // pair has no room, so they are told directly, once, about a thing they
  // already agreed to.
  if (plan.conversationId) {
    const other = await requireParticipant(plan.conversationId, profileId);
    await notify({
      profileId: other,
      type: "ACTIVITY_INVITE",
      title: `${plan.title} is on`,
      body: "The time you agreed is now a real plan. Take your seat.",
      linkPath: `/activities/${activity.id}`,
    });
  }

  return { activityId: activity.id };
}

export async function cancelPlan(planId: string, profileId: string): Promise<void> {
  const plan = await db.socialPlan.findUnique({
    where: { id: planId },
    select: { bunchId: true, conversationId: true, createdById: true },
  });
  if (!plan) throw notFound("That plan no longer exists.");

  await requirePlanActor(
    plan,
    profileId,
    plan.createdById === profileId ? "anyone" : "decider",
  );

  await db.socialPlan.update({
    where: { id: planId },
    data: { status: "CANCELLED" },
  });
}

/**
 * The rows a plan view is built from.
 *
 * Written out rather than inferred, so the pair planner can ask for the same
 * shape and get the same view. Both kinds of plan render the same card, and
 * that is not a coincidence to be maintained by hand: a vote between three
 * evenings looks the same whether nine people or two are voting.
 */
export const PLAN_VIEW_SELECT = {
  id: true,
  title: true,
  note: true,
  status: true,
  decidedOptionId: true,
  activityId: true,
  createdBy: { select: { displayName: true } },
  options: {
    select: {
      id: true,
      startsAt: true,
      label: true,
      votes: { select: { profileId: true, response: true } },
    },
    orderBy: { startsAt: "asc" as const },
  },
} as const satisfies SocialPlanSelect;

interface PlanViewRow {
  id: string;
  title: string;
  note: string | null;
  status: "OPEN" | "DECIDED" | "CANCELLED";
  decidedOptionId: string | null;
  activityId: string | null;
  createdBy: { displayName: string } | null;
  options: Array<{
    id: string;
    startsAt: Date;
    label: string | null;
    votes: Array<{ profileId: string; response: PlanVoteResponse }>;
  }>;
}

/**
 * One plan as the card wants it: counts totalled, the viewer's own answer
 * picked out, and the best option named only once somebody has said yes.
 *
 * `memberCount` is who the plan is being decided among, which is the bunch's
 * active members or, for a plan between two people, two.
 */
export function toPlanView(row: PlanViewRow, memberCount: number, profileId: string): PlanView {
  const options: PlanOptionView[] = row.options.map((option) => ({
    id: option.id,
    startsAt: option.startsAt,
    label: option.label,
    yes: option.votes.filter((v) => v.response === "YES").length,
    maybe: option.votes.filter((v) => v.response === "MAYBE").length,
    no: option.votes.filter((v) => v.response === "NO").length,
    yourResponse:
      option.votes.find((v) => v.profileId === profileId)?.response ?? null,
  }));

  const best = options.reduce<PlanOptionView | null>(
    (winner, option) => (winner === null || option.yes > winner.yes ? option : winner),
    null,
  );

  return {
    id: row.id,
    title: row.title,
    note: row.note,
    status: row.status,
    createdBy: row.createdBy?.displayName ?? null,
    memberCount,
    options,
    decidedOptionId: row.decidedOptionId,
    activityId: row.activityId,
    // Only worth reporting a winner once somebody has actually said yes.
    best: best && best.yes > 0 ? { optionId: best.id, yes: best.yes, of: memberCount } : null,
  };
}

/** Open and recently decided plans, with the counts already worked out. */
export async function listPlans(
  bunchId: string,
  profileId: string,
): Promise<PlanView[]> {
  await requireMember(bunchId, profileId);

  const [plans, memberCount] = await Promise.all([
    db.socialPlan.findMany({
      where: { bunchId, status: { in: ["OPEN", "DECIDED"] } },
      select: PLAN_VIEW_SELECT,
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.bunchMembership.count({ where: { bunchId, status: "ACTIVE" } }),
  ]);

  return plans.map((plan) => toPlanView(plan, memberCount, profileId));
}

// --- Icebreakers ------------------------------------------------------------

/**
 * Asks the bunch a question.
 *
 * The question goes into the chat as a PROMPT message and the answers are
 * ordinary replies. There is nowhere to store an answer, which is precisely
 * how §11's "do not build permanent personality profiles from casual answers"
 * is kept: what somebody says here is a chat message, deleted and exported and
 * moderated exactly like any other.
 */
export async function askIcebreaker(
  bunchId: string,
  profileId: string,
): Promise<{ question: string } | { question: null; reason: string }> {
  await requireMember(bunchId, profileId);
  await consume("message", profileId);

  const [bunch, asked] = await Promise.all([
    db.bunch.findUniqueOrThrow({
      where: { id: bunchId },
      select: { interests: { select: { interest: { select: { slug: true } } } } },
    }),
    db.icebreakerAsk.findMany({
      where: { bunchId },
      select: { questionKey: true },
    }),
  ]);

  const prompt = nextIcebreaker(
    bunch.interests.map((i) => i.interest.slug),
    asked.map((a) => a.questionKey),
  );
  if (!prompt) {
    return {
      question: null,
      reason: "You've been through every question we have. Time to go and do something.",
    };
  }

  await db.$transaction([
    db.icebreakerAsk.create({
      data: { bunchId, questionKey: prompt.key, askedById: profileId },
    }),
    db.bunchMessage.create({
      data: { bunchId, authorId: profileId, kind: "PROMPT", body: prompt.text },
    }),
  ]);

  track({
    name: ANALYTICS_EVENTS.ICEBREAKER_ASKED,
    profileId,
    // The key, not the text, and never an answer, because there are none here.
    properties: { bunchId, questionKey: prompt.key },
  });

  return { question: prompt.text };
}

// --- Challenges -------------------------------------------------------------

export interface ChallengeView {
  id: string;
  key: string;
  title: string;
  description: string;
  status: "ACTIVE" | "DONE" | "DROPPED";
  startedAt: Date;
}

export async function startChallenge(
  bunchId: string,
  profileId: string,
  challengeKey: string,
): Promise<ChallengeView> {
  await requireMember(bunchId, profileId);

  const bunch = await db.bunch.findUniqueOrThrow({
    where: { id: bunchId },
    select: { challengesEnabled: true },
  });
  if (!bunch.challengesEnabled) {
    throw forbidden("Challenges are switched off for this bunch.");
  }

  const challenge = findChallenge(challengeKey);
  if (!challenge) throw validationFailed("We don't have that challenge.");

  const running = await db.bunchChallenge.findFirst({
    where: { bunchId, status: "ACTIVE" },
    select: { id: true },
  });
  // One at a time. A list of open challenges is a chore list, and §12 asks for
  // the opposite of that.
  if (running) throw conflict("Finish the one you're on first.");

  const row = await db.bunchChallenge.create({
    data: { bunchId, challengeKey, startedById: profileId },
    select: { id: true, status: true, startedAt: true },
  });

  await db.bunchMessage.create({
    data: {
      bunchId,
      authorId: profileId,
      kind: "PROMPT",
      body: `${challenge.title}, ${challenge.description}`,
    },
  });

  track({
    name: ANALYTICS_EVENTS.CHALLENGE_STARTED,
    profileId,
    properties: { bunchId, challengeKey },
  });

  return { ...row, key: challengeKey, title: challenge.title, description: challenge.description };
}

/**
 * Ends a challenge, done or not.
 *
 * "Dropped" is a first-class outcome and is never counted against anybody. A
 * group that starts something and loses interest has done nothing wrong, and a
 * product that treats that as a failure state is the sort that grows streaks.
 */
export async function endChallenge(
  challengeId: string,
  profileId: string,
  outcome: "DONE" | "DROPPED",
): Promise<void> {
  const challenge = await db.bunchChallenge.findUnique({
    where: { id: challengeId },
    select: { bunchId: true, challengeKey: true, status: true },
  });
  if (!challenge) throw notFound("That challenge no longer exists.");
  await requireMember(challenge.bunchId, profileId);
  if (challenge.status !== "ACTIVE") throw conflict("That one is already finished.");

  await db.bunchChallenge.update({
    where: { id: challengeId },
    data: { status: outcome, endedAt: new Date() },
  });

  if (outcome === "DONE") {
    const found = findChallenge(challenge.challengeKey);
    await db.bunchMessage.create({
      data: {
        bunchId: challenge.bunchId,
        kind: "SYSTEM",
        body: `Challenge done: ${found?.title ?? challenge.challengeKey}.`,
      },
    });
    track({
      name: ANALYTICS_EVENTS.CHALLENGE_COMPLETED,
      profileId,
      properties: { bunchId: challenge.bunchId, challengeKey: challenge.challengeKey },
    });
  }
}

/** The running challenge, plus what else could be started. */
export async function bunchChallenges(
  bunchId: string,
  profileId: string,
): Promise<{ enabled: boolean; active: ChallengeView | null; available: typeof CHALLENGES }> {
  await requireMember(bunchId, profileId);

  const [bunch, active, done] = await Promise.all([
    db.bunch.findUniqueOrThrow({
      where: { id: bunchId },
      select: { challengesEnabled: true },
    }),
    db.bunchChallenge.findFirst({
      where: { bunchId, status: "ACTIVE" },
      select: { id: true, challengeKey: true, status: true, startedAt: true },
    }),
    db.bunchChallenge.findMany({
      where: { bunchId, status: "DONE" },
      select: { challengeKey: true },
    }),
  ]);

  const finished = new Set(done.map((d) => d.challengeKey));
  const found = active ? findChallenge(active.challengeKey) : undefined;

  return {
    enabled: bunch.challengesEnabled,
    active:
      active && found
        ? {
            id: active.id,
            key: active.challengeKey,
            title: found.title,
            description: found.description,
            status: active.status,
            startedAt: active.startedAt,
          }
        : null,
    available: CHALLENGES.filter((c) => !finished.has(c.key)),
  };
}

/** Moderator switch (§12). */
export async function setChallengesEnabled(
  bunchId: string,
  profileId: string,
  enabled: boolean,
): Promise<void> {
  await requireModerator(bunchId, profileId);
  await db.bunch.update({ where: { id: bunchId }, data: { challengesEnabled: enabled } });
}

/** Tells the bunch's members a plan is waiting on them. Called by the route. */
export async function notifyPlanMembers(
  bunchId: string,
  exceptProfileId: string,
  title: string,
  slug: string,
): Promise<void> {
  const members = await db.bunchMembership.findMany({
    where: { bunchId, status: "ACTIVE", profileId: { not: exceptProfileId } },
    select: { profileId: true },
  });

  for (const member of members) {
    await notify({
      profileId: member.profileId,
      type: "ACTIVITY_INVITE",
      title: `${title}. When suits you?`,
      body: "Your bunch is trying to find a time.",
      linkPath: `/bunches/${slug}`,
    });
  }
}
