/**
 * The languages Bunchy is offered in, and how a choice travels between pages.
 *
 * Three, because of where this is: Antwerp is a Dutch-speaking city in a
 * country with a French-speaking half and a working language of English on top
 * of both. A member picking between them is not choosing a translation of the
 * product, they are choosing which of their own languages they would rather
 * read, and plenty of people here would answer differently on different days.
 *
 * ## Why the language is in the address
 *
 * `/nl/discover` rather than a cookie alone. A cookie is invisible: it cannot
 * be linked to, cannot be shared, and cannot be indexed, so the Dutch version
 * of a page a Dutch speaker would search for does not exist as far as anything
 * outside this app is concerned. The prefix costs a redirect on the first
 * request and buys a real address for every page in every language.
 *
 * English is the exception and carries no prefix. It is the default, and
 * `/discover` and `/en/discover` being two addresses for one page is exactly
 * the duplication the prefix was meant to avoid, so the second redirects to
 * the first.
 *
 * The cookie still exists, and remembers the choice so that somebody arriving
 * at a bare address later gets the language they picked. The address wins
 * whenever the two disagree: a link somebody sent in French opens in French,
 * whatever the reader last chose here.
 */

export const LOCALES = ["en", "nl", "fr"] as const;

export type Locale = (typeof LOCALES)[number];

/** Unprefixed addresses are this one. */
export const DEFAULT_LOCALE: Locale = "en";

/**
 * Each language named in itself.
 *
 * "Nederlands", not "Dutch". Somebody who cannot read the interface cannot
 * read the word "Dutch" in it either, and the one control they need to find is
 * the one that gets them out.
 */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  nl: "Nederlands",
  fr: "Français",
};

/** What goes in the `lang` attribute and in `hreflang`. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en",
  nl: "nl-BE",
  fr: "fr-BE",
};

/**
 * Remembers the last choice for visits to an unprefixed address.
 *
 * A year, because a language preference does not go stale, and readable by the
 * server rather than HttpOnly-only, since nothing about it is a secret and the
 * language switcher is easier to reason about when both sides can see it.
 */
export const LOCALE_COOKIE = "bunchy_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: string | undefined | null): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Splits a pathname into the language it names and the path underneath.
 *
 * Returns a null locale when the address carries no prefix, which is a
 * different fact from "English": the caller has to decide whether to fall back
 * to the cookie, and only the proxy knows that.
 */
export function splitLocale(pathname: string): {
  locale: Locale | null;
  path: string;
} {
  const match = /^\/([^/]+)(\/.*)?$/.exec(pathname);
  if (!match || !isLocale(match[1])) return { locale: null, path: pathname };
  return { locale: match[1], path: match[2] ?? "/" };
}

/**
 * The address a path has in a given language.
 *
 * Anything that is not a path of this app is handed back untouched: a full
 * URL, a `mailto:`, an anchor. Prefixing those would produce nonsense, and the
 * link components below call this on every href they are given.
 */
export function localePath(locale: Locale, path: string): string {
  if (!path.startsWith("/")) return path;
  if (locale === DEFAULT_LOCALE) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/**
 * The best language for somebody who has not chosen one, from their browser.
 *
 * A deliberately small reading of `Accept-Language`: quality values are
 * honoured, regions are ignored, and anything unrecognised is skipped rather
 * than mapped to something close enough. `nl-BE` and `nl-NL` are both Dutch
 * here, which is true enough for an interface.
 */
export function preferredLocale(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params
        .map((p) => /^q=([0-9.]+)$/.exec(p.trim())?.[1])
        .find((value) => value !== undefined);
      return { tag: tag.toLowerCase(), quality: q === undefined ? 1 : Number(q) };
    })
    .filter((entry) => entry.tag.length > 0 && Number.isFinite(entry.quality))
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0] ?? "";
    if (isLocale(base)) return base;
  }
  return null;
}
