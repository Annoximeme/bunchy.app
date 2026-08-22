"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

/**
 * The staff navigation, grouped.
 *
 * It was sixteen items in one horizontal bar with `overflow-x-auto`, which
 * meant the last five were off-screen at most widths and reachable only by
 * scrolling a strip nobody expects to scroll. Sixteen flat destinations is also
 * a list nobody reads: with no grouping, finding the audit log means checking
 * every label, because nothing tells you where it would be.
 *
 * So: a sidebar with five headings. The groups are the questions somebody
 * actually arrives with, not the order the features were built in.
 *
 *   Watch     how is it going
 *   Safety    somebody needs dealing with
 *   People    a specific person or the queue to get in
 *   Content   the things members made
 *   Operate   levers that change the product itself
 *
 * `Operate` is last and mostly admin-only on purpose: those are the controls
 * that act on everybody at once, and they should not sit next to the report
 * queue somebody works through daily.
 */

interface NavItem {
  href: string;
  label: string;
  /** Overview would otherwise match every nested route. */
  exact?: boolean;
  /**
   * Hidden from moderators. The page behind it answers 404 for them anyway,
   * this only stops the nav offering a door that will not open.
   */
  adminOnly?: boolean;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    heading: "Watch",
    items: [
      { href: "/admin", label: "Overview", exact: true },
      { href: "/admin/analytics", label: "Analytics" },
      { href: "/admin/audit", label: "Audit log" },
    ],
  },
  {
    heading: "Safety",
    items: [
      { href: "/admin/reports", label: "Reports" },
      { href: "/admin/moderators", label: "Volunteers" },
      { href: "/admin/guidelines", label: "Guidelines" },
    ],
  },
  {
    heading: "People",
    items: [
      { href: "/admin/users", label: "People" },
      { href: "/admin/waitlist", label: "Waiting list", adminOnly: true },
    ],
  },
  {
    heading: "Content",
    items: [
      { href: "/admin/bunches", label: "Bunches" },
      { href: "/admin/activities", label: "Activities" },
      { href: "/admin/formation", label: "Formation" },
      { href: "/admin/interests", label: "Interests" },
    ],
  },
  {
    heading: "Operate",
    items: [
      { href: "/admin/announcements", label: "Announcements", adminOnly: true },
      { href: "/admin/site", label: "Public site", adminOnly: true },
      { href: "/admin/discord", label: "Discord", adminOnly: true },
      { href: "/admin/brand", label: "Brand" },
    ],
  },
];

export function AdminNav({
  openReports,
  canManageAccounts,
}: {
  openReports: number;
  canManageAccounts: boolean;
}) {
  const pathname = usePathname();

  const visible = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((i) => !i.adminOnly || canManageAccounts),
  })).filter((group) => group.items.length > 0);

  return (
    <nav
      aria-label="Staff"
      className="shrink-0 border-b border-line bg-surface p-4 md:w-56 md:border-b-0 md:border-r"
    >
      {/*
        Horizontal and wrapping below `md`, a column above it. Not a scrolling
        strip in either: on a phone the groups stack their items inline and
        wrap, which is longer but never hides anything off the edge.
      */}
      <div className="flex flex-wrap gap-x-6 gap-y-4 md:block md:space-y-6">
        {visible.map((group) => (
          <div key={group.heading} className="min-w-0">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              {group.heading}
            </p>
            <ul className="flex flex-wrap gap-x-1 gap-y-0.5 md:block">
              {group.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const badge = item.href === "/admin/reports" ? openReports : 0;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center justify-between gap-2 whitespace-nowrap rounded-[var(--radius-control)] px-2.5 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-accent-soft text-accent-ink"
                          : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
                      )}
                    >
                      {item.label}
                      {badge > 0 && (
                        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[var(--color-on-accent)]">
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {!canManageAccounts && (
        <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-muted">
          You are a moderator. Account actions need an admin.
        </p>
      )}
    </nav>
  );
}
