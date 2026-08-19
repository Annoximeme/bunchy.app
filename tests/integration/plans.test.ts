import { describe, expect, it } from "vitest";
import { db } from "./db";
import {
  askIcebreaker,
  bunchChallenges,
  createPlan,
  decidePlan,
  endChallenge,
  listPlans,
  planToActivity,
  setChallengesEnabled,
  startChallenge,
  vote,
} from "@/server/modules/bunches/plans";
import { ICEBREAKERS } from "@/server/modules/bunches/prompts";

/**
 * Social plans, icebreakers and challenges.
 *
 * The three properties worth defending: a plan never books anything by itself,
 * an icebreaker answer is an ordinary chat message with nowhere else to live,
 * and a challenge that gets abandoned is not a failure state anybody is
 * carrying around.
 */

let counter = 0;
const NOW = new Date("2026-08-12T15:00:00Z");
const SOON = new Date(NOW.getTime() + 3 * 86_400_000);
const LATER = new Date(NOW.getTime() + 4 * 86_400_000);

async function member(tag: string) {
  const unique = `${tag}${counter++}`;
  const user = await db.user.create({
    data: {
      email: `${unique}@integration.test`,
      profile: {
        create: {
          username: unique,
          displayName: tag,
          onboardingStage: "COMPLETE",
          privacy: { create: {} },
        },
      },
    },
    select: { id: true, profile: { select: { id: true } } },
  });
  return { userId: user.id, profileId: user.profile!.id };
}

async function bunchWith(roles: Array<[profileId: string, role: "OWNER" | "MODERATOR" | "MEMBER"]>, interests: string[] = []) {
  const interestRows = interests.length
    ? await db.interest.findMany({ where: { slug: { in: interests } }, select: { id: true } })
    : [];

  return db.bunch.create({
    data: {
      slug: `bunch-${counter++}`,
      name: "The Bunch",
      description: "d",
      visibility: "PUBLIC",
      cityLabel: "Antwerp",
      countryCode: "BE",
      interests: { create: interestRows.map((r) => ({ interestId: r.id })) },
      memberships: {
        create: roles.map(([profileId, role]) => ({ profileId, role, status: "ACTIVE" as const })),
      },
    },
    select: { id: true, slug: true },
  });
}

/** An owner, a member and somebody who is not in it. */
async function cast(interests: string[] = []) {
  const owner = await member("Owner");
  const other = await member("Other");
  const outsider = await member("Outsider");
  const bunch = await bunchWith(
    [
      [owner.profileId, "OWNER"],
      [other.profileId, "MEMBER"],
    ],
    interests,
  );
  return { owner, other, outsider, bunch };
}

const TWO_TIMES = [
  { startsAt: SOON, label: "Friday" },
  { startsAt: LATER, label: "Saturday" },
];

