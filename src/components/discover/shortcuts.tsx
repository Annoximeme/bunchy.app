"use client";

import { Link, useTranslate } from "@/components/link";
import { phrase, type PhraseRef } from "@/lib/i18n/phrase";
import { ArrowRight, Compass, Dices, Map, Radio } from "lucide-react";
import { cn } from "@/components/ui";

/**
 * The other ways to find something.
 *
 * These were four pills in a row, "Bunchy Now", "Do something", "Surprise
 * me", "Open the radar", four verbs with nothing to say which one to press.
 * Three of them answer the same rough question ("find me something now") by
 * completely different routes, and a member who had not already used all three
 * had no way to tell them apart. A shortcut nobody understands is a shortcut
 * nobody takes.
 *
 * Each one now says what it does in a clause, in the same words its own page
 * opens with, so pressing it is not a gamble.
 *
 * ## Why they sit below the recommendations
 *
 * They used to sit above, which put four escape hatches in front of the thing
 * the page exists to show. They are what you want when the recommendations did
 * not appeal, so they belong exactly where that becomes true, at the end.
 * That also turns a dead-end ("that's everything") into a door.
 *
 * ## The shape
 *
 * Stacked rather than side by side, so four of them make a row across the foot
 * of the page instead of a two-by-two block of text. The arrow is the only
 * thing that moves: it slides in on hover, which is a door opening, and it is
 * `aria-hidden` because the link already says where it goes.
 */

interface Shortcut {
  href: string;
  /** Phrase paths: this list is module scope, the language is not. */
  label: PhraseRef;
  description: PhraseRef;
  icon: typeof Compass;
  /** Same vocabulary as the chips: a colour is a meaning, not a decoration. */
  tone: "mint" | "accent" | "purple" | "teal";
  /** The radar has its own nav entry on a wide screen. */
  narrowOnly?: boolean;
}

const SHORTCUTS: Shortcut[] = [
  {
    href: "/now",
    label: phrase("discover.shortcutNow"),
    description: phrase("discover.shortcutNowBody"),
    icon: Radio,
    tone: "mint",
  },
  {
    href: "/do",
    label: phrase("discover.shortcutDo"),
    description: phrase("discover.shortcutDoBody"),
    icon: Compass,
    tone: "accent",
  },
  {
    href: "/surprise",
    label: phrase("discover.shortcutSurprise"),
    description: phrase("discover.shortcutSurpriseBody"),
    icon: Dices,
    tone: "purple",
  },
  {
    href: "/radar",
    label: phrase("discover.shortcutRadar"),
    description: phrase("discover.shortcutRadarBody"),
    icon: Map,
    tone: "teal",
    narrowOnly: true,
  },
];

const TONES = {
  mint: "bg-mint-soft text-mint-ink",
  accent: "bg-accent-soft text-accent-ink",
  purple: "bg-purple-soft text-purple-ink",
  teal: "bg-teal-soft text-teal",
} as const;

export function DiscoverShortcuts() {
  const t = useTranslate();

  return (
    /*
      Three columns rather than four. The radar tile is `md:hidden`, because
      the radar has a nav entry of its own on a wide screen, so a four-column
      grid would leave a hole in the row on exactly the sizes where the grid is
      widest. At `lg` there are three tiles and three columns, and below that
      all four are visible and fall into two.
    */
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {SHORTCUTS.map((shortcut) => (
        <li
          key={shortcut.href}
          className={cn(shortcut.narrowOnly && "md:hidden")}
        >
          <Link
            href={shortcut.href}
            /*
              A row on a phone and a tile from `sm` up. Stacking the icon above
              the label everywhere added about a hundred pixels of height per
              shortcut on the narrowest screen, four times over, on the page
              that is already the longest in the product.
            */
            className="card-surface group flex h-full items-start gap-3.5 p-4 transition-all duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:flex-col sm:items-stretch sm:p-5"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] transition-transform duration-300 ease-[var(--ease-out-soft)] group-hover:scale-105",
                TONES[shortcut.tone],
              )}
            >
              <shortcut.icon size={20} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-semibold tracking-tight group-hover:underline">
                {t(shortcut.label)}
                <ArrowRight
                  size={15}
                  aria-hidden
                  className="-translate-x-1 opacity-0 transition-all duration-300 ease-[var(--ease-out-soft)] group-hover:translate-x-0 group-hover:opacity-100"
                />
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">
                {t(shortcut.description)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
