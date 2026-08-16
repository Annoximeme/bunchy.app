import { brand } from "@/lib/brand";
import { Card, Chip, SectionHeading, cn } from "@/components/ui";
import {
  CompatibilityRadar,
  type RadarSignal,
} from "@/components/compatibility-radar";

/**
 * What the two of you have in common.
 *
 * The public profile used to answer "who is this person?" and stop there — a
 * list of their interests, their goals, their availability, rendered exactly as
 * their own settings page renders them. Which is a directory entry. The whole
 * premise of Bunchy is that it finds overlap for you, and the one screen where
 * a member is deciding whether to reach out to somebody said nothing at all
 * about why these two were put in front of each other.
 *
 * So this is first on the page, above their details, because it is the reason
 * anyone is on the page.
 *
 * ## Two kinds of overlap, kept separate
 *
 * - **Shared** — you both already do this. The easiest conversation there is.
 * - **Complementary** — one of you practises what the other is curious about,
 *   or the two interests simply go well together. The engine scores this
 *   separately from plain overlap because the spec requires it: a photographer
 *   and somebody learning photography have more to do together than two
 *   photographers, and spending the whole interest budget on identical tags
 *   would make that pairing impossible to find.
 *
 * The complementary list is deliberately *not* split into "they can teach you"
 * and "you can teach them", even though that would read better. The engine
 * returns one undirected list of labels, and working the direction out here
 * would mean re-deriving its pairing rules — affinity across related interests,
 * not just matching slugs — in a second place that would disagree with the
 * first the moment either changed. The direction is not lost: the strongest
 * pairing's own sentence ("They could get you into film photography") comes
 * through in the highlights and in the breakdown below.
 *
 * ## On the number
 *
 * It is stated once, quietly, and always next to the breakdown that produced
 * it. A percentage on its own is something a member has to take on faith;
 * `CompatibilityRadar` already exists to show which signals actually ran and
 * what each one said, so a member can disagree with a specific part rather than
 * with a black box.
 */

export interface ProfileOverlap {
  score: number;
  highlights: string[];
  signals: RadarSignal[];
  shared: string[];
  /** Interests that reinforce each other without being the same one. */
  complementary: string[];
}

export function OverlapSection({ overlap }: { overlap: ProfileOverlap }) {
  const { score, highlights, signals, shared, complementary } = overlap;

  const hasLists = shared.length > 0 || complementary.length > 0;

  // Nothing scored and nothing overlapping is not worth a section. An empty
  // "what you have in common" panel says something louder and more discouraging
  // than saying nothing, and it is usually wrong — it means one of the two has
  // not finished onboarding, not that these people would not get on.
  if (!hasLists && highlights.length === 0) return null;

  return (
    <section>
      <SectionHeading
        eyebrow="Why you two"
        eyebrowTone="ai"
        title="What you have in common"
        subtitle={`Worked out from what you have each told ${brand.name} — not from anything either of you wrote about the other.`}
      />

      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {highlights.length > 0 ? (
            <ul className="flex min-w-0 flex-wrap gap-1.5">
              {highlights.map((highlight) => (
                <li key={highlight}>
                  <Chip tone="ai">{highlight}</Chip>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Enough overlap to be worth a look.
            </p>
          )}

          {/*
            Bigger than the Discover card's badge, because here it is the
            subject rather than a annotation on a list item — but still a
            number in a soft pill, not a trophy. There is no leaderboard
            anywhere in this product for it to feed.
          */}
          <p className="shrink-0 rounded-full bg-accent-soft px-3.5 py-1.5 text-accent-ink">
            <span className="text-lg font-bold tabular-nums">{score}%</span>{" "}
            <span className="text-sm font-medium">match</span>
          </p>
        </div>

        {hasLists && (
          <div className="grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
            {shared.length > 0 && (
              <OverlapList label="Both into" tone="teal" items={shared} />
            )}
            {complementary.length > 0 && (
              <OverlapList
                label="Worth swapping notes on"
                tone="accent"
                items={complementary}
              />
            )}
          </div>
        )}

        {signals.length > 0 && (
          <details className="group border-t border-line pt-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-accent-ink underline underline-offset-2 marker:content-['']">
              {/* Two labels, one shown at a time by the open state, so the
                  control says what it will do rather than what it did. */}
              <span className="group-open:hidden">How was this worked out?</span>
              <span className="hidden group-open:inline">Hide the breakdown</span>
            </summary>
            <div className="mt-4">
              <CompatibilityRadar signals={signals} />
            </div>
          </details>
        )}
      </Card>
    </section>
  );
}

function OverlapList({
  label,
  tone,
  items,
}: {
  label: string;
  tone: "teal" | "accent";
  items: string[];
}) {
  return (
    <div>
      <h3
        className={cn(
          "text-xs font-bold uppercase tracking-widest",
          tone === "teal" && "text-teal",
          tone === "accent" && "text-accent-ink",
        )}
      >
        {label}
      </h3>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item}>
            <Chip tone={tone}>{item}</Chip>
          </li>
        ))}
      </ul>
    </div>
  );
}
