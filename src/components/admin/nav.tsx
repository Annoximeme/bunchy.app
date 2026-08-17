"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

interface NavItem {
  href: string;
  label: string;
  /** Overview would otherwise match every nested route. */
  exact?: boolean;
  /**
   * Hidden from moderators. The page behind it answers 404 for them anyway —
   * this only stops the nav offering a door that will not open.
   */
  adminOnly?: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/users", label: "People" },
  { href: "/admin/bunches", label: "Bunches" },
  { href: "/admin/formation", label: "Formation" },
  { href: "/admin/activities", label: "Activities" },
  { href: "/admin/interests", label: "Interests" },
  { href: "/admin/moderators", label: "Volunteers" },
  { href: "/admin/guidelines", label: "Guidelines" },
  { href: "/admin/announcements", label: "Announcements", adminOnly: true },
  { href: "/admin/site", label: "Public site", adminOnly: true },
  { href: "/admin/waitlist", label: "Waiting list", adminOnly: true },
  { href: "/admin/brand", label: "Brand" },
  { href: "/admin/audit", label: "Audit log" },
];

export function AdminNav({
  openReports,
  canManageAccounts,
}: {
  openReports: number;
  canManageAccounts: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Staff"
      className="border-b border-line bg-surface px-5 shadow-[var(--shadow-card)]"
    >
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto">
        {ITEMS.filter((item) => !item.adminOnly || canManageAccounts).map((item) => {
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
                  "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                  active
                    ? "border-accent text-accent-ink"
                    : "border-transparent text-ink-soft hover:text-ink",
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
        {!canManageAccounts && (
          <li className="ml-auto flex items-center px-3 text-xs text-muted">
            Moderator. Account actions need an admin
          </li>
        )}
      </ul>
    </nav>
  );
}
