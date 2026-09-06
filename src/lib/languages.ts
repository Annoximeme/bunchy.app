/**
 * The languages a member can say they socialise in.
 *
 * ## Why there is a catalogue at all
 *
 * A free-text field would collect "vlaams", "Flemish", "NL", "dutch (a bit)"
 * and "nederlands" as five different languages, and matching two people means
 * comparing those strings. A closed list is what makes "you both speak Dutch"
 * a fact the scorer can act on rather than a coincidence of spelling.
 *
 * ## Why each language is named in itself
 *
 * "Nederlands", not "Dutch", and "العربية", not "Arabic". This is the same
 * reasoning the locale switcher uses, and it is stronger here: the person
 * looking for their own language in this list may not read the one the page is
 * written in, and an endonym is the one label that is legible to exactly the
 * people who need to find it. It also means these names need no translating,
 * so the list is one table rather than three, and a thirty-first language is a
 * line rather than a line in every dictionary.
 *
 * ## What is in it
 *
 * The languages actually spoken where this product is, then the ones with
 * enough speakers anywhere that somebody here is likely to want them. It is not
 * a complete list of human languages and does not try to be. Adding one is a
 * line below; the only rule is that the code is ISO 639-1 and lowercase,
 * because that code is what gets stored and compared.
 */

export interface Language {
  /** ISO 639-1, lowercase. Stored, compared, and never shown. */
  code: string;
  /** The language's name in itself. Shown, and never compared. */
  name: string;
}

/**
 * Dutch, French and English first, in that order, because that is the order
 * they are spoken in the city this was built in and a picker is faster when
 * the answer is usually at the top. Everything after them is alphabetical by
 * code so the list has one rule rather than a hierarchy of them.
 */
export const LANGUAGES: readonly Language[] = [
  { code: "nl", name: "Nederlands" },
  { code: "fr", name: "Français" },
  { code: "en", name: "English" },

  { code: "am", name: "አማርኛ" },
  { code: "ar", name: "العربية" },
  { code: "bg", name: "Български" },
  { code: "bn", name: "বাংলা" },
  { code: "cs", name: "Čeština" },
  { code: "da", name: "Dansk" },
  { code: "de", name: "Deutsch" },
  { code: "el", name: "Ελληνικά" },
  { code: "es", name: "Español" },
  { code: "fa", name: "فارسی" },
  { code: "fi", name: "Suomi" },
  { code: "he", name: "עברית" },
  { code: "hi", name: "हिन्दी" },
  { code: "hr", name: "Hrvatski" },
  { code: "hu", name: "Magyar" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "it", name: "Italiano" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "lt", name: "Lietuvių" },
  { code: "no", name: "Norsk" },
  { code: "pl", name: "Polski" },
  { code: "pt", name: "Português" },
  { code: "ro", name: "Română" },
  { code: "ru", name: "Русский" },
  { code: "sk", name: "Slovenčina" },
  { code: "so", name: "Soomaali" },
  { code: "sq", name: "Shqip" },
  { code: "sr", name: "Српски" },
  { code: "sv", name: "Svenska" },
  { code: "sw", name: "Kiswahili" },
  { code: "th", name: "ไทย" },
  { code: "tr", name: "Türkçe" },
  { code: "uk", name: "Українська" },
  { code: "ur", name: "اردو" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "zh", name: "中文" },
] as const;

const BY_CODE = new Map(LANGUAGES.map((language) => [language.code, language]));

/** Everything a member is allowed to pick. Nothing else is stored. */
export function isLanguageCode(value: string): boolean {
  return BY_CODE.has(value);
}

/**
 * The name to show for a stored code.
 *
 * Falls back to the code itself rather than throwing. A code can only be in
 * the database because this file once listed it, so a row whose language has
 * since been removed is our mistake, and rendering "sw" is a smaller failure
 * than a page that will not load.
 */
export function languageName(code: string): string {
  return BY_CODE.get(code)?.name ?? code;
}

/**
 * Keeps only codes this file knows, lowercased, deduplicated, in catalogue
 * order.
 *
 * Called on the way in, so nothing invented by a client reaches the database.
 * Catalogue order rather than the order they were sent, because the order a
 * checkbox list happens to serialise in is not information, and stable output
 * makes "did this change" answerable by comparing two arrays.
 */
export function normaliseLanguageCodes(codes: readonly string[]): string[] {
  const wanted = new Set(codes.map((code) => code.trim().toLowerCase()));
  return LANGUAGES.filter((language) => wanted.has(language.code)).map(
    (language) => language.code,
  );
}

/**
 * How many languages one person may claim.
 *
 * A cap exists because a profile listing twenty languages is either untrue or
 * unusable as a signal, and both make the field worth less to everybody else.
 * Six is above what almost anybody genuinely socialises in and well below the
 * point where the claim stops meaning anything.
 */
export const MAX_LANGUAGES_PER_PROFILE = 6;
