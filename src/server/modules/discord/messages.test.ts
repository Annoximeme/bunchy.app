import { describe, expect, it } from "vitest";
import { rulesEmbeds, welcomeMessage, type RulesEmbed } from "./messages";

/**
 * Guards on the rules post.
 *
 * Discord validates embeds on the way in and answers 400 with a message about
 * a field path when they are too long. That failure surfaces as "publishing
 * the rules stopped working" long after the edit that caused it, and the copy
 * is the thing most likely to be edited by somebody not thinking about limits.
 * So the limits are asserted here, where a change to the wording fails on the
 * spot.
 *
 * The numbers are Discord's documented maximums, not preferences.
 */

const MAX_EMBEDS = 10;
const MAX_TOTAL_CHARS = 6000;
const MAX_FIELDS = 25;
const MAX_TITLE = 256;
const MAX_DESCRIPTION = 4096;
const MAX_FIELD_NAME = 256;
const MAX_FIELD_VALUE = 1024;
const MAX_FOOTER = 2048;

/** Everything Discord counts toward the 6000, in its own reckoning. */
function totalChars(embeds: RulesEmbed[]): number {
  return embeds.reduce(
    (sum, embed) =>
      sum +
      embed.title.length +
      (embed.description?.length ?? 0) +
      (embed.footer?.text.length ?? 0) +
      embed.fields.reduce((f, x) => f + x.name.length + x.value.length, 0),
    0,
  );
}

describe("the rules post", () => {
  const embeds = rulesEmbeds();

  it("fits in one message", () => {
    expect(embeds.length).toBeLessThanOrEqual(MAX_EMBEDS);
    expect(totalChars(embeds)).toBeLessThanOrEqual(MAX_TOTAL_CHARS);
  });

  it("keeps every part inside its own limit", () => {
    for (const embed of embeds) {
      expect(embed.title.length).toBeLessThanOrEqual(MAX_TITLE);
      expect(embed.description?.length ?? 0).toBeLessThanOrEqual(MAX_DESCRIPTION);
      expect(embed.footer?.text.length ?? 0).toBeLessThanOrEqual(MAX_FOOTER);

      const { fields } = embed;
      expect(fields.length).toBeLessThanOrEqual(MAX_FIELDS);
      for (const field of fields) {
        expect(field.name.length).toBeLessThanOrEqual(MAX_FIELD_NAME);
        expect(field.value.length).toBeLessThanOrEqual(MAX_FIELD_VALUE);
        // An empty value is rejected outright, and is easy to leave behind
        // half way through an edit.
        expect(field.value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  /**
   * The numbers are how a moderator cites a rule, so they have to run straight
   * through the embeds without a gap or a repeat. Splitting the list into four
   * blocks is exactly the edit that would renumber one of them by accident.
   */
  it("numbers the rules continuously across the blocks", () => {
    const numbers = embeds
      .flatMap((embed) => embed.fields)
      .map((field) => /^(\d+) · /.exec(field.name)?.[1])
      .filter((n): n is string => n !== undefined)
      .map(Number);

    expect(numbers.length).toBeGreaterThan(10);
    expect(numbers).toEqual(numbers.map((_, i) => i + 1));
  });

  it("covers impersonation, staff impersonation and scams", () => {
    const text = JSON.stringify(embeds).toLowerCase();
    for (const promise of [
      "staff",
      "password",
      "login code",
      "crypto",
      "under 16",
      "public",
      "discord's own rules",
    ]) {
      expect(text).toContain(promise);
    }
  });

  /**
   * Gianni's rule, and this is the copy it matters most for: the rules post is
   * the longest piece of prose the product puts in front of a stranger.
   */
  it("uses no em dashes, in the rules or the greeting", () => {
    expect(JSON.stringify(rulesEmbeds())).not.toContain("—");
    expect(JSON.stringify(welcomeMessage("1", "2"))).not.toContain("—");
  });
});
