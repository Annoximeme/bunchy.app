"use client";

import { Plus_Jakarta_Sans } from "next/font/google";
import { Avatar, cn } from "@/components/ui";
import { useTranslate } from "@/components/link";

/**
 * The head of Discover: a greeting, the faces waiting below it, and what is
 * actually on the page.
 *
 * This replaces a plain white card with a coloured hairline along its top. That
 * version solved two real problems and is kept whole here.
 *
 * **Scale.** The page opened with a greeting and a promise, then a long column
 * of blocks. Nothing said whether there were two recommendations below or
 * twenty, so the only way to find out was to scroll to the bottom, on the one
 * page whose whole design argument is that it ends.
 *
 * **Navigation.** Three sections, each a screen tall, with no way to reach the
 * third without passing the first two. The counts double as jump links, so
 * they cost no extra chrome: the thing that tells you there are four activities
 * is the thing that takes you to them.
 *
 * A count of zero is not rendered. "0 bunches" is a line of text spent telling
 * somebody about an absence, and the section it points at will not be there.
 *
 * ## What is new, and why
 *
 * **The faces.** A pile of the people this page is about to recommend, drifting
 * on the landing page's own float loop. It is decorative in the technical sense
 * (`aria-hidden`: every one of them is a named, linked card a few hundred
 * pixels below, and announcing them twice helps nobody) and load-bearing in
 * every other sense. A greeting followed by a wall of text is a page you skim;
 * five human faces at the top of it is a page you scroll. They are the real
 * recommendations rather than stock illustration, so the promise the head makes
 * is one the page immediately keeps.
 *
 * **The wash.** The app shell already lays the landing hero's two washes behind
 * every signed-in page, at a whisper. This is the same gesture at card scale
 * and at full strength, which is the one place in the product where that is
 * right: it is the first object a member sees after signing in, it is looked at
 * for a second rather than read for an hour, and everything below it stays
 * plain by contrast.
 *
 * **The type.** Plus Jakarta Sans, which is what the landing page, the About
 * page and the policies are set in. The signed-in product was the only half of
 * Bunchy still in the system stack, which is a large part of why it read as a
 * different product from the one that sold it. One heading, on the page a
 * member opens most: the font is already self-hosted and already fetched by
 * anyone who arrived through the front door.
 */
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

export interface DiscoverCounts {
  people: number;
  bunches: number;
  activities: number;
}

/** Just enough of a person to draw them. Names are for the initials fallback. */
export interface DiscoverFace {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
}

const TONES = {
  people: "bg-purple-soft text-purple-ink hover:bg-purple-soft/70",
  bunches: "bg-accent-soft text-accent-ink hover:bg-accent-soft/70",
  activities: "bg-teal-soft text-teal hover:bg-teal-soft/70",
} as const;

/** How many faces the pile holds before it starts counting instead. */
const PILE = 5;

