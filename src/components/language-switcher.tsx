"use client";

import { Suspense } from "react";
import NextLink from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/components/ui";
import { useLanguage } from "@/components/link";
import {
  LOCALES,
  LOCALE_NAMES,
  LOCALE_TAGS,
  localePath,
  splitLocale,
} from "@/lib/i18n/config";

/**
 * Changing language, without leaving the page you were on.
 *
 * Three links rather than a select and a form. A link can be opened in a new
 * tab, copied, and read by anything that reads links, and it lands on the
 * address that *is* this page in that language, so the change is a navigation
 * and not a piece of state the next request has to be told about. The proxy
 * remembers the choice on the way past.
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
          <NextLink
            key={option}
            href={`${localePath(option, path)}${query}`}
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
          </NextLink>
        );
      })}
    </nav>
  );
}
