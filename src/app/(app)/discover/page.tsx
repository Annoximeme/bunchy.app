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
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";
import { PageHeader, PageShell } from "@/components/page-header";
import { ActivityCard, BunchCard, PersonCard } from "@/components/cards";
import { IntroductionCard } from "@/components/introduction-card";
import { WhosUp } from "@/components/whos-up";
import { Chip, EmptyState, LinkButton, SectionHeading } from "@/components/ui";

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
 */
export default async function DiscoverPage() {
  const viewer = await requireViewer();

  const [people, bunches, activities, status, clusters, whosUpOff] =
    await Promise.all([
      recommendPeople(viewer.profileId, { limit: 8 }),
      recommendBunches(viewer.profileId, 6),
      recommendActivities(viewer.profileId, 6),
      myAvailability(viewer.profileId),
      availabilityClusters(viewer.profileId),
      availabilityDisabled(viewer.profileId),
    ]);

  // Only needed when there is nothing to show, but fetching it here keeps the
  // empty branch synchronous and costs one indexed count.
  const neighbourhood = await neighbourhoodFor(viewer.profileId);

  // Computed here rather than behind an endpoint: an introduction reuses the
  // recommendations this page already loaded, and a route that hands them out
  // on request is a route somebody polls for a fresh one.
  const introduction = await nextIntroduction(viewer.profileId);
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
      <PageHeader
        title={`Hey ${viewer.displayName.split(" ")[0]}`}
        subtitle="Here's who's worth meeting and what's happening. That's the whole page."
      />

      {!viewer.emailVerified && (
        <div className="mb-8 rounded-[var(--radius-control)] border border-line bg-surface-sunken px-4 py-3 text-sm">
          <span className="text-ink-soft">
            Confirm your email so you don&rsquo;t lose access to your account.
          </span>{" "}
          <Link href="/profile" className="font-medium text-accent-ink hover:underline">
            Resend the link
          </Link>
        </div>
      )}

      {introduction && (
        <div className="mb-8">
          <IntroductionCard intro={introduction} />
        </div>
      )}

      <div className="mb-4 md:hidden">
        <LinkButton href="/radar" variant="secondary" size="sm">
          Open the radar
        </LinkButton>
      </div>

      <div className="mb-8">
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
        <EmptyState
          icon="🌱"
          title={
            neighbourhood.label
              ? `You're one of ${neighbourhood.count} near ${neighbourhood.label}`
              : "It's quiet here — for now"
          }
          /*
            A count and a target, rather than an apology. The emptiness is the
            same either way; this version says what has to happen and who can
            make it happen, which is the only honest ask when a matching product
            has not reached the density its introductions depend on.
          */
          description={
            neighbourhood.label
              ? `Bunches tend to hold together from about ${neighbourhood.target} people nearby, so introductions stay thin until then. Inviting one person moves this more than anything else on the page — and starting a bunch gives whoever joins next somewhere to land.`
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
      ) : (
        <div className="space-y-12">
          {people.length > 0 && (
            <section>
              <SectionHeading
                title="People you might connect with"
                subtitle="Ranked on interests, goals, availability and how you like to spend time."
                action={<Chip tone="ai">Matched for you</Chip>}
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
            <section>
              <SectionHeading
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
            <section>
              <SectionHeading
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