describe("planning something", () => {
  it("offers times and counts the answers", async () => {
    const { owner, other, bunch } = await cast();
    await createPlan(bunch.id, owner.profileId, { title: "Board games", options: TWO_TIMES });

    const [plan] = await listPlans(bunch.id, owner.profileId);
    const friday = plan!.options[0]!;

    await vote(friday.id, owner.profileId, "YES");
    await vote(friday.id, other.profileId, "YES");

    const [after] = await listPlans(bunch.id, owner.profileId);
    expect(after!.options[0]!.yes).toBe(2);
    expect(after!.best).toEqual({ optionId: friday.id, yes: 2, of: 2 });
  });

  it("keeps maybe separate from no", async () => {
    const { owner, other, bunch } = await cast();
    await createPlan(bunch.id, owner.profileId, { title: "Board games", options: TWO_TIMES });
    const [plan] = await listPlans(bunch.id, owner.profileId);

    await vote(plan!.options[0]!.id, owner.profileId, "MAYBE");
    await vote(plan!.options[0]!.id, other.profileId, "NO");

    const [after] = await listPlans(bunch.id, owner.profileId);
    // Collapsing "maybe" into "no" loses the difference between a group that
    // cannot meet and one that has not decided.
    expect(after!.options[0]!.maybe).toBe(1);
    expect(after!.options[0]!.no).toBe(1);
    expect(after!.options[0]!.yes).toBe(0);
    expect(after!.best).toBeNull();
  });

  it("lets somebody change their mind", async () => {
    const { owner, bunch } = await cast();
    await createPlan(bunch.id, owner.profileId, { title: "Board games", options: TWO_TIMES });
    const [plan] = await listPlans(bunch.id, owner.profileId);

    await vote(plan!.options[0]!.id, owner.profileId, "NO");
    await vote(plan!.options[0]!.id, owner.profileId, "YES");

    const [after] = await listPlans(bunch.id, owner.profileId);
    expect(after!.options[0]!.yes).toBe(1);
    expect(after!.options[0]!.no).toBe(0);
  });

  it("books nothing when a time is settled", async () => {
    const { owner, bunch } = await cast();
    await createPlan(bunch.id, owner.profileId, { title: "Board games", options: TWO_TIMES });
    const [plan] = await listPlans(bunch.id, owner.profileId);

    await decidePlan(plan!.id, owner.profileId, plan!.options[0]!.id);

    // §10: nothing is booked or committed automatically. Settling on a day is
    // a group agreeing; an activity is a commitment, and it takes a second press.
    expect(await db.activity.count()).toBe(0);
    const [after] = await listPlans(bunch.id, owner.profileId);
    expect(after!.status).toBe("DECIDED");
    expect(after!.activityId).toBeNull();
  });

  it("turns a settled plan into an activity when asked", async () => {
    const { owner, bunch } = await cast();
    await createPlan(bunch.id, owner.profileId, { title: "Board games", options: TWO_TIMES });
    const [plan] = await listPlans(bunch.id, owner.profileId);
    await decidePlan(plan!.id, owner.profileId, plan!.options[0]!.id);

    const { activityId } = await planToActivity(plan!.id, owner.profileId, {
      description: "Bring something to play.",
      mode: "OFFLINE",
      location: "The pub",
    });

    const activity = await db.activity.findUniqueOrThrow({
      where: { id: activityId },
      select: { startsAt: true, bunchId: true },
    });
    expect(activity.startsAt.getTime()).toBe(SOON.getTime());
    expect(activity.bunchId).toBe(bunch.id);
  });

  it("will not make two activities from one plan", async () => {
    const { owner, bunch } = await cast();
    await createPlan(bunch.id, owner.profileId, { title: "Board games", options: TWO_TIMES });
    const [plan] = await listPlans(bunch.id, owner.profileId);
    await decidePlan(plan!.id, owner.profileId, plan!.options[0]!.id);

    const input = { description: "Bring something.", mode: "OFFLINE" as const, location: "The pub" };
    await planToActivity(plan!.id, owner.profileId, input);
    await expect(planToActivity(plan!.id, owner.profileId, input)).rejects.toThrow();
  });

  it("refuses an activity before a time is settled", async () => {
    const { owner, bunch } = await cast();
    await createPlan(bunch.id, owner.profileId, { title: "Board games", options: TWO_TIMES });
    const [plan] = await listPlans(bunch.id, owner.profileId);

    await expect(
      planToActivity(plan!.id, owner.profileId, {
        description: "Bring something.",
        mode: "OFFLINE",
        location: "The pub",
      }),
    ).rejects.toThrow();
  });

  it("wants at least two times to choose between", async () => {
    const { owner, bunch } = await cast();
    await expect(
      createPlan(bunch.id, owner.profileId, {
        title: "Board games",
        options: [{ startsAt: SOON }],
      }),
    ).rejects.toThrow();
  });

  it("refuses times that have already passed", async () => {
    const { owner, bunch } = await cast();
    await expect(
      createPlan(bunch.id, owner.profileId, {
        title: "Board games",
        options: [
          { startsAt: new Date(Date.now() - 86_400_000) },
          { startsAt: new Date(Date.now() - 172_800_000) },
        ],
      }),
    ).rejects.toThrow();
  });
});

