import { cn } from "@/components/ui";

/**
 * The badge that sits beside a supporter's name.
 *
 * ## Why it is not a tick
 *
 * A verified checkmark says *this person is more real than the others*. In a
 * product whose entire argument is that four people who answer the group chat
 * beat an audience, a mark that sorts members into two castes would be working
 * against the thing it is funding.
 *
 * So it is the Bunchy mark — the same four-dot cluster in the logo, which is a
 * picture of a bunch — drawn small, in the supporter gradient. It reads as
 * *this person chipped in*, which is what it means, and it is the same shape
 * everybody already sees at the top of every page.
 *
 * ## Why it is quiet
 *
 * No motion at rest, and the gradient only brightens on hover or focus. A badge
 * that shimmers permanently in a message list is an advert running next to
 * somebody's conversation, and the person it would be advertising at is the one
 * who has not paid.
 */
export function SupporterBadge({
  className,
  size = 14,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      // A title rather than visible text: the badge appears inline beside a
      // name, and repeating "supporter" in every row of a list is noise.
      title="Supporter — chips in to keep Bunchy running"
      className={cn("group/badge inline-flex shrink-0 align-middle", className)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role="img"
        aria-label="Supporter"
        className="opacity-80 transition-opacity duration-200 group-hover/badge:opacity-100"
      >
        <defs>
          {/* The one gradient reserved for supporter UI. Coral to purple, the
              two accents that already mean "the brand" and "the clever bit". */}
          <linearGradient id="supporter-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF5C6C" />
            <stop offset="100%" stopColor="#7657FF" />
          </linearGradient>
        </defs>
        {/* Four dots in a cluster: the logo mark, which is a picture of a
            bunch. Deliberately not a tick, a crown or a star. */}
        <circle cx="8" cy="8" r="4.6" fill="url(#supporter-mark)" />
        <circle cx="16.4" cy="7.2" r="3.4" fill="url(#supporter-mark)" opacity="0.85" />
        <circle cx="7.4" cy="16.6" r="3.4" fill="url(#supporter-mark)" opacity="0.85" />
        <circle cx="15.8" cy="16" r="4.2" fill="url(#supporter-mark)" opacity="0.7" />
      </svg>
    </span>
  );
}

/**
 * The ring around a supporter's avatar.
 *
 * A wrapper rather than a prop on `Avatar`, because the avatar is drawn in a
 * dozen places and none of them should have to know that money exists. Wrapping
 * keeps the cosmetic entirely outside the component it decorates.
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
        // Sits behind and slightly outside, so the avatar itself is never
        // resized or cropped by the decoration.
        className="absolute -inset-[3px] rounded-full bg-gradient-to-r from-[#FF5C6C] to-[#7657FF]"
      />
      {/* A ring of the page's own ground between gradient and avatar, so the
          two never touch and the effect reads as a ring rather than a glow. */}
      <span className="relative inline-flex rounded-full ring-2 ring-canvas">
        {children}
      </span>
    </span>
  );
}
