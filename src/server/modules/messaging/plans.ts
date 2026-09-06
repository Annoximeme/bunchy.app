import { db } from "@/server/db/client";
import { conflict, validationFailed } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";
import { notify } from "@/server/modules/notifications/service";
import { requireParticipant } from "@/server/modules/messaging/direct";
import {
  PLAN_VIEW_SELECT,
  toPlanView,
  type PlanView,
} from "@/server/modules/bunches/plans";
import { proposeSlots } from "@/server/modules/availability/slots";

/**
 * Plans for two.
 *
 * ## The gap this fills
 *
 * A bunch could plan something, break the ice and take on a challenge. Two
 * people who had just agreed to talk to each other got a message box, and that
 * is the exact moment a friendship either starts or quietly does not. The
 * product's own north-star metric counts pairs who spoke *or* went to the same
 * thing, and until now nothing helped with the second half.
 *
 * ## Why it is the same model as a bunch's plan
 *
 * Because it is the same question. A few times, three answers each, and
 * whichever one works. `SocialPlan` already expressed that, and the vote
 * already had "maybe" in it, which is how people actually reply to "can you
 * make Saturday". Copying it into a second model would have bought two
 * implementations of one thing and a second set of bugs.
 *
 * ## What is different
 *
 * The times are proposed rather than typed. Both people have already said
 * which parts of a week they are usually free, and an empty datetime picker is
 * where most plans between two people stop. `proposeSlots` turns those two
 * answers into three real options; anybody can delete them and write their own.
 *
 * And there are no ranks. Either person can settle the time or call it off,
 * which is what `requirePlanActor` means when it ignores standing for a
 * conversation: there is nobody here to have standing over.
 */

/** Two, and never anything else. Named so the arithmetic reads. */
const PAIR = 2;

export interface SuggestedTime {
  startsAt: Date;
  weekend: boolean;
}

/**
 * Times both of them are usually free, soonest first.
 *
 * Empty when either of them never answered the availability question, or when
 * their weeks genuinely do not meet. The form says so plainly and offers a
 * datetime field instead, because inventing a Thursday neither of them is free
 * on would be worse than admitting we do not know.
 */
export async function suggestTimes(
  conversationId: string,
  profileId: string,
  now = new Date(),
): Promise<SuggestedTime[]> {
  const otherId = await requireParticipant(conversationId, profileId);

  const [me, them] = await Promise.all(
    [profileId, otherId].map((id) =>
      db.profile.findUnique({
        where: { id },
        select: {
          timezone: true,
          availability: { select: { window: true } },
        },
      }),
    ),
  );
  if (!me || !them) return [];

  return proposeSlots(
    { windows: me.availability.map((a) => a.window), timezone: me.timezone },
    { windows: them.availability.map((a) => a.window), timezone: them.timezone },
    { now },
  );
}

const MAX_OPTIONS = 4;
const MIN_OPTIONS = 1;

/**
 * Proposes something to do, at one of a few times.
 *
 * One option is allowed here, unlike a bunch plan, which insists on at least
 * two. Between two people "Saturday at eight, does that work?" is a complete
 * question, and the three-way answer still applies to it. Nine people need
 * something to choose between; one other person needs something to answer.
 */
export async function createPairPlan(
  conversationId: string,
  profileId: string,
  input: {
    title: string;
    note?: string | null;
    options: Array<{ startsAt: Date; label?: string | null }>;
  },
): Promise<{ id: string }> {
  const otherId = await requireParticipant(conversationId, profileId);
  await consume("activityCreate", profileId);

  const title = input.title.trim();
  if (title.length < 3) throw validationFailed("Give it a name, even a plain one.");

  const options = input.options.filter((o) => Number.isFinite(o.startsAt.getTime()));
  if (options.length < MIN_OPTIONS) {
    throw validationFailed("Offer at least one time.");
  }
  if (options.length > MAX_OPTIONS) {
    throw validationFailed("Four times is plenty to choose between.");
  }
  const now = Date.now();
  if (options.some((o) => o.startsAt.getTime() < now - 3_600_000)) {
    throw validationFailed("Those times have already passed.");
  }

  // One open plan at a time. A conversation with four live proposals in it is
  // not a pair deciding anything, and the second one is where somebody starts
  // ignoring all of them.
  const open = await db.socialPlan.count({
    where: { conversationId, status: "OPEN" },
  });
  if (open > 0) {
    throw conflict("You already have a plan waiting on an answer.");
  }

  const plan = await db.socialPlan.create({
    data: {
      conversationId,
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

  const me = await db.profile.findUniqueOrThrow({
    where: { id: profileId },
    select: { displayName: true },
  });

  await notify({
    profileId: otherId,
    type: "ACTIVITY_INVITE",
    title: `${me.displayName} suggested something`,
    body: `${title}. Say which times work.`,
    linkPath: `/messages/${conversationId}`,
  });

  track({
    name: ANALYTICS_EVENTS.PLAN_CREATED,
    profileId,
    properties: { planId: plan.id, options: options.length, pair: true },
  });

  return plan;
}

/**
 * The live plan in this conversation, if there is one.
 *
 * One rather than a list, and cancelled ones are left out. A conversation is
 * not a planning tool with a history tab; the only question this answers is
 * "is there something to answer right now".
 */
export async function pairPlan(
  conversationId: string,
  profileId: string,
): Promise<PlanView | null> {
  await requireParticipant(conversationId, profileId);

  const plan = await db.socialPlan.findFirst({
    where: { conversationId, status: { in: ["OPEN", "DECIDED"] } },
    select: PLAN_VIEW_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return plan ? toPlanView(plan, PAIR, profileId) : null;
}
