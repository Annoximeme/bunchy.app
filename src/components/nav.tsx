"use client";

import { Link, useAppPath, useLocaleRouter } from "@/components/link";

import { useState } from "react";
import { api } from "@/lib/api";
import { Avatar, cn } from "@/components/ui";
import { brand } from "@/lib/brand";
import { BunchyLogo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { phrase } from "@/lib/i18n/phrase";
import { useTranslate } from "@/components/link";
import {
  BoltIcon,
  SearchIcon,
  CompassIcon,
  BunchesIcon,
  CalendarIcon,
  ChatIcon,
  PeopleIcon,
  BellIcon,
  RadarIcon,
  SparkIcon,
  PlusIcon,
  PersonIcon,
} from "@/components/icons";

/**
 * Primary navigation.
 *
 * Five destinations, no more. On mobile it is a bottom bar (thumb-reachable);
 * on desktop a left rail. Note what is missing: there is no notification
 * bell with a permanent red dot, and no counter that exists to be cleared,
 * unread badges appear only when a real person is actually waiting.
 *
 * "Start a bunch" sits outside that list, as an action rather than a place
 * (§15). On mobile it is the centre of the bar, which is the easiest point on
 * a phone to reach with a thumb and the right place for the one thing this
 * product most wants people to do.
 */

/**
 * The labels are phrase paths rather than words, resolved at render.
 *
 * This list is defined once at module scope and the language is only known
 * inside the component, so what is stored here is where to find the word
 * rather than the word itself.
 */
const ITEMS = [
  { href: "/discover", label: phrase("nav.discover"), icon: CompassIcon },
  { href: "/search", label: phrase("nav.search"), icon: SearchIcon },
  { href: "/now", label: phrase("nav.now"), icon: BoltIcon },
  { href: "/bunches", label: phrase("nav.bunches"), icon: BunchesIcon },
  { href: "/radar", label: phrase("nav.radar"), icon: RadarIcon },
  { href: "/activities", label: phrase("nav.activities"), icon: CalendarIcon },
  { href: "/messages", label: phrase("nav.messages"), icon: ChatIcon },
] as const;

/**
 * The mobile bar carries four destinations plus You, split either side of the
 * compose button.
 *
 * Radar and Bunchy Now are deliberately not among them. Six items plus the
 * button in 390px
 * gives ~48px targets with no breathing room, against the 67px the current
 * five get, and §16 asks for large touch targets before it asks for
 * completeness. On a phone both are reached from Discover, which carries them
 * as hero actions, prominence bought by shrinking every target on the bar is
 * not prominence worth having.
 */
const MOBILE_ITEMS = ITEMS.filter(
  (item) =>
    item.href !== "/radar" &&
    item.href !== "/now" &&
    // Search is reached from the You tab's list rather than the bar, for the
    // same reason as those two: a sixth destination takes every target below
    // the size a thumb can hit reliably.
    item.href !== "/search",
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
  /** Renders the staff entry. The link is cosmetic, /admin guards itself. */
  staff?: boolean;
}) {
  const pathname = useAppPath();
  const router = useLocaleRouter();
  const t = useTranslate();
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
        aria-label={t("nav.main")}
        className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-4 py-6 md:flex"
      >
        <Link href="/discover" className="mb-6 px-2" aria-label={brand.name}>
          <BunchyLogo height={20} color="var(--color-ink)" />
        </Link>

        <Link
          href="/start"
          className="mb-5 flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 py-2.5 text-sm font-semibold text-[var(--color-on-accent)] shadow-[0_1px_2px_rgb(39_31_22/0.08)] transition-shadow hover:shadow-[0_6px_18px_-6px_var(--color-accent)]"
        >
          <PlusIcon className="size-4" />
          {t("nav.startBunch")}
        </Link>

        <ul className="flex-1 space-y-1">
          {ITEMS.map((item) => (
            <li key={item.href}>
              <NavLink
                href={item.href}
                label={t(item.label)}
                icon={item.icon}
                active={isActive(item.href)}
                badge={badgeFor(item.href)}
              />
            </li>
          ))}
          <li>
            <NavLink
              href="/assistant"
              label={t("nav.assistant")}
              icon={SparkIcon}
              active={isActive("/assistant")}
              badge={0}
            />
          </li>
          <li>
            <NavLink
              href="/connections"
              label={t("nav.connections")}
              icon={PeopleIcon}
              active={isActive("/connections")}
              badge={pendingRequests}
            />
          </li>
          <li>
            <NavLink
              href="/notifications"
              label={t("nav.notifications")}
              icon={BellIcon}
              active={isActive("/notifications")}
              badge={unreadNotifications}
            />
          </li>
        </ul>

        <div className="space-y-1 border-t border-line pt-4">
          {/* Below the line with the staff link and the profile, not up among
              the seven ways to meet people. It is a record to consult, not a
              thing to do, the important ones arrive as a banner rather than
              waiting here to be found. */}
          <Link
            href="/supporter"
            className="mb-1 block rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken"
          >
            {t("nav.support")}
          </Link>
          <Link
            href="/whats-new"
            className="mb-1 flex items-center justify-between gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken"
          >
            {t("nav.whatsNew")}
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
              {t("nav.staffArea")}
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
              {signingOut ? t("nav.signingOut") : t("nav.signOut")}
            </button>
            {/* Beside sign out rather than in the list above: it is a setting,
                not a destination. */}
            <ThemeToggle />
          </div>
          {/* Under both, and spelled out rather than abbreviated. Somebody
              looking for this is by definition reading a language they would
              rather not, so the one control that helps them says "Nederlands"
              in Dutch rather than a two-letter code they have to decode. */}
          <LanguageSwitcher className="mt-1 justify-start px-1" />
        </div>
      </nav>

      {/* Mobile bottom bar */}
      <nav
        aria-label={t("nav.main")}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-sm md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex items-stretch justify-around">
          {MOBILE_LEFT.map((item) => (
            <li key={item.href} className="flex-1">
              <MobileLink
                href={item.href}
                label={t(item.label)}
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
              aria-label={t("nav.startBunch")}
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
                label={t(item.label)}
                icon={item.icon}
                active={isActive(item.href)}
                badge={badgeFor(item.href)}
              />
            </li>
          ))}
          <li className="flex-1">
            <MobileLink
              href="/profile"
              label={t("nav.you")}
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
