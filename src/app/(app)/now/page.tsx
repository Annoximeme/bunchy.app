import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/server/auth/current-user";
import { bunchyNow, type BunchyNowBoard } from "@/server/modules/discovery/bunchy-now";
import type { Horizon } from "@/server/modules/availability/service";
import type { Relaxation } from "@/server/modules/discovery/find-people";
import { PageHeader, PageShell } from "@/components/page-header";
import { Card, Chip, EmptyState, LinkButton } from "@/components/ui";
import { Avatar } from "@/components/ui";
import { NowFilters } from "@/components/now-filters";
import { WhosUp } from "@/components/whos-up";

export const metadata: Metadata = { title: "Bunchy Now" };
export const dynamic = "force-dynamic";

/** What the member was looking for, phrased for the intent parser. */
const START_QUERY: Record<Horizon | "all", string> = {
  now: "something to do right now",
  tonight: "something to do tonight",
  weekend: "something to do this weekend",
  all: "something to do with people nearby",
};

/**
 * Human names for the filters a search can drop.
 *
 * The relaxation's `constraint` is an internal key, and printing it raw put
 * "Try dropping: availableNow." on the page in front of members.
 */
const RELAXATION_LABELS: Record<Relaxation["constraint"], string> = {
  interests: "shared interests",
  time: "the time you picked",
  distance: "how close they are",
  goals: "what they are looking for",
  availableNow: "only people free now",
};

const HORIZONS: Array<{ value: Horizon | "all"; label: string }> = [
  { value: "all", label: "Anytime" },
  { value: "now", label: "Now" },
  { value: "tonight", label: "Tonight" },
  { value: "weekend", label: "Weekend" },
];

/**
 * Bunchy Now, what people are up for, right now.
 *
 * Two halves, and the difference between them is the privacy model. The counts
 * at the top are aggregates: never fewer than three people, never a name, never
 * anything finer than a city label. The cards below are individuals, and they
 * appear only because each of those members chose an audience that includes the
 * viewer, the same rule Who's Up has always applied, enforced in the query
 * rather than here.
 */
