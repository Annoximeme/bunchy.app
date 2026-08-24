import Link from "next/link";
import type { ReactElement } from "react";

/**
 * The destinations a phone cannot otherwise reach.
 *
 * The bottom bar carries five things: Discover, Bunches, the compose button,
 * Activities, Messages, and You. The desktop rail carries twelve. That gap is
 * mostly deliberate and documented in `nav.tsx`, Radar and Bunchy Now are left
 * off so the remaining targets stay 67px rather than 48px, and both are reached
 * from Discover's shortcuts instead.
 *
 * Three were not deliberate, and one of them was a dead end with a light on it:
 *
 *   Notifications was linked from nowhere in the entire product except the
 *   desktop rail. On a phone the page could not be reached at all.
 *
 *   Connections was linked from one contextual notice that only appears after
 *   you have just acted on a request, so in practice, the same.
 *
 *   Meanwhile the You tab carried a badge counting exactly those two things,
 *   pending requests plus unread notifications, and pointed at `/profile`,
 *   which showed neither and linked to neither. So a member on a phone saw a
 *   red count, tapped it, landed on their own bio, and had no way to find out
 *   what it was for or to make it go away.
 *
 * This is the other half of that badge. It lives at the top of `/profile`
 * because that is where the badge already goes, and it is `md:hidden` because
 * on a wide screen every one of these is two centimetres away in the rail and
 * repeating them would be noise.
 *
 * Ask Bunchy, What's new and Support Bunchy are here for completeness, not
 * because they were broken: What's new arrives as a banner and Support Bunchy
 * is linked from the footer, but a phone had no standing route to either.
 */

export interface MobileDestination {
  href: string;
  label: string;
  /** Rendered as a count when above zero. Omit for a destination with no state. */
  badge?: number;
  icon: ReactElement;
}

export function MobileDestinations({
  destinations,
}: {
  destinations: MobileDestination[];
}) {
  return (
    <nav aria-label="More places" className="md:hidden">
      <ul className="card-surface divide-y divide-line overflow-hidden">
        {destinations.map((destination) => (
          <li key={destination.href}>
            <Link
              href={destination.href}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-sunken"
            >
              <span className="text-muted" aria-hidden>
                {destination.icon}
              </span>
              <span className="flex-1 text-sm font-medium">
                {destination.label}
              </span>
              {destination.badge !== undefined && destination.badge > 0 && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold tabular-nums text-[var(--color-on-accent)]">
                  {destination.badge > 99 ? "99+" : destination.badge}
                </span>
              )}
              <ChevronIcon />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 text-muted"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
