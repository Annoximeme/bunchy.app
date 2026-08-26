import { describe, expect, it } from "vitest";
import { createFormats } from "@/lib/format";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import { createTranslator } from "@/lib/i18n/translate";
import { LOCALES, type Locale } from "@/lib/i18n/config";

/**
 * Dates, in three languages.
 *
 * The split these tests exist to protect: the numbers and the weekday come
 * from `Intl`, the words around them come from the phrasebook. Getting one and
 * not the other is how you end up with "Thursday · 20:00" inside an otherwise
 * Dutch sentence, which is what this app did until now.
 */

function formats(locale: Locale) {
  return createFormats(locale, createTranslator(locale, DICTIONARIES));
}

const NOW = new Date("2026-03-12T18:00:00Z");

describe("how long ago", () => {
  it("says it in the language being read", () => {
    const moment = new Date(NOW.getTime() - 30_000);
    expect(formats("en").relativeTime(moment, NOW)).toBe("just now");
    expect(formats("nl").relativeTime(moment, NOW)).toBe("net nu");
    expect(formats("fr").relativeTime(moment, NOW)).toBe("à l’instant");
  });

  it("counts in the language being read", () => {
    const earlier = new Date(NOW.getTime() - 3 * 60 * 60 * 1000);
    expect(formats("en").relativeTime(earlier, NOW)).toBe("3h ago");
    expect(formats("fr").relativeTime(earlier, NOW)).toBe("il y a 3 h");
  });

  it("falls back to a date once it is a week old, in each language", () => {
    const old = new Date("2026-02-01T10:00:00Z");
    expect(formats("en").relativeTime(old, NOW)).toMatch(/Feb/);
    expect(formats("nl").relativeTime(old, NOW)).toMatch(/feb/);
    expect(formats("fr").relativeTime(old, NOW)).toMatch(/févr/);
  });
});

describe("when something is on", () => {
  it("uses our word for today and tomorrow", () => {
    const tonight = new Date("2026-03-12T20:00:00Z");
    expect(formats("en").activityWhen(tonight, NOW)).toContain("Today");
    expect(formats("nl").activityWhen(tonight, NOW)).toContain("Vandaag");
    expect(formats("fr").activityWhen(tonight, NOW)).toContain("Aujourd’hui");
  });

  it("gets the weekday from the platform rather than from us", () => {
    const later = new Date("2026-03-15T14:00:00Z");
    expect(formats("nl").activityWhen(later, NOW)).toContain("zondag");
    expect(formats("fr").activityWhen(later, NOW)).toContain("dimanche");
  });

  it("keeps a 24-hour clock in every language", () => {
    const evening = new Date("2026-03-20T19:30:00Z");
    for (const locale of LOCALES) {
      expect(formats(locale).messageTime(evening)).toMatch(/^\d{2}:\d{2}$/);
    }
  });
});

describe("a day divider", () => {
  it("names yesterday rather than dating it", () => {
    const yesterday = new Date("2026-03-11T09:00:00Z");
    expect(formats("en").dayLabel(yesterday, NOW)).toBe("Yesterday");
    expect(formats("nl").dayLabel(yesterday, NOW)).toBe("Gisteren");
    expect(formats("fr").dayLabel(yesterday, NOW)).toBe("Hier");
  });
});
