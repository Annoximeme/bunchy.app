import Link from "next/link";
import type { ReactNode } from "react";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import { brand } from "@/lib/brand";
import { BunchyLogo } from "@/components/logo";
import { SITE_LINKS } from "@/components/site-links";

/**
 * Shared furniture for the policy pages.
 *
 * Set in the same type as the rest of the product rather than a wall of
 * uppercase clauses. A document nobody can read is not consent, and the whole
 * argument of this product is that it does not rely on people not reading.
 *
 * ## Why it looks like About
 *
 * These four pages and About are one family: the public documents that explain
 * what Bunchy is and what it owes you. They were furnished differently, which
 * meant following a link from About to Privacy felt like leaving the site. The
 * masthead, the footer, the fonts and the measure are now shared, so the set
 * reads as one publication.
 *
 * ## The one thing that is not shared
 *
 * The reading ground. About is a pinned composition — cream whatever the
 * reader's theme says — and Terms and Privacy follow it, because they are the
 * same kind of object: a document you read start to finish once.
 *
 * Safety and the volunteer page stay on the tokens. The volunteer page embeds
 * the application form, which is built from the product's own themed controls;
 * pinning the page around it would leave a member in dark mode filling in a
 * dark form on a cream sheet. The masthead and footer are dark on every one of
 * them either way, so the family still holds together.
 */

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/** Clause numerals only, matching the pull-quotes on About. */
const editorial = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const CREAM = "#FFF9F3";
const CORAL = "#FF5C6C";

/** Which palette the body of the document is drawn from. */
export type Ground = "pinned" | "themed";

export function LegalPage({
  title,
  summary,
  contact,
  path,
  ground = "pinned",
  children,
}: {
  title: string;
  summary: string;
  /** Where questions about *this* document go. Terms and privacy differ. */
  contact: string;
  /** This page's own route, so the nav does not link back to itself. */
  path?: string;
  /** `themed` for pages that embed the product's own controls. */
  ground?: Ground;
  children: ReactNode;
}) {
  const pinned = ground === "pinned";

  return (
    <div
      className={`${display.className} min-h-dvh ${pinned ? "" : "bg-canvas text-ink"}`}
      style={pinned ? { backgroundColor: CREAM, color: "#172033" } : undefined}
    >
      {/* The masthead. Dark on every policy page, themed or not. */}
      <section className="relative overflow-hidden bg-navy-base text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 12% 0%, rgba(255,92,108,0.14), transparent 60%), radial-gradient(50% 50% at 88% 15%, rgba(118,87,255,0.14), transparent 60%)",
          }}
        />

        <header className="relative mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-5 py-6">
          <Link href="/" aria-label={brand.name}>
            <BunchyLogo height={20} color="#ffffff" />
          </Link>
          {/*
            Was Privacy and Terms only, which made every policy page a dead end
            for the two that matter most to somebody reading them: Safety, and
            the volunteer page that asks for an account. The shared nav reads
            from the theme tokens, which are wrong on a ground that never moves,
            so this is the same list drawn for navy.
          */}
          <nav
            aria-label={`About ${brand.name}`}
            className="flex flex-wrap gap-x-5 gap-y-1 text-sm"
          >
            {SITE_LINKS.filter((link) => link.href !== path).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/60 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="relative mx-auto max-w-3xl px-5 pb-20 pt-10 md:pb-24 md:pt-14">
          {/* The brand over the document title, the way a masthead sits over a
              headline. It is the one label here that cannot go out of date. */}
          <p
            className="text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: CORAL }}
          >
            {brand.name}
          </p>
          <h1 className="mt-4 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
            {summary}
          </p>
          <p className="mt-8 text-sm text-white/60">
            Questions:{" "}
            <a
              href={`mailto:${contact}`}
              className="underline underline-offset-4"
              style={{ color: CORAL }}
            >
              {contact}
            </a>
            .
          </p>
        </div>
      </section>

      <main id="main" className="px-5 py-20 md:py-28">
        <div className="mx-auto max-w-3xl space-y-14">{children}</div>
      </main>

      <footer className="bg-navy-base px-5 py-10 text-sm text-white/60">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <p>
            {brand.name}. {brand.tagline}
          </p>
          <nav aria-label={`About ${brand.name}`}>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {SITE_LINKS.filter((link) => link.href !== path).map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  Home
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/**
 * One numbered clause.
 *
 * The numeral is set in the serif that carries the pull-quotes on About, large
 * and in coral, hanging beside the heading rather than running into it. A
 * document with fourteen clauses is navigated by its numbers, so they are the
 * thing to make findable.
 *
 * Each one carries an id, so a clause can be linked to and cited. That is the
 * least a policy owes somebody who wants to point at a specific promise.
 */
export function Clause({
  n,
  title,
  ground = "pinned",
  children,
}: {
  n: number;
  title: string;
  ground?: Ground;
  children: ReactNode;
}) {
  const pinned = ground === "pinned";

  return (
    <section id={`clause-${n}`} className="reveal scroll-mt-8">
      <div className="flex items-baseline gap-4">
        <span
          aria-hidden
          // A fixed column, so clause 1 and clause 14 put their headings in the
          // same place. Without it the single digits sat a character narrower
          // and every heading in the document shifted as the numbers grew.
          className={`${editorial.className} w-8 shrink-0 text-right text-4xl leading-none tabular-nums sm:w-10 sm:text-5xl`}
          style={{ color: pinned ? "#C42A40" : "var(--color-accent-ink)" }}
        >
          {n}
        </span>
        <h2
          className="text-balance text-2xl font-extrabold tracking-tight"
          style={pinned ? { color: "#172033" } : undefined}
        >
          {title}
        </h2>
      </div>

      {/*
        The measure comes from the typography plugin now — 65ch, rather than the
        62ch of the "0" glyph this file used to hand-roll. Same intent, one
        fewer bespoke rule: body copy here ran ~100 characters a line before
        either existed, which is a document people bounce off, and this one
        claims to be written to be read.
      */}
      <div
        className={`prose mt-4 ${pinned ? "prose-letter" : "prose-doc"} prose-headings:font-bold`}
      >
        {children}
      </div>
    </section>
  );
}

/** A plain list of facts — what we hold, what we don't. */
export function Facts({
  items,
  ground = "pinned",
}: {
  items: Array<[string, string]>;
  ground?: Ground;
}) {
  const pinned = ground === "pinned";
  const line = pinned ? "#EFE6DA" : "var(--color-line)";

  return (
    // Outside the prose: the plugin styles `dl` for definition lists in running
    // text, and this is a table wearing a `dl`'s markup. It also wants the full
    // width rather than the 65ch measure.
    <dl
      className="not-prose my-6 divide-y overflow-hidden rounded-2xl border"
      style={{
        borderColor: line,
        backgroundColor: pinned ? "#ffffff" : "var(--color-surface)",
        // `divide-*` needs the colour too, and Tailwind's divide utility only
        // takes a class, so the border colour is set on the children below.
      }}
    >
      {items.map(([term, detail]) => (
        <div
          key={term}
          className="grid gap-1 p-4 sm:grid-cols-[13rem_1fr] sm:gap-5"
          style={{ borderColor: line }}
        >
          <dt
            className="font-semibold"
            style={{ color: pinned ? "#172033" : "var(--color-ink)" }}
          >
            {term}
          </dt>
          <dd
            className="text-[15px] leading-relaxed"
            style={{ color: pinned ? "#3d4759" : "var(--color-ink-soft)" }}
          >
            {detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}
