"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/components/ui";
import { useLanguage } from "@/components/link";
import {
  LOCALES,
  LOCALE_NAMES,
  LOCALE_TAGS,
  localeChoicePath,
  splitLocale,
} from "@/lib/i18n/config";

/**
 * Changing language, without leaving the page you were on.
 *
 * Three links rather than a select and a form. A link can be opened in a new
 * tab, copied, and read by anything that reads links, and it lands on an
 * address that names the language out loud, so the change is a navigation and
 * not a piece of state the next request has to be told about. The proxy
 * remembers the choice on the way past.
 *
 * All three hrefs carry a prefix, English included, which is the one place in
 * the app that does not use the canonical address. A bare `/discover` says
 * nothing about language, so the proxy reads it with the cookie, and a reader
 * whose cookie said Dutch was returned to Dutch by the very control they
 * pressed to leave it. `/en/discover` says English, and the proxy records that
 * and bounces to `/discover`, which is where they land.
 *
 * Plain anchors rather than `next/link`, which is the other half of the same
 * bug. A client-side navigation keeps the layout it is already inside, and the
 * language lives in that layout: the address changed, the cookie changed, and
 * the page went on rendering every word in the language the reader had just
 * left, until something forced a real load. The `lang` attribute on `html`
 * stayed behind too, so a screen reader kept the old voice. A language is a
 * property of the document, so changing it is a document load.
 *
 * Each name is written in its own language, and carries `lang` and `hreflang`
 * so a screen reader pronounces "Nederlands" as Dutch rather than reading it
 * with an English mouth. The current language is marked with `aria-current`
 * rather than being removed: a switcher that hides the option you are on gives
 * you no way to tell which that is.
 */
export function LanguageSwitcher(props: { className?: string; compact?: boolean }) {
  // `useSearchParams` opts a page out of being rendered ahead of time unless
  // there is a boundary around it, and this control belongs on the landing
  // page as much as inside the app. The fallback is the same switcher without
  // the query string, which is the right answer on every page that has none.
  return (
    <Suspense fallback={<Switcher {...props} query="" />}>
      <WithQuery {...props} />
    </Suspense>
  );
}

function WithQuery(props: { className?: string; compact?: boolean }) {
  const search = useSearchParams().toString();
  return <Switcher {...props} query={search ? `?${search}` : ""} />;
}

function Switcher({
  className,
  compact = false,
  query,
}: {
  className?: string;
  compact?: boolean;
  query: string;
}) {
  const { locale, t } = useLanguage();
  const pathname = usePathname();

  // The prefix is stripped rather than assumed absent. On the server this path
  // has already been rewritten and carries none; in the browser it carries the
  // one in the address bar, and both have to produce the same href or the
  // markup does not match what hydrates over it.
  const { path } = splitLocale(pathname);

  return (
    <nav
      aria-label={t("language.label")}
      className={cn("flex items-center gap-1", className)}
    >
      {LOCALES.map((option) => {
        const current = option === locale;
        return (
          <a
            key={option}
            href={`${localeChoicePath(option, path)}${query}`}
            hrefLang={LOCALE_TAGS[option]}
            lang={LOCALE_TAGS[option]}
            aria-current={current ? "true" : undefined}
            className={cn(
              "rounded-[var(--radius-control)] px-2 py-1 text-xs font-semibold uppercase tracking-wide transition-colors",
              current
                ? "bg-accent-soft text-accent-ink"
                : "text-muted hover:bg-surface-sunken hover:text-ink",
            )}
          >
            {compact ? option : LOCALE_NAMES[option]}
          </a>
        );
      })}
    </nav>
  );
}
