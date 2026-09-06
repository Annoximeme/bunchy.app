import { describe, expect, it } from "vitest";
import { db } from "./db";
import {
  createPairPlan,
  pairPlan,
  suggestTimes,
} from "@/server/modules/messaging/plans";
import {
  cancelPlan,
  decidePlan,
  planToActivity,
  vote,
} from "@/server/modules/bunches/plans";

/**
 * Plans between two people.
 *
 * The properties worth defending are the ones that separate this from a bunch
 * plan: either person can settle it, a stranger cannot touch it, the times are
 * proposed from what both of them already said about their week, and nothing
 * becomes a real activity without a second, deliberate press.
 */

let counter = 0;

const NOW = new Date();
const SOON = new Date(NOW.getTime() + 3 * 86_400_000);
const LATER = new Date(NOW.getTime() + 4 * 86_400_000);

async function member(
  tag: string,
  windows: Array<"WEEKDAY_EVENING" | "WEEKEND_AFTERNOON"> = [],
) {
  const unique = `${tag}${counter++}`;
  const user = await db.user.create({
    data: {
      email: `${unique}@integration.test`,
      profile: {
        create: {
          username: unique,
          displayName: tag,
          onboardingStage: "COMPLETE",
          timezone: "Europe/Brussels",
          privacy: { create: {} },
          availability: { create: windows.map((window) => ({ window })) },
        },
      },
    },
    select: { profile: { select: { id: true } } },
  });
  return user.profile!.id;
}

async function conversationBetween(a: string, b: string) {
  const conversation = await db.conversation.create({
    data: {
      participants: { create: [{ profileId: a }, { profileId: b }] },
    },
    select: { id: true },
  });
  return conversation.id;
}

describe("suggesting times", () => {
  it("proposes hours both of them said they are usually free", async () => {
    const a = await member("ann", ["WEEKDAY_EVENING"]);
    const b = await member("bram", ["WEEKDAY_EVENING"]);
    const conversation = await conversationBetween(a, b);

    const times = await suggestTimes(conversation, a);

    expect(times.length).toBeGreaterThan(0);
    for (const time of times) {
      expect(time.startsAt.getTime()).toBeGreaterThan(Date.now());
    }
  });

  it("proposes nothing when their weeks do not meet", async () => {
    const a = await member("ann", ["WEEKDAY_EVENING"]);
    const b = await member("bram", ["WEEKEND_AFTERNOON"]);
    const conversation = await conversationBetween(a, b);

    expect(await suggestTimes(conversation, a)).toEqual([]);
  });

  it("refuses somebody else's conversation", async () => {
    const a = await member("ann");
    const b = await member("bram");
    const stranger = await member("stranger");
    const conversation = await conversationBetween(a, b);

    await expect(suggestTimes(conversation, stranger)).rejects.toThrow();
  });
});

describe("a plan for two", () => {
  async function pair() {
    const a = await member("ann", ["WEEKDAY_EVENING"]);
    const b = await member("bram", ["WEEKDAY_EVENING"]);
    return { a, b, conversation: await conversationBetween(a, b) };
  }

  it("tells the other person, once", async () => {
    const { a, b, conversation } = await pair();

    await createPairPlan(conversation, a, {
      title: "Coffee",
      options: [{ startsAt: SOON }],
    });

    const notifications = await db.notification.findMany({
      where: { profileId: b },
      select: { title: true, linkPath: true },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.linkPath).toBe(`/messages/${conversation}`);

    // And nobody notifies the person who pressed the button.
    expect(await db.notification.count({ where: { profileId: a } })).toBe(0);
  });

  it("accepts a single time, unlike a bunch plan", async () => {
    const { a, conversation } = await pair();

    await createPairPlan(conversation, a, {
      title: "Coffee",
      options: [{ startsAt: SOON }],
    });

    // Read back rather than asserting on the return value, because "one time
    // is a complete question between two people" is a claim about what got
    // stored, not about what the function handed back.
    const view = await pairPlan(conversation, a);
    expect(view!.options).toHaveLength(1);
  });

  it("allows one open plan at a time", async () => {
    const { a, conversation } = await pair();
    await createPairPlan(conversation, a, {
      title: "Coffee",
      options: [{ startsAt: SOON }],
    });

    await expect(
      createPairPlan(conversation, a, {
        title: "Something else",
        options: [{ startsAt: LATER }],
      }),
    ).rejects.toThrow();
  });

  it("lets the other person vote, and either of them settle it", async () => {
    const { a, b, conversation } = await pair();
    const plan = await createPairPlan(conversation, a, {
      title: "Coffee",
      options: [{ startsAt: SOON }, { startsAt: LATER }],
    });

    const view = await pairPlan(conversation, b);
    const option = view!.options[0]!;
    await vote(option.id, b, "YES");

    // The person who did not propose it settles the time. In a bunch that
    // would need standing; between two people there is nobody to have it.
    await decidePlan(plan.id, b, option.id);

    const settled = await pairPlan(conversation, a);
    expect(settled!.status).toBe("DECIDED");
    expect(settled!.decidedOptionId).toBe(option.id);
  });

  it("keeps a stranger out of all of it", async () => {
    const { a, conversation } = await pair();
    const stranger = await member("stranger");
    const plan = await createPairPlan(conversation, a, {
      title: "Coffee",
      options: [{ startsAt: SOON }],
    });
    const view = await pairPlan(conversation, a);

    await expect(pairPlan(conversation, stranger)).rejects.toThrow();
    await expect(vote(view!.options[0]!.id, stranger, "YES")).rejects.toThrow();
    await expect(cancelPlan(plan.id, stranger)).rejects.toThrow();
  });

  it("becomes an activity for two, and only when asked", async () => {
    const { a, b, conversation } = await pair();
    const plan = await createPairPlan(conversation, a, {
      title: "Coffee",
      options: [{ startsAt: SOON }],
    });
    const view = await pairPlan(conversation, a);
    const option = view!.options[0]!;

    // Settling is not booking.
    await decidePlan(plan.id, a, option.id);
    expect(await db.activity.count()).toBe(0);

    const { activityId } = await planToActivity(plan.id, a, {
      description: "Coffee at the place on the corner, then a walk.",
      mode: "OFFLINE",
      location: "Groenplaats",
    });

    const activity = await db.activity.findUniqueOrThrow({
      where: { id: activityId },
      select: { maxParticipants: true, bunchId: true, organizerId: true },
    });
    expect(activity.maxParticipants).toBe(2);
    expect(activity.bunchId).toBeNull();
    expect(activity.organizerId).toBe(a);

    // The other half hears about it, because they agreed to the time and
    // would otherwise have to find it themselves.
    const told = await db.notification.findMany({
      where: { profileId: b, linkPath: `/activities/${activityId}` },
    });
    expect(told).toHaveLength(1);
  });
});
