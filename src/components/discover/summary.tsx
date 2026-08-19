import { cn } from "@/components/ui";

/**
 * The head of Discover: a greeting, and what is actually on the page.
 *
 * Two problems it solves at once.
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
 */

export interface DiscoverCounts {
  people: number;
  bunches: number;
  activities: number;
}

const TONES = {
  people: "bg-purple-soft text-purple-ink hover:bg-purple-soft/70",
  bunches: "bg-accent-soft text-accent-ink hover:bg-accent-soft/70",
  activities: "bg-teal-soft text-teal hover:bg-teal-soft/70",
} as const;

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function DiscoverSummary({
  firstName,
  counts,
}: {
  firstName: string;
  counts: DiscoverCounts;
}) {
  const links = [
    counts.people > 0 && {
      href: "#people",
      tone: "people" as const,
      label: plural(counts.people, "person", "people"),
    },
    counts.bunches > 0 && {
      href: "#bunches",
      tone: "bunches" as const,
      label: plural(counts.bunches, "bunch", "bunches"),
    },
    counts.activities > 0 && {
      href: "#activities",
      tone: "activities" as const,
      label: plural(counts.activities, "thing on", "things on"),
    },
  ].filter((link): link is Exclude<typeof link, false> => Boolean(link));

  return (
    <header className="mb-8 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]">
      {/*
        The same two washes the landing hero and the app shell use, at card
        scale. Discover is the page a member opens most, and it was the one
        with no head at all, plain text against the page background, which is
        what every other screen also looks like.
      */}
      <div
        aria-hidden
        className="h-1.5"
        style={{
          background:
            "linear-gradient(100deg, var(--color-accent), var(--color-purple) 60%, var(--color-teal))",
        }}
      />
      <div className="p-5 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Hey {firstName}
        </h1>
        <p className="mt-1.5 max-w-xl text-ink-soft">
          Here&rsquo;s who&rsquo;s worth meeting and what&rsquo;s happening.
          That&rsquo;s the whole page.
        </p>

        {links.length > 0 && (
          <nav aria-label="What's on this page" className="mt-4">
            <ul className="flex flex-wrap gap-2">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={cn(
                      "inline-flex rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
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
    </header>
  );
}
