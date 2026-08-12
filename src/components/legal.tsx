import Link from "next/link";
import type { ReactNode } from "react";
import { brand } from "@/lib/brand";
import { LEGAL, legalDetailsComplete } from "@/lib/legal";
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
  children,
}: {
  title: string;
  summary: string;
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
          {legalDetailsComplete() ? (
            <>In effect from {LEGAL.effectiveDate}.</>
          ) : (
            <>Draft — not yet in effect.</>
          )}{" "}
          Questions:{" "}
          <a href={`mailto:${LEGAL.privacyContact}`} className="text-accent-ink hover:underline">
            {LEGAL.privacyContact}
          </a>
          .
        </p>

        {!legalDetailsComplete() && (
          /*
           * Shown until `LEGAL` is filled in. A half-finished policy that looks
           * finished is worse than one that says so: a visitor can see this is
           * not yet the binding document, and the placeholders below are
           * obviously placeholders rather than a rendering fault.
           */
          <div className="mt-8 rounded-[var(--radius-card)] border border-yellow bg-yellow-soft p-4 text-sm text-yellow-ink">
            <strong className="font-semibold">This is a working draft.</strong>{" "}
            It describes what {brand.name} actually does today and is accurate on
            that, but the company details are not yet filled in and it has not
            been reviewed by a lawyer. It is not in force. Nothing here is legal
            advice.
          </div>
        )}

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
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-soft [&_a]:text-accent-ink [&_a:hover]:underline [&_strong]:font-semibold [&_strong]:text-ink">
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
