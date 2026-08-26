import type { Locale } from "@/lib/i18n/config";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";

/**
 * The name of an interest, in the language being read.
 *
 * Not part of `t()`, and deliberately so. Every other phrase in this app is
 * written by us and exists in all three languages, which is what the compiler
 * checks. An interest is different: the taxonomy we ship is translated, and
 * anything a member typed in themselves is not, cannot be, and should not be.
 * A lookup that quietly returned the phrase path for a missing key, which is
 * what `t()` does, would render "interestNames.warhammer-40k" on somebody's
 * profile the first time they added their own.
 *
 * So this asks the catalogue and falls back to what is stored. For a seeded
 * interest that is the translation; for a member's own it is their own words,
 * spelled the way they spelled them.
 */
export function interestLabel(
  locale: Locale,
  slug: string,
  stored: string,
): string {
  const names = DICTIONARIES[locale].interestNames as Record<string, string>;
  const english = DICTIONARIES[DEFAULT_LOCALE].interestNames as Record<string, string>;
  return names[slug] ?? english[slug] ?? stored;
}

/**
 * The heading a group of interests sits under.
 *
 * Categories are ours rather than anybody's, so an unknown one can only be a
 * mistake in our own data, and the honest thing is to show it rather than to
 * swallow it.
 */
export function interestCategory(locale: Locale, category: string): string {
  const names = DICTIONARIES[locale].interestCategories as Record<string, string>;
  const english = DICTIONARIES[DEFAULT_LOCALE].interestCategories as Record<
    string,
    string
  >;
  return names[category] ?? english[category] ?? category;
}
