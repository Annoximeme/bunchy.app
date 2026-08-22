import Link from "next/link";
import { Compass, Dices, Map, Radio } from "lucide-react";
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
 */

interface Shortcut {
  href: string;
  label: string;
  description: string;
  icon: typeof Compass;
  /** Same vocabulary as the chips: a colour is a meaning, not a decoration. */
  tone: "mint" | "accent" | "purple" | "teal";
  /** The radar has its own nav entry on a wide screen. */
  narrowOnly?: boolean;
}

const SHORTCUTS: Shortcut[] = [
  {
    href: "/now",
    label: "Bunchy Now",
    description: "Who is up for something, and when.",
    icon: Radio,
    tone: "mint",
  },
  {
    href: "/do",
    label: "Do something",
    description:
      "Say what you have (money, time, energy) and get an evening back.",
    icon: Compass,
    tone: "accent",
  },
  {
    href: "/surprise",
    label: "Surprise me",
    description:
      "Someone whose interests do not look like yours, but whose evenings do.",
    icon: Dices,
    tone: "purple",
  },
  {
    href: "/radar",
    label: "Radar",
    description: "Bunches and activities around you. Areas, never addresses.",
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
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {SHORTCUTS.map((shortcut) => (
        <li
          key={shortcut.href}
          className={cn(shortcut.narrowOnly && "md:hidden")}
        >
          <Link
            href={shortcut.href}
            className="card-surface group flex h-full items-start gap-3.5 p-4 transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)]",
                TONES[shortcut.tone],
              )}
            >
              <shortcut.icon size={19} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold tracking-tight group-hover:underline">
                {shortcut.label}
              </span>
              <span className="mt-0.5 block text-sm text-muted">
                {shortcut.description}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
