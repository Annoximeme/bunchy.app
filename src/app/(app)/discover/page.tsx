import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/server/auth/current-user";
import { recommendPeople } from "@/server/modules/matching/engine";
import { recommendBunches } from "@/server/modules/matching/bunches";
import { recommendActivities } from "@/server/modules/matching/activities";
import {
  availabilityClusters,
  availabilityDisabled,
  myAvailability,
} from "@/server/modules/availability/service";
import { nextIntroduction } from "@/server/modules/discovery/introductions";
import { neighbourhoodFor } from "@/server/modules/discovery/neighbourhood";
import { pendingOutcome } from "@/server/modules/activities/outcomes";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";
import { PageShell } from "@/components/page-header";
import { ActivityCard, BunchCard, PersonCard } from "@/components/cards";
import { IntroductionCard } from "@/components/introduction-card";
import { WhosUp } from "@/components/whos-up";
import { OutcomePrompt } from "@/components/outcome-prompt";
import { DiscoverSummary } from "@/components/discover/summary";
import { DiscoverShortcuts } from "@/components/discover/shortcuts";
import { EmptyState, LinkButton, SectionHeading } from "@/components/ui";

export const metadata: Metadata = { title: "Discover" };

// Recommendations depend on who is signed in, so this can never be static.
export const dynamic = "force-dynamic";

/**
 * Discover — the heart of the product.
 *
 * It answers exactly two questions: who should I meet, and what should I do.
 * Note the ending: once the suggestions run out, the page says so and stops.
 * There is no pagination, no "you might also like", nothing to keep scrolling
 * for. A good session here ends with the tab closed.
 *
 * ## The order, and why it changed
 *
 * The page used to put up to five blocks of chrome — a verification banner, an
 * introduction, four unexplained shortcut pills, an outcome prompt and the
 * availability panel — above the first recommendation. The page promises "this
 * is the whole page" in its own subtitle, and then the whole page started
 * halfway down it.
 *
 * What is here now is ordered by what a member actually opens this for:
 *
 * 1. **What is on the page** — the head, with counts that jump to each section.
 * 2. **Anything owed** — confirm your email, how did Thursday go. Short, and
 *    genuinely unfinished business rather than an interruption.
 * 3. **The introduction** — one person, chosen deliberately. The highest-value
 *    thing on the page when it exists, and it usually does not.
 * 4. **Who is around now** — time-critical, and worthless an hour later.
 * 5. **The recommendations** — the reason for the page.
 * 6. **The other ways in** — the shortcuts, at the point where "none of these
 *    appeal" becomes true.
 */
