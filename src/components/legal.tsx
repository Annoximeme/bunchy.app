import Link from "next/link";
import type { ReactNode } from "react";
import { brand } from "@/lib/brand";
import { BunchyLogo } from "@/components/logo";

/**
 * Shared furniture for the policy pages.
 *
 * Set in the same type as the rest of the product rather than a wall of
 * uppercase clauses. A document nobody can read is not consent, and the whole
 * argument of this product is that it does not rely on people not reading.
 */

export function LegalPage({
  title,
  summary,
  contact,
  children,
}: {
  title: string;
  summary: string;
  /** Where questions about *this* document go. Terms and privacy differ. */
  contact: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Link href="/" aria-label={brand.name}>
          <BunchyLogo height={20} color="var(--color-ink)" />
        </Link>
        <nav className="flex gap-5 text-sm text-muted">
          <Link href="/privacy" className="transition-colors hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-ink">
            Terms
          </Link>
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-3xl px-5 pb-24 pt-6">
        <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{summary}</p>

        <p className="mt-6 text-sm text-muted">
          Questions:{" "}
          <a href={`mailto:${contact}`} className="text-accent-ink underline underline-offset-2">
            {contact}
          </a>
          .
        </p>

        <div className="mt-12 space-y-11">{children}</div>

        <footer className="mt-16 border-t border-line pt-8 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink">
            ← Back to {brand.name}
          </Link>
        </footer>
      </main>
    </div>
  );
}

export function Clause({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="flex gap-3 text-xl font-semibold tracking-tight">
        <span aria-hidden className="text-muted tabular-nums">
          {n}.
        </span>
        {title}
      </h2>
      {/*
        A measure on the prose, not the container: the facts table wants the full
        width, but body copy ran ~100 characters a line, which is a document
        people bounce off — and this one claims to be written to be read.
        62ch of the "0" glyph measures ~71 real characters, inside the 45-75
        range rather than at its edge.
      */}
      <div className="mt-3 space-y-3 text-base leading-relaxed text-ink-soft [&>p]:max-w-[62ch] [&>ul]:max-w-[60ch] [&_a]:text-accent-ink [&_a:hover]:underline [&_strong]:font-semibold [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}

/** A plain list of facts — what we hold, what we don't. */
export function Facts({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line">
      {items.map(([term, detail]) => (
        <div key={term} className="grid gap-1 p-4 sm:grid-cols-[13rem_1fr] sm:gap-5">
          <dt className="font-medium text-ink">{term}</dt>
          <dd className="text-[15px] leading-relaxed">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}