export default async function BunchyNowPage({
  searchParams,
}: {
  searchParams: Promise<{ horizon?: string; withinKm?: string; minScore?: string }>;
}) {
  const viewer = await requireViewer();
  const params = await searchParams;

  const horizon = (HORIZONS.find((h) => h.value === params.horizon)?.value ??
    "all") as Horizon | "all";

  const board = await bunchyNow(viewer.profileId, {
    horizon,
    withinKm: params.withinKm ? Number(params.withinKm) : null,
    minScore: params.minScore ? Number(params.minScore) : undefined,
  });

  const totalUp = board.clusters.reduce((sum, c) => sum + c.count, 0);

  return (
    <PageShell>
      <PageHeader
        title="Bunchy Now"
        subtitle="Who is up for something, and when. Counts are approximate and never name anyone."
      />

      {/* Your own status first: the board is a two-way thing, and it reads
          strangely to be told who is free without being asked. */}
      <div className="mb-8">
        <WhosUp
          status={
            board.mine
              ? { ...board.mine, expiresAt: board.mine.expiresAt.toISOString() }
              : null
          }
          clusters={board.clusters}
          disabled={board.hidden}
        />
      </div>

      <NowFilters horizons={HORIZONS} active={horizon} />

      {board.hidden ? (
        <EmptyState
          icon="🙈"
          title="You are hidden from Bunchy Now"
          description="Availability is switched off in your privacy settings, so you cannot see who is up and nobody can see you. Turning it back on takes one tap."
          action={<LinkButton href="/profile">Privacy settings</LinkButton>}
        />
      ) : (
        <>
          {board.clusters.length > 0 && (
            <section className="mb-10">
              <div className="flex flex-wrap gap-2.5">
                {board.clusters.map((cluster) => (
                  <Card
                    key={`${cluster.where}-${cluster.kind}`}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="text-lg font-semibold tabular-nums">
                      {cluster.count}
                    </span>
                    <span className="text-sm text-ink-soft">
                      {cluster.label.toLowerCase()}
                      <span className="block text-xs text-muted">
                        near {cluster.where}
                      </span>
                    </span>
                  </Card>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                People you could message now
              </h2>
              {board.people.people.length > 0 && (
                <Chip tone="suggested">Ranked by compatibility</Chip>
              )}
            </div>

            {board.people.people.length === 0 ? (
              <EmptyState
                icon="🌙"
                title={
                  totalUp > 0
                    ? "Nobody up right now matches these filters"
                    : "Nobody is looking for something right now"
                }
                description={
                  board.people.relaxations.length > 0
                    ? "Loosening one thing usually finds somebody. Or set your own status and let people come to you."
                    : "Set your own status so people can find you, or start something and invite whoever turns up."
                }
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    {/* The horizon travels with the member. Somebody filtering
                        "tonight" and finding nobody should land in Start with
                        "tonight" already typed, not on an empty box. */}
                    <LinkButton href={`/start?q=${encodeURIComponent(START_QUERY[horizon])}`}>
                      Start something
                    </LinkButton>
                    {board.people.relaxations.length > 0 && (
                      <LinkButton href="/now" variant="secondary">
                        Clear filters
                      </LinkButton>
                    )}
                  </div>
                }
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {board.people.people.map((person) => (
                  <NowPerson key={person.profileId} person={person} />
                ))}
              </div>
            )}

            {/* Sits with the list of people, not inside the empty state: it is
                an invitation to act on somebody you just saw. */}
            {board.people.people.length > 0 && (
              <div className="mt-8 rounded-[var(--radius-control)] border border-line bg-surface-sunken px-4 py-3.5 text-sm">
                <span className="text-ink-soft">Seen someone worth an evening? </span>
                <Link
                  href={`/start?q=${encodeURIComponent(START_QUERY[horizon])}`}
                  className="font-medium text-accent-ink underline underline-offset-2"
                >
                  Start something and invite them
                </Link>
              </div>
            )}

            {board.people.relaxations.length > 0 &&
              board.people.people.length === 0 && (
                <p className="mt-6 text-sm text-muted">
                  Try dropping:{" "}
                  {board.people.relaxations.map((r) => RELAXATION_LABELS[r.constraint]).join(", ")}.{" "}
                  <Link href="/assistant" className="text-accent-ink underline underline-offset-2">
                    Search with your own words
                  </Link>
                </p>
              )}
          </section>
        </>
      )}
    </PageShell>
  );
}

/**
 * A person on the Now board.
 *
 * Deliberately not the Discover card: what matters here is what they are up for
 * and when, so the status leads and the compatibility follows. There are no
 * actions on it either, connecting, messaging and blocking all live on the
 * profile, and duplicating them here would mean a second place to keep the
 * permission checks right.
 */
function NowPerson({
  person,
}: {
  person: BunchyNowBoard["people"]["people"][number];
}) {
  return (
    <Card className="flex items-start gap-4">
      {/*
        The avatar is `aria-hidden`, it is a decorative initial, and the name
        is a link of its own two lines down. Without a label this anchor reached
        a screen reader as a link with no text at all, which is what an axe pass
        over a populated board caught. Hidden from the accessibility tree
        entirely rather than labelled: a second link to the same profile is
        noise to someone tabbing through, and the visible one already says the
        name.
      */}
      <Link
        href={`/u/${person.username}`}
        className="shrink-0"
        aria-hidden
        tabIndex={-1}
      >
        <Avatar name={person.displayName} src={person.avatarUrl} size="lg" />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <Link
            href={`/u/${person.username}`}
            className="font-semibold tracking-tight hover:underline"
          >
            {person.displayName}
          </Link>
          <span className="text-sm font-semibold text-accent-ink tabular-nums">
            {person.score}%
          </span>
        </div>

        <p className="text-sm text-muted">
          {[person.age, person.locationLabel].filter(Boolean).join(" · ")}
        </p>

        {person.availability && (
          <p className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-teal-soft px-3 py-1 text-xs font-medium text-teal">
            <span className="size-1.5 rounded-full bg-teal" />
            {person.availability.label}
          </p>
        )}

        {person.availability?.note && (
          <p className="mt-2 text-sm text-ink-soft">
            &ldquo;{person.availability.note}&rdquo;
          </p>
        )}

        {person.highlights.length > 0 && (
          <ul className="mt-3 space-y-1">
            {person.highlights.slice(0, 2).map((highlight) => (
              <li key={highlight} className="text-sm text-ink-soft">
                {highlight}
              </li>
            ))}
          </ul>
        )}

        {person.sharedInterests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {person.sharedInterests.slice(0, 4).map((interest) => (
              <Chip key={interest}>{interest}</Chip>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}