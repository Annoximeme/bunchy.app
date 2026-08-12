import type { ReactNode } from "react";
import { cn } from "@/components/ui";

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

export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    ACTIVE: "bg-positive-soft text-positive",
    SUSPENDED: "bg-accent-soft text-accent-ink",
    BANNED: "bg-danger-soft text-danger",
    DEACTIVATED: "bg-surface-sunken text-muted",
    OPEN: "bg-danger-soft text-danger",
    REVIEWING: "bg-accent-soft text-accent-ink",
    ACTIONED: "bg-positive-soft text-positive",
    DISMISSED: "bg-surface-sunken text-muted",
    APPROVED: "bg-positive-soft text-positive",
    PENDING: "bg-accent-soft text-accent-ink",
    REJECTED: "bg-danger-soft text-danger",
    SCHEDULED: "bg-positive-soft text-positive",
    CANCELLED: "bg-danger-soft text-danger",
    COMPLETED: "bg-surface-sunken text-muted",
    ADMIN: "bg-teal-soft text-teal",
    MODERATOR: "bg-teal-soft text-teal",
    MEMBER: "bg-surface-sunken text-muted",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tone[status] ?? "bg-surface-sunken text-muted",
      )}
    >
      {status.toLowerCase().replace(/_/g, " ")}
    </span>
  );
}

export function DataTable({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: ReactNode;
  empty?: string;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);

  if (!hasRows && empty) {
    return <p className="px-4 py-10 text-center text-sm text-muted">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
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
