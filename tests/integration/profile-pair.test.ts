import { describe, expect, it } from "vitest";
import { db } from "./db";
import { scorePair } from "@/server/modules/matching/pair";

/**
 * Scoring one pair, against a real database.
 *
 * `scorePair` is what makes a profile page say why two people were put in
 * front of each other, and it runs on every profile view. The unit tests for
 * the signals themselves are thorough and stubbed; what they cannot see is
 * whether the thing actually loads two real profiles and survives the states
 * a live database will hand it — a member who has answered nothing, a member
 * who does not exist, somebody looking at their own page.
 *
 * The number itself is deliberately not asserted. Pinning "these two score
 * 74%" would make every future weighting change a test failure in a file that
 * has nothing to do with weightings, and the scorer has its own suite for
 * that. What is asserted is the shape and the refusals.
 */

let counter = 0;

async function member(
  tag: string,
  options: { complete?: boolean } = {},
): Promise<string> {
  const unique = `${tag}${counter++}`;
  const user = await db.user.create({
    data: {
      email: `${unique}@integration.test`,
      profile: {
        create: {
          username: unique,
          displayName: tag,
          onboardingStage: options.complete === false ? "BASICS" : "COMPLETE",
          cityLabel: "Antwerp",
          countryCode: "BE",
        },
      },
    },
    select: { profile: { select: { id: true } } },
  });
  return user.profile!.id;
}

async function shareInterest(
  slug: string,
  label: string,
  members: Array<{ profileId: string; intent?: "PRACTICES" | "CURIOUS" }>,
) {
  const interest = await db.interest.create({
    data: {
      slug,
      label,
      category: "Games",
      status: "APPROVED",
      usageCount: members.length,
    },
    select: { id: true },
  });

  for (const m of members) {
    await db.userInterest.create({
      data: {
        profileId: m.profileId,
        interestId: interest.id,
        strength: 3,
        intent: m.intent ?? "PRACTICES",
      },
    });
  }
}

describe("scoring a pair", () => {
  it("finds the interest two people share", async () => {
    const [sam, alex] = [await member("sam"), await member("alex")];
    await shareInterest("board-games", "Board games", [
      { profileId: sam },
      { profileId: alex },
    ]);

    const match = await scorePair(sam, alex);

    expect(match).not.toBeNull();
    expect(match!.profileId).toBe(alex);
    expect(match!.sharedInterests).toContain("Board games");
    expect(match!.score).toBeGreaterThan(0);
    // The breakdown is what the profile page shows behind the disclosure; a
    // score with no signals behind it would render an empty explanation.
    expect(match!.signals.length).toBeGreaterThan(0);
  });

  it("notices when one teaches what the other wants to learn", async () => {
    const [teacher, learner] = [await member("teacher"), await member("learner")];
    await shareInterest("photography", "Photography", [
      { profileId: teacher, intent: "PRACTICES" },
      { profileId: learner, intent: "CURIOUS" },
    ]);

    const match = await scorePair(learner, teacher);

    // The pairing the product exists to find, and the one a plain tag-overlap
    // score would miss entirely.
    expect(match!.complementaryInterests).toContain("Photography");
  });

  it("refuses to score somebody against themselves", async () => {
    const sam = await member("sam");
    // A meaningless 100% that would read as a bug on your own profile.
    expect(await scorePair(sam, sam)).toBeNull();
  });

  it("returns nothing for a profile that does not exist", async () => {
    const sam = await member("sam");
    expect(await scorePair(sam, "does-not-exist")).toBeNull();
  });

  it("survives a member who has answered nothing at all", async () => {
    // No interests, no goals, no availability. The page must render — the
    // honest outcome is a missing section, not a crash and not a 0% that reads
    // as "you two have nothing in common".
    const [sam, blank] = [await member("sam"), await member("blank")];

    const match = await scorePair(sam, blank);

    if (match !== null) {
      expect(match.sharedInterests).toEqual([]);
      expect(Number.isFinite(match.score)).toBe(true);
    }
  });

  it("does not record looking at somebody as a recommendation", async () => {
    // Profile views are not recommendations. Persisting one would poison the
    // measurement of whether recommendations actually lead anywhere — and this
    // product does not store who looked at whom.
    const [sam, alex] = [await member("sam"), await member("alex")];
    await shareInterest("chess", "Chess", [
      { profileId: sam },
      { profileId: alex },
    ]);

    await scorePair(sam, alex);

    expect(await db.recommendation.count()).toBe(0);
  });
});
