import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Clapperboard,
  Gamepad2,
  Laptop,
  MapPin,
  Music,
  Sparkles,
  Star,
} from "lucide-react";
import type { BuzzCard, PulseLane } from "@/server/modules/buzz/service";
import type { BuzzCategory } from "@/generated/prisma/enums";
import { BuzzSignalButton } from "@/components/buzz/buzz-signal-button";

/**
 * The furniture of the Buzz board.
 *
 * Two rules run through all of it, and they are the same rule twice.
 *
 * **The action is the card.** A Buzz card is not a headline with a button
 * bolted underneath; the button is the reason the card exists, so it is the
 * element that grows on hover while the rest of the card stays still. Reading
 * is the pretext. Doing is the point.
 *
 * **The board ends.** Nothing here loads more on scroll. Posts are grouped by
 * subject and the groups are finite, because the success condition for this
 * section is that somebody leaves it to go and do the thing.
 *
 * Hover and lift are CSS transitions rather than a motion library, which is how
 * every other interactive surface in this product is built — the landing page
 * dropped framer-motion for the same reason and these cards need less than it
 * did.
 */

export const CATEGORIES: Array<{
  value: BuzzCategory | "all" | "picks";
  label: string;
  icon: typeof Gamepad2;
}> = [
  { value: "all", label: "Everything", icon: Sparkles },
  { value: "GAMING", label: "Gaming", icon: Gamepad2 },
  { value: "SCREEN", label: "Movies & TV", icon: Clapperboard },
  { value: "MUSIC", label: "Music", icon: Music },
  { value: "TECH", label: "Tech", icon: Laptop },
  { value: "LOCAL", label: "Local", icon: MapPin },
  { value: "picks", label: "Bunchy picks", icon: Star },
];

