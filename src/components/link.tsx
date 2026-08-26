"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo } from "react";
import type { ComponentProps } from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_LOCALE,
  localePath,
  splitLocale,
  type Locale,
} from "@/lib/i18n/config";
import { DICTIONARIES, type Dictionary } from "@/lib/i18n/dictionaries";
import { createTranslator, type Translate } from "@/lib/i18n/translate";
import { createFormats, type Formats } from "@/lib/format";

/**
 * Links that keep the language they were followed in.
 *
 * Every internal link in the app goes through this. `href="/discover"` renders
 * as `/nl/discover` for somebody reading in Dutch, which is what makes the
 * prefix hold across a whole session rather than surviving one page: the
 * proxy would bounce an unprefixed click back to the prefixed address anyway,
 * and a redirect on every navigation is a slower way of arriving at the same
 * page.
 *
 * It is a drop-in for `next/link`, so switching a file over is changing the
 * import. Anything that is not a path of this app, a full URL, a `mailto:`, an
 * anchor, is passed through untouched.
 *
 * This file also carries the language itself, rather than a separate context
 * module, because everything that needs one needs the other: a component that
 * shows a phrase almost always links somewhere too.
 */

interface LanguageValue {
  locale: Locale;
  t: Translate<Dictionary>;
}

const LanguageContext = createContext<LanguageValue | null>(null);

export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo<LanguageValue>(
    () => ({ locale, t: createTranslator(locale, DICTIONARIES) }),
    [locale],
  );

  return <LanguageContext value={value}>{children}</LanguageContext>;
}

/**
 * The language of the page being read.
 *
 * Falls back to English rather than throwing when no provider is above it.
 * A component rendered outside the app shell, an error boundary, a test, a
 * standalone preview, should show English words rather than a stack trace.
 */
export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  return useMemo(
    () =>
      value ?? {
        locale: DEFAULT_LOCALE,
        t: createTranslator(DEFAULT_LOCALE, DICTIONARIES),
      },
    [value],
  );
}

/**
 * Dates and times in the language being read.
 *
 * Built once per language rather than per call: see the note in `format.ts`
 * about why these are formatters rather than functions.
 */
export function useFormats(): Formats {
  const { locale, t } = useLanguage();
  return useMemo(() => createFormats(locale, t), [locale, t]);
}

/** `const t = useTranslate()`, then `t("nav.discover")`. */
export function useTranslate(): Translate<Dictionary> {
  return useLanguage().t;
}

/** The address a path has in the language being read. */
export function useLocalePath(): (path: string) => string {
  const { locale } = useLanguage();
  return useCallback((path: string) => localePath(locale, path), [locale]);
}

/**
 * `router.push` with the language kept.
 *
 * The same wrapper as the link, for the navigations that happen after an
 * answer is saved rather than because something was clicked.
 */
export function useLocaleRouter() {
  const router = useRouter();
  const withLocale = useLocalePath();

  return useMemo(
    () => ({
      push: (path: string) => router.push(withLocale(path)),
      replace: (path: string) => router.replace(withLocale(path)),
      refresh: () => router.refresh(),
      back: () => router.back(),
    }),
    [router, withLocale],
  );
}

/**
 * The current path with the language taken back off it.
 *
 * What a component means when it asks "which page is this" is `/discover`,
 * never `/nl/discover`. Comparing an unprefixed href against a prefixed
 * pathname is how a highlighted nav item quietly stops highlighting for every
 * reader who is not reading in English.
 *
 * It also settles a hydration problem: the server sees the rewritten path with
 * no prefix and the browser sees the address bar with one, and stripping makes
 * both sides agree.
 */
export function useAppPath(): string {
  const pathname = usePathname();
  return splitLocale(pathname).path;
}

export function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const withLocale = useLocalePath();
  const target = typeof href === "string" ? withLocale(href) : href;
  return <NextLink href={target} {...props} />;
}
