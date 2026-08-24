import type { ComponentProps, ReactNode } from "react";
import { cn, Tag } from "@/components/ui";

/**
 * Dense, utilitarian building blocks for the staff surface.
 *
 * Deliberately plainer than the member UI: this is a working tool, and a
 * moderator scanning a queue needs information density and unambiguous state
 * far more than they need generous whitespace.
 */

export function AdminHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Panel({
  title,
  note,
  children,
  className,
}: {
  title?: string;
  note?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-card)] border border-line bg-surface",
        className,
      )}
    >
      {title && (
        <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {note && <span className="text-xs text-muted">{note}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * A status, as a tag.
 *
 * The geometry is `Tag`'s and no longer its own. It used to write out the same
 * pill at `font-semibold tracking-wide` where `Tag` uses `font-bold
 * tracking-wider`, which is a difference nobody chose and nobody could see
 * until the two appeared on one page, at which point it reads as a rendering
 * fault rather than as a distinction.
 *
 * The tone *map* stays here, because it is admin's vocabulary rather than the
 * product's: only the staff surfaces have states worth colouring as bad.
 */
export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, ComponentProps<typeof Tag>["tone"]> = {
    ACTIVE: "positive",
    SUSPENDED: "accent",
    BANNED: "danger",
    DEACTIVATED: "neutral",
    OPEN: "danger",
    REVIEWING: "accent",
    ACTIONED: "positive",
    DISMISSED: "neutral",
    APPROVED: "positive",
    PENDING: "accent",
    REJECTED: "danger",
    SCHEDULED: "positive",
    CANCELLED: "danger",
    COMPLETED: "neutral",
    ADMIN: "teal",
    MODERATOR: "teal",
    MEMBER: "neutral",
  };

  return (
    <Tag tone={tone[status] ?? "neutral"}>
      {status.toLowerCase().replace(/_/g, " ")}
    </Tag>
  );
}

export function DataTable({
  headers,
  children,
  empty,
  label,
}: {
  headers: string[];
  children: ReactNode;
  empty?: string;
  /**
   * What the table is, for somebody who reaches it with a keyboard or a screen
   * reader and gets told only "region".
   */
  label: string;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);

  if (!hasRows && empty) {
    return <p className="px-4 py-10 text-center text-sm text-muted">{empty}</p>;
  }

  /*
    Wide enough that the columns keep their own widths, and scrolled rather
    than squeezed.

    `w-full` on its own does not make six columns fit a phone. It makes them
    fight: the role chip was being clipped in the middle of the word MODERATOR,
    and the actions column wrapped its buttons into a stack that made every row
    three times taller than the name inside it. A table that scrolls sideways
    inside its own box is the normal answer to this, and the scroll has to be
    deliberate for the columns to keep their shape.

    Seven rem a column is a rough figure that tracks the real need better than
    one number would across a three-column table and a six-column one.
  */
  const minWidth = `${Math.max(30, headers.length * 7)}rem`;

  return (
    <div
      // Focusable, because a region that only a mouse can pan is a region a
      // keyboard user cannot read. Same treatment as the roles table on the
      // guidelines page, which had this right before the shared primitive did.
      tabIndex={0}
      role="region"
      aria-label={label}
      className="overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-line text-left">
            {headers.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Cell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3 align-top", className)}>{children}</td>;
}
