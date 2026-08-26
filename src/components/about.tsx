import type { ReactNode } from "react";
import { Instrument_Serif } from "next/font/google";

/**
 * The furniture of the About page.
 *
 * Lifted out of the page so the three language versions of the essay can share
 * it. Nothing here holds a word: it is bands, measures, headings and the rule
 * between sections, and every one of them is a decision about how a long
 * document reads rather than about what it says.
 */

/** On `band-deep`, which is navy in both themes, so this never has to move. */
export const CORAL = "#FF5C6C";

/** Clause numerals and pull quotes, matching the policy pages. */
const editorial = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export function Band({ children }: { children: ReactNode }) {
  return (
    <section className="bg-band-soft px-5 py-24 md:py-32">
      {children}
    </section>
  );
}

/**
 * The reading column.
 *
 * Narrow on purpose. The measure is the single biggest lever on whether a
 * document this long gets finished, and a container that is merely "centred"
 * lets the line length follow the viewport instead.
 */
export function Column({ children }: { children: ReactNode }) {
  return <div className="reveal mx-auto max-w-[42rem]">{children}</div>;
}

export function Prose({
  children,
  size = "lg",
}: {
  children: ReactNode;
  size?: "sm" | "lg";
}) {
  return (
    <div
      className={`prose prose-band mt-5 ${size === "lg" ? "prose-lg" : "prose-base"}`}
    >
      {children}
    </div>
  );
}

/**
 * The small capitalised label above each heading.
 *
 * Two palettes, and the `on` prop is not decoration. The `-ink` tokens are the
 * accents darkened until they are legible on the soft band, which makes them
 * close to unreadable on the deep one, mint-ink on #0A0E1A is 1.6:1, and an
 * axe pass over the first draft of this page caught exactly that. The deep band
 * gets the bright variants instead: coral 6.3:1, purple 6.7:1, mint 10.6:1.
 *
 * The soft set is tokens and the deep set is literals, for the usual reason:
 * one of those grounds moves with the theme and the other does not.
 */
const EYEBROW_COLORS = {
  soft: {
    coral: "var(--color-accent-ink)",
    purple: "var(--color-purple-ink)",
    mint: "var(--color-mint-ink)",
  },
  deep: { coral: "#FF5C6C", purple: "#9B85FF", mint: "#55D6BE" },
} as const;

export function Eyebrow({
  children,
  tone,
  on = "soft",
  centered,
}: {
  children: ReactNode;
  tone: "coral" | "purple" | "mint";
  on?: "soft" | "deep";
  centered?: boolean;
}) {
  return (
    <p
      className={`text-xs font-bold uppercase tracking-[0.18em] ${centered ? "text-center" : ""}`}
      style={{ color: EYEBROW_COLORS[on][tone] }}
    >
      {children}
    </p>
  );
}

/** A column head in the three-up band. One step down from a section heading. */
export function ColumnHeading({ children }: { children: ReactNode }) {
  return (
    <h2
      className="mt-2 text-balance text-xl font-bold leading-snug tracking-tight text-ink"
    >
      {children}
    </h2>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return (
    <h2
      className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl"
    >
      {children}
    </h2>
  );
}

/**
 * The pull-quote, set wider than the column it interrupts.
 *
 * Breaking the margin is the point: it is the one element allowed to be wider
 * than the measure, which is what makes it read as a held-up sentence rather
 * than as a paragraph in a bigger font.
 */
export function PullQuote({ children }: { children: ReactNode }) {
  return (
    <figure className="reveal mx-auto my-16 max-w-4xl px-2 md:my-20">
      <div className="flex flex-col items-center gap-6 text-center">
        <span aria-hidden className="block h-px w-16" style={{ backgroundColor: CORAL }} />
        <blockquote
          className={`${editorial.className} text-balance text-3xl leading-[1.2] text-ink sm:text-5xl md:text-6xl`}
        >
          {children}
        </blockquote>
        <span aria-hidden className="block h-px w-16" style={{ backgroundColor: CORAL }} />
      </div>
    </figure>
  );
}

/** A quiet divider between two movements of the same band. */
export function Rule() {
  return <hr className="my-14 border-0 border-t border-line" />;
}
