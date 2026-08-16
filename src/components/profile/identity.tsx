import type { ReactNode } from "react";
import { colourFor } from "@/lib/palette";
import { Avatar, cn } from "@/components/ui";

/**
 * Who somebody is, drawn once.
 *
 * The name, the avatar, the line of facts and the badges used to exist twice —
 * copied verbatim into the public profile and the owner's profile, including a
 * paragraph of comment explaining the Staff badge that only survived in one of
 * the copies. Two renderings of one identity are two things that agree until
 * somebody edits one, and the badge nobody can see themselves is exactly the
 * one that would drift.
 *
 * ## The visual argument
 *
 * The old header was an avatar and some text on a white card, which is what
 * every page in the app already looks like. A profile is the one screen that
 * is *about a person*, so it gets the only piece of composition in the signed-in
 * product: a tinted band behind the head, coloured from that member's own
 * avatar colour. It costs nothing — no image, no request — and it makes two
 * profiles look like two different people rather than two rows of the same
 * table.
 */

export interface IdentityBadges {
  staff: boolean;
  title: string | null;
  foundingMember: boolean;
}

export function ProfileBadges({
  staff,
  title,
  foundingMember,
  className,
}: IdentityBadges & { className?: string }) {
  if (!staff && !title && !foundingMember) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {/*
        The Staff badge is the one element in the app that carries a gradient.
        That is the point: everywhere else a colour is a meaning (purple =
        inferred by the system, yellow = time), and a badge built from two brand
        colours at once belongs to no category — which is what makes it read as
        issued rather than as a label anyone could pick. It is also the only
        badge worth counterfeiting, so it should be the hardest to mistake.
      */}
      {staff && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(102deg,var(--color-accent),var(--color-purple))] px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-[0_2px_10px_-3px_var(--color-purple)] ring-1 ring-white/25">
          <span aria-hidden className="text-[0.7rem] leading-none">
            ◆
          </span>
          Staff
        </span>
      )}
      {title && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">
          <span aria-hidden>✦</span>
          {title}
        </span>
      )}
      {foundingMember && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-soft px-2.5 py-1 text-xs font-medium text-yellow-ink">
          <span aria-hidden>★</span>
          Here since the beginning
        </span>
      )}
    </div>
  );
}

export interface ProfileIdentity extends IdentityBadges {
  displayName: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  age: number | null;
  ageBand: string | null;
  locationLabel: string | null;
}

/**
 * The facts under the name.
 *
 * Built as a list and joined, rather than a chain of `&&` inside the JSX. The
 * chained version rendered a leading separator whenever the first item was
 * absent — a profile with no age and no location but a city label opened with
 * a stray middot — and it is impossible to see in the source, because every
 * line looks correct on its own.
 *
 * `age` and `ageBand` are mutually exclusive by construction: the serializer
 * emits the band precisely when the member chose to hide the exact number. Both
 * are read here so this does not silently show nothing if that ever changes.
 */
function factsFor(profile: ProfileIdentity): string[] {
  return [
    `@${profile.username}`,
    profile.age ? String(profile.age) : profile.ageBand,
    profile.locationLabel,
  ].filter((value): value is string => Boolean(value));
}

export function ProfileHero({
  profile,
  /** Replaces the avatar — the owner's page passes an upload control. */
  avatarSlot,
  /** Actions under the identity: connect, or nothing on your own page. */
  children,
}: {
  profile: ProfileIdentity;
  avatarSlot?: ReactNode;
  children?: ReactNode;
}) {
  // The same hash the avatar disc uses, so the band and the head agree.
  const tint = colourFor(profile.displayName).fill;

  return (
    <section
      className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]"
      style={{ ["--profile-tint" as string]: tint }}
    >
      {/*
        A band of the member's own colour. `colourFor` is a hash of the name, so
        this is the same colour as their avatar disc everywhere else in the
        product — a person's colour identifies them, and the header of their
        profile is the one place it should be unmistakable.

        Rendered from a CSS variable set inline rather than a Tailwind class,
        because the value is per-member and cannot be enumerated at build time.
      */}
      <div
        aria-hidden
        className="h-20 sm:h-24"
        style={{
          // `color-mix` against the surface rather than a fixed opacity: the
          // band has to stay a tint of the page in both themes, and an alpha
          // over a dark surface goes muddy rather than dark.
          background:
            "linear-gradient(160deg, color-mix(in oklab, var(--profile-tint) 34%, var(--color-surface)), var(--color-surface))",
        }}
      />

      <div className="px-5 pb-5">
        {/* Pulled up over the band, so the head sits on the seam. */}
        <div className="-mt-12 flex flex-wrap items-end gap-5 sm:-mt-14">
          <div className="rounded-full ring-4 ring-surface">
            {avatarSlot ?? (
              <Avatar
                name={profile.displayName}
                src={profile.avatarUrl}
                size="xl"
              />
            )}
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {profile.displayName}
            </h1>
            <p className="mt-0.5 text-muted">{factsFor(profile).join(" · ")}</p>
          </div>
        </div>

        <ProfileBadges
          staff={profile.staff}
          title={profile.title}
          foundingMember={profile.foundingMember}
          className="mt-4"
        />

        {profile.bio && (
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
            {profile.bio}
          </p>
        )}

        {children && <div className="mt-5">{children}</div>}
      </div>
    </section>
  );
}
