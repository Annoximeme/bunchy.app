"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { Avatar, cn } from "@/components/ui";
import { brand } from "@/lib/brand";
import { BunchyLogo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Primary navigation.
 *
 * Five destinations, no more. On mobile it is a bottom bar (thumb-reachable);
 * on desktop a left rail. Note what is missing: there is no notification
 * bell with a permanent red dot, and no counter that exists to be cleared —
 * unread badges appear only when a real person is actually waiting.
 *
 * "Start a bunch" sits outside that list, as an action rather than a place
 * (§15). On mobile it is the centre of the bar, which is the easiest point on
 * a phone to reach with a thumb and the right place for the one thing this
 * product most wants people to do.
 */

const ITEMS = [
  { href: "/discover", label: "Discover", icon: CompassIcon },
  { href: "/now", label: "Bunchy Now", icon: BoltIcon },
  { href: "/bunches", label: "Bunches", icon: BunchesIcon },
  { href: "/radar", label: "Radar", icon: RadarIcon },
  { href: "/activities", label: "Activities", icon: CalendarIcon },
  { href: "/messages", label: "Messages", icon: ChatIcon },
] as const;

/**
 * The mobile bar carries four destinations plus You, split either side of the
 * compose button.
 *
 * Radar and Bunchy Now are deliberately not among them. Six items plus the
 * button in 390px
 * gives ~48px targets with no breathing room, against the 67px the current
 * five get — and §16 asks for large touch targets before it asks for
 * completeness. On a phone both are reached from Discover, which carries them
 * as hero actions — prominence bought by shrinking every target on the bar is
 * not prominence worth having.
 */
const MOBILE_ITEMS = ITEMS.filter(
  (item) => item.href !== "/radar" && item.href !== "/now",
);
const MOBILE_LEFT = MOBILE_ITEMS.slice(0, 2);
const MOBILE_RIGHT = MOBILE_ITEMS.slice(2);

export function AppNav({
  displayName,
  avatarUrl,
  username,
  unreadMessages,
  pendingRequests,
  unreadNotifications,
  unreadAnnouncements,
  staff = false,
}: {
  displayName: string;
  avatarUrl: string | null;
  username: string;
  unreadMessages: number;
  pendingRequests: number;
  unreadNotifications: number;
  /** Published announcements this member has not opened. */
  unreadAnnouncements: number;
  /** Renders the staff entry. The link is cosmetic — /admin guards itself. */
  staff?: boolean;
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
        <Link href="/discover" className="mb-6 px-2" aria-label={brand.name}>
          <BunchyLogo height={20} color="var(--color-ink)" />
        </Link>

        <Link
          href="/start"
          className="mb-5 flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 py-2.5 text-sm font-semibold text-[var(--color-on-accent)] shadow-[0_1px_2px_rgb(23_32_51/0.08)] transition-shadow hover:shadow-[0_6px_18px_-6px_var(--color-accent)]"
        >
          <PlusIcon className="size-4" />
          Start a bunch
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
              href="/assistant"
              label="Bunchy AI"
              icon={SparkIcon}
              active={isActive("/assistant")}
              badge={0}
            />
          </li>
          <li>
            <NavLink
              href="/connections"
              label="Connections"
              icon={PeopleIcon}
              active={isActive("/connections")}
              badge={pendingRequests}
            />
          </li>
          <li>
            <NavLink
              href="/notifications"
              label="Notifications"
              icon={BellIcon}
              active={isActive("/notifications")}
              badge={unreadNotifications}
            />
          </li>
        </ul>

        <div className="space-y-1 border-t border-line pt-4">
          {/* Below the line with the staff link and the profile, not up among
              the seven ways to meet people. It is a record to consult, not a
              thing to do — the important ones arrive as a banner rather than
              waiting here to be found. */}
          <Link
            href="/whats-new"
            className="mb-1 flex items-center justify-between gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken"
          >
            What&rsquo;s new
            {unreadAnnouncements > 0 && (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-[var(--color-on-accent)]">
                {unreadAnnouncements}
              </span>
            )}
          </Link>
          {staff && (
            <Link
              href="/admin"
              className="mb-1 block rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-teal transition-colors hover:bg-surface-sunken"
            >
              Staff area
            </Link>
          )}
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
          <div className="flex items-center justify-between gap-2 pr-1">
            <button
              onClick={signOut}
              disabled={signingOut}
              className="flex-1 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-60"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
            {/* Beside sign out rather than in the list above: it is a setting,
                not a destination. */}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-sm md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex items-stretch justify-around">
          {MOBILE_LEFT.map((item) => (
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

          {/* The centre of the bar: the easiest point on a phone to reach. */}
          <li className="flex shrink-0 items-center px-1">
            <Link
              href="/start"
              aria-label="Start a bunch"
              aria-current={isActive("/start") ? "page" : undefined}
              className="flex size-12 items-center justify-center rounded-full bg-accent text-[var(--color-on-accent)] shadow-[0_4px_14px_-4px_var(--color-accent)]"
            >
              <PlusIcon className="size-6" />
            </Link>
          </li>

          {MOBILE_RIGHT.map((item) => (
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
              badge={pendingRequests + unreadNotifications}
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
        active ? "text-accent-ink" : "text-muted",
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
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[var(--color-on-accent)]">
      {count > 9 ? "9+" : count}
      <span className="sr-only"> unread</span>
    </span>
  );
}

// --- Icons (inline so there is no icon dependency to load) ------------------

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
    </svg>
  );
}

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

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 9a6 6 0 1 0-12 0c0 4-1.5 5.5-1.5 5.5h15S18 13 18 9Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10.3 18a2 2 0 0 0 3.4 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RadarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 12 18 6.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4.5 13.6 9l4.4 1.6-4.4 1.6L12 16.5l-1.6-4.3L6 10.6 10.4 9 12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M18 16.5 18.7 18.4 20.5 19 18.7 19.6 18 21.5 17.3 19.6 15.5 19 17.3 18.4 18 16.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.2"
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
