import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/server/auth/current-user";
import { recommendPeople } from "@/server/modules/matching/engine";
import { recommendBunches } from "@/server/modules/matching/bunches";
import { recommendActivities } from "@/server/modules/matching/activities";
import { PageHeader, PageShell } from "@/components/page-header";
import { ActivityCard, BunchCard, PersonCard } from "@/components/cards";
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

  const [people, bunches, activities] = await Promise.all([
    recommendPeople(viewer.profileId, { limit: 8 }),
    recommendBunches(viewer.profileId, 6),
    recommendActivities(viewer.profileId, 6),
  ]);

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

      {nothingAtAll ? (
        <EmptyState
          icon="🌱"
          title="It's quiet here — for now"
          description="Bunchy needs a few more people nearby before it can make good introductions. Starting a bunch is the fastest way to change that, and it gives anyone who joins next somewhere to land."
          action={
            <LinkButton href="/bunches/new">Start a bunch</LinkButton>
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
