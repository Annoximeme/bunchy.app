import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-links";

/**
 * The title, the sentence under it, and the one thing you can do from here.
 *
 * The action slot used to be whatever each page felt like: a filled pill on
 * Activities, an outlined one on the profile, a grey link on Notifications, and
 * nothing at all on Bunchy Now, where the equivalent button sat further down the
 * page instead. Four treatments for one slot, in a product with fourteen of
 * these headers.
 *
 * The rule now, and it is a rule about roles rather than about colour:
 *
 * - **Primary**, the thing this page exists to let you make. A filled pill.
 *   `<LinkButton href="/bunches/new">Start a bunch</LinkButton>`
 * - **Secondary**, another view of what is already here. An outlined pill.
 *   `<LinkButton variant="secondary" size="sm">View as others see it</LinkButton>`
 * - **Tertiary**, settings and exits. A ghost button with an icon, size sm.
 *
 * Alignment is part of the rule. `items-end` used to hang the action off the
 * bottom of the title block, so a page with a two-line subtitle put its button
 * a line and a half lower than the page before it. It sits with the title now.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 max-w-xl text-ink-soft">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/**
 * How wide a page is allowed to be, decided by what it holds.
 *
 * There used to be one width here and eight pages that quietly overrode it from
 * the inside, so walking Discover to Notifications to Radar took the column from
 * 1024 to 672 and back with nothing in the content to explain it. Worse, those
 * overrides sat *inside* the shell, so the site footer went on being laid out at
 * the full width and started 156px to the left of the page it was under.
 *
 * Two widths, and the page says which kind of thing it is:
 *
 * - `wide` (the default, 1024px) for lists, grids and anything with a right rail.
 * - `reading` (720px) for a single column of prose or one form, where a longer
 *   line is harder to read rather than more generous.
 */
export function PageShell({
  children,
  width = "wide",
}: {
  children: ReactNode;
  width?: "wide" | "reading";
}) {
  return (
    <div
      className={`mx-auto flex w-full flex-1 flex-col px-5 py-8 md:py-12 ${
        width === "reading" ? "max-w-[45rem]" : "max-w-5xl"
      }`}
    >
      {children}

      {/*
        The footer belongs to the page, not to the shell around it.

        Rendered from the app layout it had a container of its own, always the
        wide one, so on a page using the reading width its rule started 156px
        to the left of everything it sat under and read as a misalignment
        rather than as a page-level element. In here it inherits whichever
        width the page chose, and `mt-auto` keeps it at the bottom of a short
        page instead of halfway up the window.
      */}
      <div className="mt-auto pt-12">
        <SiteFooter signedIn className="max-w-none px-0" />
      </div>
    </div>
  );
}
