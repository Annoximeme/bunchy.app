import { describe, expect, it } from "vitest";
import { interestCategory, interestLabel } from "@/lib/i18n/interests";

/**
 * The one lookup in this app that is allowed to miss.
 *
 * Everything we wrote ourselves exists in all three languages and the compiler
 * says so. An interest somebody added themselves exists in exactly one, theirs,
 * and the rule is that it survives untouched.
 */
describe("naming an interest", () => {
  it("translates the ones we ship", () => {
    expect(interestLabel("nl", "board-games", "Board games")).toBe("Gezelschapsspelen");
    expect(interestLabel("fr", "board-games", "Board games")).toBe("Jeux de société");
  });

  it("leaves a member's own words exactly as they typed them", () => {
    expect(interestLabel("nl", "warhammer-40k", "Warhammer 40k")).toBe("Warhammer 40k");
    expect(interestLabel("fr", "kendo", "kendo")).toBe("kendo");
  });

  it("falls back to English rather than to the slug", () => {
    // A slug we ship, in a language that somehow lacks it: the English word is
    // a readable answer, "board-games" is not.
    expect(interestLabel("en", "board-games", "anything")).toBe("Board games");
  });

  it("translates the headings they are grouped under", () => {
    expect(interestCategory("nl", "Food & Drink")).toBe("Eten & drinken");
    expect(interestCategory("fr", "Outdoors")).toBe("Dehors");
    expect(interestCategory("nl", "Not a category")).toBe("Not a category");
  });
});
