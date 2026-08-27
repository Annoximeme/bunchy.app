/**
 * The product's own icons, drawn rather than installed.
 *
 * One set, one weight, one grid: 24 by 24, a 1.7 stroke and `currentColor`, so
 * an icon takes the colour of whatever it sits in. They live here rather than
 * inside the nav because the nav is not the only place that needs them: an
 * empty state on Notifications should show the same bell as the nav item that
 * leads there, and it used to show an emoji instead.
 *
 * Emoji were the previous answer everywhere in this slot, and the trouble with
 * them is that they are somebody else's artwork: the same screen is a different
 * drawing on a Mac, a Pixel and a Windows laptop, at a weight and a palette
 * nobody here chose. Emoji stay where they are content, on interests and on the
 * example cards a member would recognise as categories.
 */

export function BoltIcon({ className }: { className?: string }) {
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

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CompassIcon({ className }: { className?: string }) {
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

export function BunchesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="15" cy="15" r="4.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function CalendarIcon({ className }: { className?: string }) {
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

export function ChatIcon({ className }: { className?: string }) {
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

export function PeopleIcon({ className }: { className?: string }) {
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

export function BellIcon({ className }: { className?: string }) {
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

export function RadarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 12 18 6.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function SparkIcon({ className }: { className?: string }) {
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

export function PlusIcon({ className }: { className?: string }) {
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

export function PersonIcon({ className }: { className?: string }) {
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

/*
  Four the nav never needed.

  An empty state has to say things the navigation never says: nobody is around
  right now, this is hidden, nothing has grown here yet, the tray is empty.
  Drawn to the same grid and the same 1.7 stroke as the rest, so a page does not
  suddenly change handwriting when it has nothing to show.
*/

export function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 14.7A8.6 8.6 0 0 1 9.3 4a8.6 8.6 0 1 0 10.7 10.7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SproutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 20v-6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M12 13.5c0-3.1 2.1-5.2 5.2-5.2 0 3.1-2.1 5.2-5.2 5.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 16c0-2.4-1.6-4-4-4 0 2.4 1.6 4 4 4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12s3.4-5.5 8-5.5c1.1 0 2.2.3 3.1.8M20 12s-1.4 2.3-3.7 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M9.9 9.9a3 3 0 0 0 4.2 4.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M4.7 4.7 19.3 19.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 13.5h4l1.4 2.4h5.2l1.4-2.4h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 13.5 6.6 5.8h10.8L20 13.5v4.2a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 17.7v-4.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
