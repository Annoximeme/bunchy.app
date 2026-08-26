import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { LanguageProvider } from "@/components/link";
import type { LegalDocumentSet } from "@/content/legal/document";
import { SAFETY } from "@/content/legal/safety";
import { PRIVACY } from "@/content/legal/privacy";
import { TERMS } from "@/content/legal/terms";
import { MODERATORS } from "@/content/legal/moderators";

/**
 * The policy documents, held to the same shape in every language.
 *
 * These five are translated whole rather than phrase by phrase, which buys
 * readable Dutch and loses the compiler's guarantee that nothing was dropped.
 * This is what replaces it. It does not check the words, which is a human job:
 * it checks that the argument has the same number of steps in each language and
 * that they are numbered the same, so `/privacy#clause-7` is the same promise
 * whichever language somebody opens it in, and so a clause quietly missing from
 * one translation fails the build rather than the reader.
 */

const DOCUMENTS: Array<[string, LegalDocumentSet]> = [
  ["Meeting safely", SAFETY],
  ["Privacy", PRIVACY],
  ["Terms", TERMS],
  ["Volunteer moderators", MODERATORS],
];

function clauseIds(set: LegalDocumentSet, locale: Locale): string[] {
  const doc = set[locale];
  const { container } = render(
    <LanguageProvider locale={locale}>
      <doc.Body />
    </LanguageProvider>,
  );
  return [...container.querySelectorAll("section[id^='clause-']")].map((el) => el.id);
}

describe.each(DOCUMENTS)("%s", (_name, set) => {
  it("has the same clauses, in the same order, in every language", () => {
    const english = clauseIds(set, "en");
    expect(english.length).toBeGreaterThan(0);

    for (const locale of LOCALES) {
      expect([locale, clauseIds(set, locale)]).toEqual([locale, english]);
    }
  });

  it("gives every language a title, a summary and a description", () => {
    for (const locale of LOCALES) {
      const doc = set[locale];
      expect(doc.title.length).toBeGreaterThan(2);
      expect(doc.summary.length).toBeGreaterThan(40);
      // A low bar on purpose: it is here to catch an empty or forgotten
      // field, not to impose a house style on how long a description should
      // be. "The agreement between you and Bunchy." is a complete answer.
      expect(doc.metaDescription.length).toBeGreaterThan(20);
    }
  });

  it("does not leave a translation identical to the English one", () => {
    // The cheapest way to ship an untranslated document is to copy the English
    // file and change the export name, so the standfirst has to differ. The
    // title is not checked: "Privacy" is the Dutch word for privacy, and a test
    // that insisted otherwise would be demanding a worse translation.
    for (const locale of LOCALES.filter((l) => l !== "en")) {
      expect([locale, set[locale].summary]).not.toEqual([locale, set.en.summary]);
    }
  });
});
