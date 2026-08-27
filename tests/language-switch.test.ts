import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Changing language is a document load, and the switcher has to stay one.
 *
 * This is a source test rather than a rendered one because what matters is
 * invisible in the DOM: `next/link` and a plain anchor both render an `<a>`,
 * and only one of them reloads the document.
 *
 * The bug it exists to stop was reported as "pressing English does nothing",
 * and it was three faults wearing one coat. The address was fixed first, then
 * the prefetch that quietly rewrote the cookie, and the page still came back in
 * Dutch: a client-side navigation keeps the layout it is already inside, the
 * language lives in that layout, and so every word on the page stayed in the
 * language the reader had just asked to leave. The `lang` attribute on `html`
 * stayed behind with it.
 */
const SOURCE = readFileSync("src/components/language-switcher.tsx", "utf8");

describe("the language switcher", () => {
  it("does not route on the client", () => {
    expect(SOURCE).not.toMatch(/from "next\/link"/);
    expect(SOURCE).not.toMatch(/<NextLink/);
  });

  it("does not go through the locale-aware Link either", () => {
    // That wrapper prefixes the href with the language being read, which is
    // the opposite of what this control is for: it would rewrite the French
    // link as French-inside-French and never leave the current language.
    expect(SOURCE).not.toMatch(/import \{[^}]*\bLink\b[^}]*\} from "@\/components\/link"/);
  });

  it("still names every language it offers", () => {
    for (const tag of ["LOCALE_TAGS", "LOCALE_NAMES", "hrefLang"]) {
      expect(SOURCE).toContain(tag);
    }
  });
});