describe("who can do what", () => {
  it("keeps a non-member out entirely", async () => {
    const { owner, outsider, bunch } = await cast();
    await createPlan(bunch.id, owner.profileId, { title: "Board games", options: TWO_TIMES });
    const [plan] = await listPlans(bunch.id, owner.profileId);

    await expect(listPlans(bunch.id, outsider.profileId)).rejects.toThrow();
    await expect(vote(plan!.options[0]!.id, outsider.profileId, "YES")).rejects.toThrow();
    await expect(askIcebreaker(bunch.id, outsider.profileId)).rejects.toThrow();
    await expect(startChallenge(bunch.id, outsider.profileId, "three-in-common")).rejects.toThrow();
  });

  it("lets the person who proposed it settle it", async () => {
    const { other, bunch } = await cast();
    await createPlan(bunch.id, other.profileId, { title: "Board games", options: TWO_TIMES });
    const [plan] = await listPlans(bunch.id, other.profileId);

    await decidePlan(plan!.id, other.profileId, plan!.options[0]!.id);
    expect((await listPlans(bunch.id, other.profileId))[0]!.status).toBe("DECIDED");
  });

  it("stops an ordinary member settling someone else's plan", async () => {
    const { owner, other, bunch } = await cast();
    await createPlan(bunch.id, owner.profileId, { title: "Board games", options: TWO_TIMES });
    const [plan] = await listPlans(bunch.id, owner.profileId);

    // Deciding for a group is exactly the kind of thing that needs standing.
    await expect(decidePlan(plan!.id, other.profileId, plan!.options[0]!.id)).rejects.toThrow();
  });

  it("only lets moderators switch challenges off", async () => {
    const { owner, other, bunch } = await cast();
    await expect(setChallengesEnabled(bunch.id, other.profileId, false)).rejects.toThrow();
    await setChallengesEnabled(bunch.id, owner.profileId, false);
    expect((await bunchChallenges(bunch.id, owner.profileId)).enabled).toBe(false);
  });
});

describe("icebreakers", () => {
  it("posts the question into the chat", async () => {
    const { owner, bunch } = await cast();
    const result = await askIcebreaker(bunch.id, owner.profileId);

    expect("question" in result && result.question).toBeTruthy();
    const message = await db.bunchMessage.findFirstOrThrow({
      where: { bunchId: bunch.id, kind: "PROMPT" },
      select: { body: true, authorId: true },
    });
    expect(message.body).toBe((result as { question: string }).question);
    expect(message.authorId).toBe(owner.profileId);
  });

  it("stores which question was asked and nothing else", async () => {
    const { owner, bunch } = await cast();
    await askIcebreaker(bunch.id, owner.profileId);

    const ask = await db.icebreakerAsk.findFirstOrThrow({ where: { bunchId: bunch.id } });
    // §11: no permanent personality profile can be built from casual answers,
    // because there is nowhere to put an answer. Only the key is kept, so the
    // question is not asked twice.
    expect(Object.keys(ask)).toEqual(
      expect.arrayContaining(["questionKey", "bunchId", "askedById", "askedAt"]),
    );
    expect(JSON.stringify(ask)).not.toContain("?");
  });

  it("never asks the same question twice", async () => {
    const { owner, bunch } = await cast();
    const seen = new Set<string>();

    for (let i = 0; i < 8; i++) {
      const result = await askIcebreaker(bunch.id, owner.profileId);
      const question = (result as { question: string | null }).question;
      expect(question).not.toBeNull();
      expect(seen.has(question!)).toBe(false);
      seen.add(question!);
    }
  });

  it("says so rather than repeating when the bank runs out", async () => {
    const { owner, bunch } = await cast();
    await db.icebreakerAsk.createMany({
      data: ICEBREAKERS.map((p) => ({ bunchId: bunch.id, questionKey: p.key })),
    });

    const result = await askIcebreaker(bunch.id, owner.profileId);
    expect(result.question).toBeNull();
    expect("reason" in result && result.reason).toContain("go and do something");
  });
});