export function DiscoverMasthead({
  firstName,
  counts,
  faces = [],
}: {
  firstName: string;
  counts: DiscoverCounts;
  faces?: DiscoverFace[];
}) {
  const t = useTranslate();
  const links = [
    counts.people > 0 && {
      href: "#people",
      tone: "people" as const,
      label: t("discover.countPeople", { count: counts.people }),
    },
    counts.bunches > 0 && {
      href: "#bunches",
      tone: "bunches" as const,
      label: t("discover.countBunches", { count: counts.bunches }),
    },
    counts.activities > 0 && {
      href: "#activities",
      tone: "activities" as const,
      label: t("discover.countActivities", { count: counts.activities }),
    },
  ].filter((link): link is Exclude<typeof link, false> => Boolean(link));

  const shown = faces.slice(0, PILE);
  const rest = faces.length - shown.length;

  return (
    <header className="relative overflow-hidden rounded-squircle bg-surface shadow-pebble">
      {/*
        Three washes rather than the shell's two, and the third is deliberately
        the mint one: coral opens the composition from the top left, purple
        carries it across, mint closes it from underneath on the right. The
        panel reads as a diagonal rather than as a stain in the middle.

        Stronger than the shell's, by a lot, and that is the point of it being
        here and only here. The shell lays the same washes behind every
        signed-in page at 7%, because those pages are read for an hour and a
        tint that survives an hour has to be a whisper. This one is looked at
        for a second on the way past, and at whisper strength it read as a white
        card somebody had smudged.

        Every stop resolves through `color-mix` against the palette tokens, so
        this inverts with the theme from one definition. Written as literals it
        would be a warm blush on cream and the same warm blush on espresso,
        which is the mistake this codebase has made twice and written a test
        about. These are grounds for a heading rather than decoration laid over
        body copy: the ink clears 9:1 on the strongest point of all three, in
        both themes.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(30rem 24rem at 4% -6%, color-mix(in oklab, var(--color-accent) 32%, transparent), transparent 66%)",
            "radial-gradient(28rem 22rem at 58% -22%, color-mix(in oklab, var(--color-purple) 26%, transparent), transparent 68%)",
            "radial-gradient(32rem 24rem at 102% 112%, color-mix(in oklab, var(--color-mint) 26%, transparent), transparent 66%)",
          ].join(", "),
        }}
      />

      {/* The signature, kept: coral into purple into mint, in that order, is
          the same run the product uses everywhere it needs to sign something. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background:
            "linear-gradient(100deg, var(--color-accent), var(--color-purple) 55%, var(--color-mint))",
        }}
      />

      <div className="relative flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="min-w-0">
          <h1
            className={cn(
              display.className,
              "text-3xl font-extrabold tracking-[-0.02em] sm:text-[2.6rem] sm:leading-[1.05]",
            )}
          >
            {t("discover.greeting", { name: firstName })}
          </h1>
          <p className="mt-3 max-w-md text-ink-soft sm:text-lg">
            {t("discover.summaryBody")}
          </p>

          {links.length > 0 && (
            <nav aria-label={t("discover.summaryLabel")} className="mt-5">
              <ul className="flex flex-wrap gap-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className={cn(
                        "inline-flex rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                        TONES[link.tone],
                      )}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>

        {shown.length > 0 && (
          <div aria-hidden className="shrink-0">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-purple-ink">
              {t("discover.matchedForYou")}
            </p>
            <div className="flex -space-x-5">
              {shown.map((face, index) => (
                /*
                  Two elements per face, and the split is load-bearing, the same
                  way it is in the landing page's cluster: `.float` animates the
                  `translate` property, so anything else that needs to translate
                  has to be a different element or the loop overwrites it. Here
                  the outer span owns the overlap and the ring, the inner one
                  drifts.

                  Each has its own duration and delay, because a row of faces
                  moving in lockstep reads as a carousel rather than as five
                  separate people.
                */
                <span
                  key={face.profileId}
                  className="inline-flex rounded-full ring-4 ring-surface"
                >
                  <span
                    className="float inline-flex rounded-full"
                    style={{
                      ["--float-distance" as string]: "5px",
                      ["--float-duration" as string]: `${5 + index * 0.45}s`,
                      ["--float-delay" as string]: `${index * 0.35}s`,
                    }}
                  >
                    <Avatar
                      name={face.displayName}
                      src={face.avatarUrl}
                      size="lg"
                    />
                  </span>
                </span>
              ))}

              {/*
                Purple, which is what marks a recommendation everywhere else in
                the product, and what the "8 people" chip two lines above is
                already wearing. In `surface-sunken` it was the one beige circle
                in a row of saturated ones, and read as an avatar that had
                failed to load rather than as a count.
              */}
              {rest > 0 && (
                <span className="inline-flex rounded-full ring-4 ring-surface">
                  <span className="flex size-16 items-center justify-center rounded-full bg-purple-soft text-sm font-bold text-purple-ink">
                    +{rest}
                  </span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
