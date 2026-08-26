import { cache } from "react";
import { headers } from "next/headers";
import {
  DEFAULT_LOCALE,
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