export default async function DiscoverPage() {
  const viewer = await requireViewer();

  /*
    One batch, not four.

    `neighbourhood`, `outcome` and `introduction` used to be three sequential
    awaits after this — each waiting for the one before it for no reason, on
    the heaviest page in the product. They do not depend on each other or on
    anything above, so they belong in the same round trip.
  */
  const [
    people,
    bunches,
    activities,
    status,
    clusters,
    whosUpOff,
    neighbourhood,
    outcome,
    introduction,
  ] = await Promise.all([
    recommendPeople(viewer.profileId, { limit: 8 }),
    recommendBunches(viewer.profileId, 6),
    recommendActivities(viewer.profileId, 6),
    myAvailability(viewer.profileId),
    availabilityClusters(viewer.profileId),
    availabilityDisabled(viewer.profileId),
    // Only needed when there is nothing to show, but it is one indexed count
    // and fetching it here keeps the empty branch synchronous.
    neighbourhoodFor(viewer.profileId),
    // Asked here rather than in a modal or an email: this is the page someone
    // opens anyway, and the question is about the last time they used the
    // product rather than an interruption to this time.
    pendingOutcome(viewer.profileId),
    // Computed here rather than behind an endpoint: an introduction reuses the
    // recommendations this page already loaded, and a route that hands them
    // out on request is a route somebody polls for a fresh one.
    nextIntroduction(viewer.profileId),
  ]);

  if (introduction) {
    track({
      name: ANALYTICS_EVENTS.INTRODUCTION_OFFERED,
      profileId: viewer.profileId,
      properties: { score: introduction.score },
    });
  }

  const nothingAtAll =
    people.length === 0 && bunches.length === 0 && activities.length === 0;

  return (
    <PageShell>
      <DiscoverSummary
        firstName={viewer.displayName.split(" ")[0] ?? viewer.displayName}
        counts={{
          people: people.length,
          bunches: bunches.length,
          activities: activities.length,
        }}
      />

      {/*
        Unfinished business, as a line rather than a card. Both of these are
        asks, and an ask that takes as much room as a recommendation reads as
        being as important as one.
      */}
      {!viewer.emailVerified && (
        <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius-control)] border border-yellow/40 bg-yellow-soft px-4 py-3 text-sm">
          <span className="text-yellow-ink">
            Confirm your email so you don&rsquo;t lose access to your account.
          </span>
          <Link
            href="/profile"
            className="font-semibold text-yellow-ink underline underline-offset-2"
          >
            Resend the link
          </Link>
        </div>
      )}

      {outcome && (
        <div className="mb-6">
          <OutcomePrompt prompt={outcome} />
        </div>
      )}

      {introduction && (
        <div className="mb-8">
          <IntroductionCard intro={introduction} />
        </div>
      )}

      <div className="mb-10">
        <WhosUp
          status={
            status
              ? { ...status, expiresAt: status.expiresAt.toISOString() }
              : null
          }
          clusters={clusters}
          disabled={whosUpOff}
        />
      </div>

      {nothingAtAll ? (
        <>
          <EmptyState
            icon="🌱"
            title={
              neighbourhood.label
                ? `You're one of ${neighbourhood.count} near ${neighbourhood.label}`
                : "It's quiet here, for now"
            }
            /*
              A count and a target, rather than an apology. The emptiness is the
              same either way; this version says what has to happen and who can
              make it happen, which is the only honest ask when a matching
              product has not reached the density its introductions depend on.
            */
            description={
              neighbourhood.label
                ? `Bunches tend to hold together from about ${neighbourhood.target} people nearby, so introductions stay thin until then. Inviting one person moves this more than anything else on the page. And starting a bunch gives whoever joins next somewhere to land.`
                : "Bunchy needs a few more people nearby before it can make good introductions. Starting a bunch is the fastest way to change that, and it gives anyone who joins next somewhere to land."
            }
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <LinkButton href="/start">Start a bunch</LinkButton>
                <LinkButton href="/profile#invite" variant="secondary">
                  Get my invite link
                </LinkButton>
              </div>
            }
          />

          {/*
            The shortcuts matter *more* when there is nothing to recommend, not
            less: an empty Discover is exactly when somebody needs another way
            in. They were previously above the empty state, where they read as
            navigation; here they read as the answer to it.
          */}
          <section className="mt-10">
            <SectionHeading
              title="Other ways to find something"
              subtitle="None of these need anyone to have matched you first."
            />
            <DiscoverShortcuts />
          </section>
        </>
      ) : (
        <div className="space-y-12">
          {people.length > 0 && (
            /* scroll-mt clears the sticky top bar when jumped to from the head. */
            <section id="people" className="scroll-mt-20">
              <SectionHeading
                eyebrow="Matched for you"
                eyebrowTone="ai"
                title="People you might connect with"
                subtitle="Ranked on interests, goals, availability and how you like to spend time."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                {people.map((person) => (
                  <PersonCard
                    key={person.profileId}
                    person={{
                      profileId: person.profileId,
                      username: person.username,
                      displayName: person.displayName,
                      avatarUrl: person.avatarUrl,
                      bio: person.bio,
                      age: person.age,
                      locationLabel: person.locationLabel,
                      score: person.score,
                      highlights: person.highlights,
                      sharedInterests: person.sharedInterests,
                      goals: person.goals,
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {bunches.length > 0 && (
            <section id="bunches" className="scroll-mt-20">
              <SectionHeading
                eyebrow="Groups"
                eyebrowTone="accent"
                title="Bunches for you"
                subtitle="Small groups with room for one more."
                action={
                  <LinkButton href="/bunches" variant="ghost" size="sm">
                    Browse all
                  </LinkButton>
                }
              />
              <div className="grid gap-4 lg:grid-cols-2">
                {bunches.map((bunch) => (
                  <BunchCard key={bunch.id} bunch={bunch} />
                ))}
              </div>
            </section>
          )}

          {activities.length > 0 && (
            <section id="activities" className="scroll-mt-20">
              <SectionHeading
                eyebrow="Activities"
                eyebrowTone="teal"
                title="Things happening"
                subtitle="Somewhere to actually turn up."
                action={
                  <LinkButton href="/activities" variant="ghost" size="sm">
                    See all
                  </LinkButton>
                }
              />
              <div className="space-y-3">
                {activities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={{
                      id: activity.id,
                      title: activity.title,
                      startsAt: activity.startsAt.toISOString(),
                      mode: activity.mode,
                      locationLabel: activity.locationLabel,
                      cityLabel: activity.cityLabel,
                      participantCount: activity.participantCount,
                      maxParticipants: activity.maxParticipants,
                      bunch: activity.bunch,
                      highlights: activity.highlights,
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHeading
              title="Not what you're after?"
              subtitle="Other ways in, none of which need anyone to have matched you first."
            />
            <DiscoverShortcuts />
          </section>

          <section className="border-t border-line pt-10 text-center">
            <p className="text-lg font-medium tracking-tight">
              That&rsquo;s everything worth showing you today.
            </p>
            <p className="mt-1.5 text-sm text-muted">
              You&rsquo;ve found your bunch. Go talk to them.
            </p>
          </section>
        </div>
      )}
    </PageShell>
  );
}
