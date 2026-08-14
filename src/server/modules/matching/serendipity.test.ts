import { describe, expect, it } from "vitest";
import { noveltyFor } from "@/server/modules/matching/serendipity";
import type { MatchProfile, PersonMatch } from "@/server/modules/matching/types";

/**
 * Novelty is the one number here that could quietly turn "serendipity" into
 * "strangers", so the rules it encodes are pinned.
 */

const profile = (interests: string[]) =>
  ({ interests: interests.map((slug) => ({ slug })) } as unknown as MatchProfile);

const match = (shared: string[], complementary: string[] = []) =>
  ({
    sharedInterests: shared,
    complementaryInterests: complementary,
  } as unknown as PersonMatch);

describe("noveltyFor", () => {
  it("is high when almost nothing overlaps but a bridge exists", () => {
    const you = profile(["chess", "reading", "cooking"]);
    const them = profile(["climbing", "photography", "cooking"]);
    // One shared interest out of three, plus a complementary pair.
    expect(noveltyFor(you, them, match(["cooking"], ["photography"]))).toBeGreaterThan(60);
  });

  it("is low when you are basically the same person", () => {
    const you = profile(["chess", "reading", "cooking"]);
    const them = profile(["chess", "reading", "cooking"]);
    expect(
      noveltyFor(you, them, match(["chess", "reading", "cooking"])),
    ).toBe(0);
  });

  it("discounts a pair with no bridge at all", () => {
    // Nothing shared and nothing complementary is a cold introduction, not a
    // discovery — it must not outrank a pair that has a way in.
    const you = profile(["chess", "reading"]);
    const them = profile(["motocross", "welding"]);

    const noBridge = noveltyFor(you, them, match([], []));
    const bridged = noveltyFor(you, them, match([], ["welding"]));
    expect(noBridge).toBeLessThan(bridged);
  });

  it("is zero when either side has no interests recorded", () => {
    // We do not know they are different, only that we know nothing. Presenting
    // that as a discovery would be dressing up an empty profile.
    expect(noveltyFor(profile([]), profile(["chess"]), match([]))).toBe(0);
    expect(noveltyFor(profile(["chess"]), profile([]), match([]))).toBe(0);
  });
});
