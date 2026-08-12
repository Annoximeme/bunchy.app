"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { Avatar, cn } from "@/components/ui";
import { brand } from "@/lib/brand";

/**
 * Primary navigation.
 *
 * Five destinations, no more. On mobile it is a bottom bar (thumb-reachable);
 * on desktop a left rail. Note what is missing: there is no notification
 * bell with a permanent red dot, and no counter that exists to be cleared —
 * unread badges appear only when a real person is actually waiting.
 */

const ITEMS = [
  { href: "/discover", label: "Discover", icon: CompassIcon },
  { href: "/bunches", label: "Bunches", icon: BunchesIcon },
  { href: "/activities", label: "Activities", icon: CalendarIcon },
  { href: "/messages", label: "Messages", icon: ChatIcon },
] as const;

export function AppNav({
  displayName,
  avatarUrl,
  username,
  unreadMessages,
  pendingRequests,
}: {
  displayName: string;
  avatarUrl: string | null;
  username: string;
  unreadMessages: number;
  pendingRequests: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  async function signOut() {
    setSigningOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const badgeFor = (href: string) =>
    href === "/messages" ? unreadMessages : 0;

  return (
    <>
      {/* Desktop rail */}
      <nav
        aria-label="Main"
        className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-4 py-6 md:flex"
      >
        <Link href="/discover" className="mb-8 px-2 text-xl font-semibold tracking-tight">
          {brand.name}
          <span className="text-accent">.</span>
        </Link>

        <ul className="flex-1 space-y-1">
          {ITEMS.map((item) => (
            <li key={item.href}>
              <NavLink
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
                badge={badgeFor(item.href)}
              />
            </li>
          ))}
          <li>
            <NavLink
              href="/connections"
              label="Connections"
              icon={PeopleIcon}
              active={isActive("/connections")}
              badge={pendingRequests}
            />
          </li>
        </ul>

        <div className="space-y-1 border-t border-line pt-4">
          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 transition-colors",
              isActive("/profile") ? "bg-accent-soft" : "hover:bg-surface-sunken",
            )}
          >
            <Avatar name={displayName} src={avatarUrl} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">
                {displayName}
              </span>
              <span className="block truncate text-xs text-muted">@{username}</span>
            </span>
          </Link>
          <button
            onClick={signOut}
            disabled={signingOut}
            className="w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </nav>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-sm md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex items-stretch justify-around">
          {ITEMS.map((item) => (
            <li key={item.href} className="flex-1">
              <MobileLink
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
                badge={badgeFor(item.href)}
              />
            </li>
          ))}
          <li className="flex-1">
            <MobileLink
              href="/profile"
              label="You"
              icon={PersonIcon}
              active={isActive("/profile")}
              badge={pendingRequests}
            />
          </li>
        </ul>
      </nav>
    </>
  );
}

type IconComponent = (props: { className?: string }) => React.ReactElement;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: IconComponent;
  active: boolean;
  badge: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors duration-200",
        active
          ? "bg-accent-soft text-accent-ink"
          : "text-ink-soft hover:bg-surface-sunken hover:text-ink",
      )}
    >
      <Icon className="size-5" />
      <span className="flex-1">{label}</span>
      {badge > 0 && <Badge count={badge} />}
    </Link>
  );
}

function MobileLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: IconComponent;
  active: boolean;
  badge: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
        active ? "text-accent" : "text-muted",
      )}
    >
      <span className="relative">
        <Icon className="size-6" />
        {badge > 0 && (
          <span className="absolute -right-2 -top-1">
            <Badge count={badge} />
          </span>
        )}
      </span>
      {label}
    </Link>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
      {count > 9 ? "9+" : count}
      <span className="sr-only"> unread</span>
    </span>
  );
}

// --- Icons (inline so there is no icon dependency to load) ------------------

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="m15 9-2.1 4.9L8 16l2.1-4.9L15 9Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BunchesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="15" cy="15" r="4.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 3v4M16 3v4M3.5 10h17"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 12.5c0 3.9-3.6 7-8 7a9 9 0 0 1-2.6-.4L5 20.5l1.2-3.3A6.6 6.6 0 0 1 4 12.5c0-3.9 3.6-7 8-7s8 3.1 8 7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8.5" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3.8 19a5.2 5.2 0 0 1 10.4 0M16 6.2a3.2 3.2 0 0 1 0 6M17.5 14.2a5.2 5.2 0 0 1 2.7 4.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.5 19.5a6.5 6.5 0 0 1 13 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
