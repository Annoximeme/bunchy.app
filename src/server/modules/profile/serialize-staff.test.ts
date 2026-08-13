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
  user: { birthYear: 1996, birthMonth: 4, role: "MEMBER" },
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
