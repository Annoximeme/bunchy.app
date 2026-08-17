import { describe, expect, it } from "vitest";
import {
  toPublicProfile,
  type SerializeInput,
} from "@/server/modules/profile/serialize";

const ROW = {
  id: "p1",
  username: "gianni",
  displayName: "Gianni",
  bio: null,
  avatarUrl: null,
  cityLabel: "Antwerp",
  regionLabel: null,
  countryCode: "BE",
  createdAt: new Date("2026-08-13T00:00:00.000Z"),
  foundingMember: true,
  title: "Founder & Lead Developer of Bunchy",
  user: { birthYear: 1996, birthMonth: 4, role: "MEMBER", supporter: null },
  privacy: null,
  interests: [],
  goals: [],
  availability: [],
  personality: null,
} satisfies SerializeInput;

function serialize(role: string) {
  return toPublicProfile(
    { ...ROW, user: { ...ROW.user, role } },
    { connectionState: "NONE" as never },
  );
}

describe("the supporter mark", () => {
  it("is complimentary for staff, who never paid for it", () => {
    // Volunteers work the report queue for nothing. Charging them for a ring
    // would be a strange way to say thank you.
    expect(serialize("MODERATOR").supporter).toBe(true);
    expect(serialize("ADMIN").supporter).toBe(true);
  });

  it("is off for a member who has not chipped in", () => {
    expect(serialize("MEMBER").supporter).toBe(false);
  });

  it("is on for a member inside a period they cancelled", () => {
    // They bought the month. Cancelling stops the next payment, it does not
    // repossess what has already been paid for.
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const row = {
      ...ROW,
      user: {
        ...ROW.user,
        supporter: { status: "ENDED", currentPeriodEnd: future },
      },
    };
    expect(
      toPublicProfile(row, { connectionState: "NONE" as never }).supporter,
    ).toBe(true);
  });

  it("is off once that period has passed", () => {
    const past = new Date(Date.now() - 1000);
    const row = {
      ...ROW,
      user: {
        ...ROW.user,
        supporter: { status: "ENDED", currentPeriodEnd: past },
      },
    };
    expect(
      toPublicProfile(row, { connectionState: "NONE" as never }).supporter,
    ).toBe(false);
  });
});

describe("staff on a public profile", () => {
  it("flattens both staff roles to one label", () => {
    // A member can tell staff from someone claiming to be staff. What they
    // cannot tell is who holds which power — publishing the moderator list
    // would just be a target list.
    expect(serialize("ADMIN").staff).toBe(true);
    expect(serialize("MODERATOR").staff).toBe(true);
  });

  it("is false for an ordinary member", () => {
    expect(serialize("MEMBER").staff).toBe(false);
  });

  it("never serializes the role itself", () => {
    expect(JSON.stringify(serialize("ADMIN"))).not.toContain("ADMIN");
    expect(JSON.stringify(serialize("MODERATOR"))).not.toContain("MODERATOR");
  });

  it("carries the title through unchanged", () => {
    expect(serialize("ADMIN").title).toBe("Founder & Lead Developer of Bunchy");
  });
});