describe("challenges", () => {
  it("posts the challenge and tracks one at a time", async () => {
    const { owner, bunch } = await cast();
    await startChallenge(bunch.id, owner.profileId, "three-in-common");

    const state = await bunchChallenges(bunch.id, owner.profileId);
    expect(state.active?.key).toBe("three-in-common");

    // A list of open challenges is a chore list.
    await expect(startChallenge(bunch.id, owner.profileId, "one-song-each")).rejects.toThrow();
  });

  it("treats putting one down as an ordinary outcome", async () => {
    const { owner, bunch } = await cast();
    const started = await startChallenge(bunch.id, owner.profileId, "three-in-common");

    await endChallenge(started.id, owner.profileId, "DROPPED");

    const state = await bunchChallenges(bunch.id, owner.profileId);
    expect(state.active).toBeNull();
    // Dropped is not failure: it stays available to try again, and nothing
    // anywhere counts it against the bunch.
    expect(state.available.map((c) => c.key)).toContain("three-in-common");
  });

  it("does not offer one that is already done", async () => {
    const { owner, bunch } = await cast();
    const started = await startChallenge(bunch.id, owner.profileId, "three-in-common");
    await endChallenge(started.id, owner.profileId, "DONE");

    const state = await bunchChallenges(bunch.id, owner.profileId);
    expect(state.available.map((c) => c.key)).not.toContain("three-in-common");
  });

  it("refuses when a moderator has switched them off", async () => {
    const { owner, bunch } = await cast();
    await setChallengesEnabled(bunch.id, owner.profileId, false);

    await expect(startChallenge(bunch.id, owner.profileId, "three-in-common")).rejects.toThrow();
  });

  it("refuses a challenge that does not exist", async () => {
    const { owner, bunch } = await cast();
    await expect(startChallenge(bunch.id, owner.profileId, "make-up-a-new-one")).rejects.toThrow();
  });

  it("keeps no score of any kind", async () => {
    const { owner, bunch } = await cast();
    const started = await startChallenge(bunch.id, owner.profileId, "three-in-common");
    await endChallenge(started.id, owner.profileId, "DONE");

    const row = await db.bunchChallenge.findFirstOrThrow({ where: { bunchId: bunch.id } });
    const columns = Object.keys(row).join(" ").toLowerCase();
    // No points, no streak, no per-member completion, every one of those is a
    // mechanism for the thing §12 asks this feature not to become.
    expect(columns).not.toMatch(/point|streak|score|rank|level/);
  });
});

describe("everything goes with the bunch", () => {
  it("deletes plans, votes, icebreakers and challenges", async () => {
    const { owner, bunch } = await cast();
    await createPlan(bunch.id, owner.profileId, { title: "Board games", options: TWO_TIMES });
    const [plan] = await listPlans(bunch.id, owner.profileId);
    await vote(plan!.options[0]!.id, owner.profileId, "YES");
    await askIcebreaker(bunch.id, owner.profileId);
    await startChallenge(bunch.id, owner.profileId, "three-in-common");

    await db.bunch.delete({ where: { id: bunch.id } });

    expect(await db.socialPlan.count()).toBe(0);
    expect(await db.socialPlanOption.count()).toBe(0);
    expect(await db.socialPlanVote.count()).toBe(0);
    expect(await db.icebreakerAsk.count()).toBe(0);
    expect(await db.bunchChallenge.count()).toBe(0);
  });
});
