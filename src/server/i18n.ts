import { cache } from "react";
import { headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_TAGS,
  isLocale,
  localePath,
  type Locale,
} from "@/lib/i18n/config";
import { DICTIONARIES, type Dictionary } from "@/lib/i18n/dictionaries";
import { createTranslator, type Translate } from "@/lib/i18n/translate";

/**
 * The language of the request being served.
 *
 * Read from the header the proxy set, which has already weighed the address
 * against the cookie against the browser's own list. Nothing else should
 * repeat that reasoning: two places deciding what language a page is in is two
 * places that can disagree, and the one the reader sees would be whichever
 * rendered last.
 *
 * `cache` makes it once per request rather than once per component asking.
 */
export const currentLocale = cache(async (): Promise<Locale> => {
  const value = (await headers()).get("x-locale");
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** `const t = await getTranslations()`, then `t("nav.discover")`. */
export async function getTranslations(): Promise<Translate<Dictionary>> {
  return createTranslator(await currentLocale(), DICTIONARIES);
}

/**
 * The address a path has in the language being served.
 *
 * For the redirects in layouts and pages: `redirect(await localeHref("/login"))`.
 * A signed-out Dutch reader sent to a bare `/login` would land on the English
 * page and be bounced to the Dutch one by the proxy, having flashed the wrong
 * language on the way. This sends them straight there.
 *
 * It is not called `localeRedirect` and does not redirect, because `redirect`
 * comes from the Next navigation module and this file is under `src/server`,
 * where the lint rule keeps the transport layer out. The rule is right: the
 * page knows it is a page, this only knows what language it is in.
 */
export async function localeHref(path: string): Promise<string> {
  return localePath(await currentLocale(), path);
}

/**
 * The path being served, with no language on it.
 *
 * Set by the proxy. Metadata is generated outside the component tree, so
 * `usePathname` is not available there and the rewritten URL is not either.
 */
export async function currentPath(): Promise<string> {
  return (await headers()).get("x-pathname") ?? "/";
}

/**
 * This page's address in each language, for the document head.
 *
 * The counterpart to the sitemap's alternates, and the more important half:
 * a crawler that only ever reaches a page by following a link still learns
 * that the other two exist. `x-default` is the unprefixed address, which is
 * what somebody with no stated language is sent to anyway.
 */
export async function languageAlternates(): Promise<{
  canonical: string;
  languages: Record<string, string>;
}> {
  const [locale, path] = await Promise.all([currentLocale(), currentPath()]);
  return {
    canonical: localePath(locale, path),
    languages: {
      ...Object.fromEntries(
        LOCALES.map((option) => [LOCALE_TAGS[option], localePath(option, path)]),
      ),
      "x-default": path,
    },
  };
}
