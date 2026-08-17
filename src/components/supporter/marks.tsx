import { cn } from "@/components/ui";

/**
 * The two marks that can sit beside a name, and why they are different shapes.
 *
 * A supporter chipped in. A staff member can suspend your account. Those are
 * not the same claim, and drawing them alike — or drawing either as a verified
 * tick — would make the more important one unreadable.
 *
 * So: the supporter mark is the Bunchy cluster in the supporter gradient, quiet
 * and off to the side. The staff mark is a filled shield in the same gradient,
 * which is a different silhouette at a glance and at twelve pixels. Where
 * somebody is both, the shield wins, because impersonating staff is the thing
 * worth doing and impersonating a supporter is not.
 */

/** A shared definition id per mark, so two on a page do not collide. */
function Gradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FF5C6C" />
        <stop offset="100%" stopColor="#7657FF" />
      </linearGradient>
    </defs>
  );
}

export function SupporterMark({
  className,
  size = 14,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      title="Supporter — chips in to keep Bunchy running"
      className={cn("group/mark inline-flex shrink-0 align-middle", className)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role="img"
        aria-label="Supporter"
        className="opacity-80 transition-opacity duration-200 group-hover/mark:opacity-100"
      >
        <Gradient id="mark-supporter" />
        {/* Four dots: the logo, which is a picture of a bunch. Not a tick, not
            a crown, not a star. */}
        <circle cx="8" cy="8" r="4.6" fill="url(#mark-supporter)" />
        <circle cx="16.4" cy="7.2" r="3.4" fill="url(#mark-supporter)" opacity="0.85" />
        <circle cx="7.4" cy="16.6" r="3.4" fill="url(#mark-supporter)" opacity="0.85" />
        <circle cx="15.8" cy="16" r="4.2" fill="url(#mark-supporter)" opacity="0.7" />
      </svg>
    </span>
  );
}

/**
 * Staff.
 *
 * The one mark in the product worth counterfeiting, so it is the one that has
 * to be unmistakable. Three things make it hard to fake:
 *
 * It is a shield, which no other badge here is. It carries the gradient, which
 * the palette reserves for exactly two things and which a display name cannot
 * contain. And it is rendered from the role on the server — a member cannot put
 * it beside their own name by typing it, because it is not a character.
 */
export function StaffMark({
  className,
  size = 14,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      title="Bunchy staff — verified by the platform, not chosen by the member"
      className={cn("group/mark inline-flex shrink-0 align-middle", className)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role="img"
        aria-label="Bunchy staff"
        className="transition-transform duration-200 group-hover/mark:scale-110"
      >
        <Gradient id="mark-staff" />
        <path
          d="M12 2.2 20 5.3v6.1c0 4.6-3.2 8.6-8 10.4-4.8-1.8-8-5.8-8-10.4V5.3L12 2.2Z"
          fill="url(#mark-staff)"
        />
        {/* The cluster again, knocked out of the shield: staff are still a
            bunch, and the shape ties the two marks to one family. */}
        <circle cx="9.6" cy="9.9" r="1.9" fill="#fff" opacity="0.95" />
        <circle cx="14.4" cy="9.4" r="1.4" fill="#fff" opacity="0.8" />
        <circle cx="9.2" cy="14.6" r="1.4" fill="#fff" opacity="0.8" />
        <circle cx="14.1" cy="14.2" r="1.7" fill="#fff" opacity="0.7" />
      </svg>
    </span>
  );
}

/**
 * Whichever mark applies, or nothing.
 *
 * One component so no call site has to remember that staff supersedes
 * supporter. Every name in the product goes through this.
 */
export function NameMarks({
  staff,
  supporter,
  className,
  size,
}: {
  staff?: boolean;
  supporter?: boolean;
  className?: string;
  size?: number;
}) {
  if (staff) return <StaffMark className={className} size={size} />;
  if (supporter) return <SupporterMark className={className} size={size} />;
  return null;
}

/**
 * The ring around a supporter's or staff member's avatar.
 *
 * A wrapper rather than a prop on `Avatar`, because the avatar is drawn in a
 * dozen places and none of them should have to know that money exists.
 */
export function SupporterRing({
  children,
  active,
  className,
}: {
  children: React.ReactNode;
  active: boolean;
  className?: string;
}) {
  if (!active) return <>{children}</>;

  return (
    <span className={cn("relative inline-flex rounded-full", className)}>
      <span
        aria-hidden
        // Behind and slightly outside, so the avatar is never resized or
        // cropped by the decoration.
        className="absolute -inset-[3px] rounded-full bg-gradient-to-r from-[#FF5C6C] to-[#7657FF]"
      />
      {/* A ring of the page's own ground between gradient and avatar, so the
          two never touch and it reads as a ring rather than a glow. */}
      <span className="relative inline-flex rounded-full ring-2 ring-surface">
        {children}
      </span>
    </span>
  );
}