export function CategoryFilters({
  active,
}: {
  active: BuzzCategory | "all" | "picks";
}) {
  return (
    // Horizontally scrollable on a phone, and a real list to a screen reader.
    // `-mx-5 px-5` lets the row bleed to the screen edge so it reads as
    // scrollable rather than as a row that mysteriously stops.
    <nav aria-label="Buzz categories" className="-mx-5 mt-8 overflow-x-auto px-5 pb-1">
      <ul className="flex w-max gap-2.5">
        {CATEGORIES.map(({ value, label, icon: Icon }) => {
          const on = value === active;
          return (
            <li key={value}>
              <Link
                href={value === "all" ? "/discover/buzz" : `/discover/buzz?c=${value}`}
                aria-current={on ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                  on
                    ? "border-transparent bg-accent text-[var(--color-on-accent)]"
                    : "border-line bg-surface text-ink-soft hover:border-accent/40 hover:text-ink"
                }`}
              >
                <Icon size={15} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Who is around, from live rows.
 *
 * Renders nothing at all when every lane is below the floor. An empty pulse bar
 * is worse than no pulse bar: it is a component whose whole job is to say the
 * place is alive, saying it about an empty room.
 */
export function PulseBar({ lanes }: { lanes: PulseLane[] }) {
  if (lanes.length === 0) return null;

  return (
    <section className="mt-8 overflow-hidden rounded-[var(--radius-card)] bg-band-deep p-6 text-white sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
        <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-mint-status">
            Online right now
          </p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {lanes.map((lane) => (
              <li key={lane.label} className="flex items-center gap-2.5">
                <span className="relative flex size-2.5">
                  {/* The ring is decorative and sits behind the dot, so the dot
                      itself is never the thing that moves. */}
                  <span
                    aria-hidden
                    className="ping-ring absolute inset-0 rounded-full bg-mint-status"
                  />
                  <span className="relative size-2.5 rounded-full bg-mint-status" />
                </span>
                <span className="text-sm">
                  <span className="font-semibold">{lane.label}</span>{" "}
                  <span className="text-white/60">({lane.count})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/now"
          className="inline-flex items-center gap-2 rounded-full bg-mint-status px-5 py-2.5 text-sm font-bold text-[var(--color-on-mint)] transition-transform duration-200 hover:scale-[1.03]"
        >
          Find something to do right now
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </section>
  );
}

const CATEGORY_ICON: Record<BuzzCategory, typeof Gamepad2> = {
  GAMING: Gamepad2,
  SCREEN: Clapperboard,
  MUSIC: Music,
  TECH: Laptop,
  LOCAL: MapPin,
};

/**
 * An action card.
 *
 * The headline is a link to the piece; the button is a different destination on
 * purpose. Somebody who already knows they want to do this should never have to
 * read the article first, which is the quiet failure of every "read more" card
 * ever drawn.
 */
export function ActionCard({ card }: { card: BuzzCard }) {
  const Icon = CATEGORY_ICON[card.category];

  return (
    <article
      className={`group relative flex flex-col rounded-[var(--radius-card)] border bg-surface p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift ${
        card.isPick ? "border-yellow-fun/60" : "border-line"
      }`}
    >
      {card.isPick && (
        <span className="absolute -top-2.5 left-6 inline-flex items-center gap-1.5 rounded-full bg-yellow-fun px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-yellow)]">
          <Star size={11} aria-hidden />
          Bunchy pick
        </span>
      )}

      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent-ink">
        <Icon size={14} aria-hidden />
        {card.eyebrow}
      </p>

      <h3 className="mt-3 text-balance text-xl font-bold leading-snug tracking-tight">
        {/* The whole card is not a link: it carries two destinations, and a card
            that is one big anchor makes the button inside it a nested control. */}
        <Link
          href={`/discover/buzz/${card.slug}`}
          className="rounded-sm transition-colors hover:text-accent-ink"
        >
          {card.headline}
        </Link>
      </h3>

      <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
        {card.standfirst}
      </p>

      {/* `mt-auto` rather than a fixed margin: cards in a row have different
          amounts of copy, and the thing that has to line up across them is the
          button, not the paragraph above it. */}
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
        <Link
          href={`/start?q=${encodeURIComponent(card.actionQuery)}`}
          // The button is what grows. The card lifts by two pixels; this scales
          // and lights up, because the card is the excuse and this is the point.
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-[var(--color-on-accent)] transition-all duration-200 group-hover:scale-[1.04] group-hover:shadow-[0_10px_28px_-10px_var(--color-accent)]"
        >
          {card.actionLabel}
          <ArrowRight size={15} aria-hidden />
        </Link>

        <BuzzSignalButton
          slug={card.slug}
          initialIsIn={card.viewerIsIn}
          initialCount={card.interested}
        />
      </div>
    </article>
  );
}

/** A titled group. The board is made of these, and each one ends. */
export function BuzzGroup({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-14">
      <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
      {note && <p className="mt-1.5 text-sm text-ink-soft">{note}</p>}
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

/**
 * The thing an article ends with.
 *
 * Never a comment box, never "related articles". A reader who got to the bottom
 * of a piece about a game is a reader who wants to play it with somebody, and
 * this is the only sentence on the page that helps with that.
 */
export function BunchUp({
  query,
  label,
  nearby,
}: {
  query: string;
  label: string;
  /** Real count of members into this, or null. Never a fabricated number. */
  nearby: number | null;
}) {
  return (
    <aside className="mt-14 overflow-hidden rounded-[var(--radius-card)] bg-band-deep px-7 py-9 text-center text-white sm:px-10">
      <p className="text-xl font-extrabold tracking-tight sm:text-2xl">
        Looking for people to do this with?
      </p>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-white/70">
        {nearby === null
          ? "Start it and Bunchy will look for four or five people who are into the same thing and free when you are."
          : `${nearby} members here are into this. Start something and Bunchy will find the four or five who are also free when you are.`}
      </p>
      <Link
        href={`/start?q=${encodeURIComponent(query)}`}
        className="mt-7 inline-flex items-center gap-2 rounded-full bg-accent px-9 py-4 text-base font-bold text-[var(--color-on-accent)] transition-transform duration-200 hover:scale-[1.04]"
      >
        {label}
        <ArrowRight size={18} aria-hidden />
      </Link>
    </aside>
  );
}
