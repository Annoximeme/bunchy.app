import { describe, expect, it } from "vitest";
import { db } from "./db";
import { loadCandidates, loadMatchProfile } from "@/server/modules/matching/repository";
import { recommendBunches } from "@/server/modules/matching/bunches";

/**
 * The language exclusion, against a real query.
 *
 * The unit tests prove the signal scores a pair correctly once both of them
 * are in front of it. This proves the half that never reaches the scorer: two
 * people who share no language are not ranked low, they are not selected, and
 * a member who has answered the question is still shown everybody who has not.
 *
 * It runs against the database rather than a mock because the thing being
 * checked is a `where` clause, and a mock would agree with whatever we wrote.
 */

let counter = 0;

async function member(
  tag: string,
  languages: Array<{ code: string; fluency?: "LEARNING" | "CONVERSATIONAL" | "FLUENT" }>,
) {
  const unique = `${tag}${counter++}`;
  const user = await db.user.create({
    data: {
      email: `${unique}@integration.test`,
      birthYear: 1995,
      profile: {
        create: {
          username: unique,
          displayName: tag,
          onboardingStage: "COMPLETE",
          cityLabel: "Antwerp",
          regionLabel: "Antwerp region",
          countryCode: "BE",
          approxLat: 51.225,
          approxLng: 4.425,
          timezone: "Europe/Brussels",
          privacy: { create: { discoverable: true } },
          languages: {
            create: languages.map((language) => ({
              code: language.code,
              fluency: language.fluency ?? "FLUENT",
            })),
          },
        },
      },
    },
    select: { profile: { select: { id: true } } },
  });
  return user.profile!.id;
}

async function candidateIds(profileId: string): Promise<string[]> {
  const subject = await loadMatchProfile(profileId);
  const candidates = await loadCandidates(subject!);
  return candidates.map((candidate) => candidate.profileId);
}

describe("who a member is allowed to be shown", () => {
  it("leaves out somebody they share no language with", async () => {
    const viewer = await member("viewer", [{ code: "nl" }]);
    const shares = await member("shares", [{ code: "nl" }]);
    const doesNot = await member("doesnot", [{ code: "ja" }]);

    const ids = await candidateIds(viewer);

    expect(ids).toContain(shares);
    expect(ids).not.toContain(doesNot);
  });

  it("keeps somebody who has not answered", async () => {
    const viewer = await member("viewer", [{ code: "nl" }]);
    const silent = await member("silent", []);

    expect(await candidateIds(viewer)).toContain(silent);
  });

  it("does not filter at all for a member who has not answered", async () => {
    const viewer = await member("viewer", []);
    const other = await member("other", [{ code: "ja" }]);

    expect(await candidateIds(viewer)).toContain(other);
  });

  it("counts a language somebody is only learning as shared", async () => {
    // Learning it is a worse evening, not a different room. The scorer marks
    // the pair down; the query has no business deciding they cannot meet.
    const viewer = await member("viewer", [{ code: "fr" }]);
    const learner = await member("learner", [{ code: "fr", fluency: "LEARNING" }]);

    expect(await candidateIds(viewer)).toContain(learner);
  });
});

describe("which bunches a member is shown", () => {
  async function bunch(name: string, languages: string[]) {
    return db.bunch.create({
      data: {
        slug: `${name}-${counter++}`,
        name,
        description: "A group that meets to do a thing together, regularly.",
        visibility: "PUBLIC",
        languages,
        cityLabel: "Antwerp",
        regionLabel: "Antwerp region",
        countryCode: "BE",
        approxLat: 51.225,
        approxLng: 4.425,
        activityScore: 0.8,
        memberships: {
          create: {
            profileId: await member(`filler-${name}`, []),
            role: "OWNER",
            status: "ACTIVE",
          },
        },
      },
      select: { id: true },
    });
  }

  it("leaves out a bunch that runs in a language they do not have", async () => {
    const viewer = await member("viewer", [{ code: "nl" }]);
    const dutch = await bunch("dutch-night", ["nl"]);
    const japanese = await bunch("japanese-night", ["ja"]);
    const unsaid = await bunch("unsaid-night", []);

    const ids = (await recommendBunches(viewer, 20)).map((b) => b.id);

    expect(ids).toContain(dutch.id);
    // Not said is not a claim, so it stays in.
    expect(ids).toContain(unsaid.id);
    expect(ids).not.toContain(japanese.id);
  });
});
