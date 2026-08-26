import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { createTranslator, type Catalogue, type Phrase } from "@/lib/i18n/translate";

/**
 * The phrasebook, and the two ways it can quietly go wrong.
 *
 * A missing phrase is caught by the compiler, since the other catalogues are
 * typed against the English one. A placeholder that does not survive
 * translation is not: `{count}` written as `{aantal}` in Dutch type-checks
 * perfectly and renders a brace to a member. That is what the last test is
 * for.
 */

function flatten(catalogue: Catalogue, prefix = ""): Map<string, Phrase> {
  const out = new Map<string, Phrase>();
  for (const [key, value] of Object.entries(catalogue)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string" || (typeof value === "object" && "other" in value)) {
      out.set(path, value as Phrase);
    } else {
      for (const [k, v] of flatten(value as Catalogue, path)) out.set(k, v);
    }
  }
  return out;
}

function placeholders(phrase: Phrase): Set<string> {
  const text = typeof phrase === "string" ? phrase : `${phrase.one} ${phrase.other}`;
  return new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!));
}

describe("translating", () => {
  const t = createTranslator("nl", DICTIONARIES);

  it("returns the phrase in the language asked for", () => {
    expect(t("nav.discover")).toBe("Ontdekken");
  });

  it("puts values into the sentence", () => {
    expect(createTranslator("en", DICTIONARIES)("language.chosen", { language: "Nederlands" })).toBe(
      "Nederlands chosen",
    );
  });

  it("picks a plural form by the count", () => {
    const en = createTranslator("en", DICTIONARIES);
    expect(en("nav.unreadMessages", { count: 1 })).toBe("1 unread message");
    expect(en("nav.unreadMessages", { count: 4 })).toBe("4 unread messages");
  });

  it("leaves a value nobody supplied visible rather than blank", () => {
    expect(createTranslator("en", DICTIONARIES)("language.chosen")).toBe("{language} chosen");
  });
});

describe("the catalogues", () => {
  const english = flatten(DICTIONARIES.en);

  it("agree on which phrases exist", () => {
    for (const locale of LOCALES) {
      expect([...flatten(DICTIONARIES[locale as Locale]).keys()].sort()).toEqual(
        [...english.keys()].sort(),
      );
    }
  });

  it("keep every placeholder through translation", () => {
    for (const locale of LOCALES) {
      for (const [path, phrase] of flatten(DICTIONARIES[locale as Locale])) {
        expect([locale, path, [...placeholders(phrase)].sort()]).toEqual([
          locale,
          path,
          [...placeholders(english.get(path)!)].sort(),
        ]);
      }
    }
  });

  it("agree on which phrases count something", () => {
    for (const locale of LOCALES) {
      for (const [path, phrase] of flatten(DICTIONARIES[locale as Locale])) {
        expect([locale, path, typeof phrase]).toEqual([
          locale,
          path,
          typeof english.get(path),
        ]);
      }
    }
  });
});
