import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { browseCircles, listMyCircles } from "@/server/modules/circles/service";
import { recommendCircles } from "@/server/modules/matching/circles";
import { PageHeader, PageShell } from "@/components/page-header";
import { CircleCard } from "@/components/cards";
import { EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { CircleSearch } from "@/components/circle-search";

export const metadata: Metadata = { title: "Circles" };
export const dynamic = "force-dynamic";

export default async function CirclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const viewer = await requireViewer();
  const { q } = await searchParams;

  const [mine, suggested, browse] = await Promise.all([
    listMyCircles(viewer.profileId),
    q ? Promise.resolve([]) : recommendCircles(viewer.profileId, 4),
    browseCircles(viewer.profileId, q),
  ]);

  const active = mine.filter((c) => c.membershipStatus === "ACTIVE");
  const invitations = mine.filter((c) => c.membershipStatus === "INVITED");
  const pending = mine.filter((c) => c.membershipStatus === "REQUESTED");
  const suggestedIds = new Set(mine.map((c) => c.id));

  return (
    <PageShell>
      <PageHeader
        title="Circles"
        subtitle="Small groups, five to twelve people. Small enough that you're known."
        action={<LinkButton href="/circles/new">Start a circle</LinkButton>}
      />

      <div className="space-y-12">
        {invitations.length > 0 && (
          <section>
            <SectionHeading
              title="You've been invited"
              subtitle="Someone thought you'd fit."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              {invitations.map((circle) => (
                <CircleCard key={circle.id} circle={circle} />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeading title="Your circles" />
          {active.length === 0 ? (
            <EmptyState
              icon="○"
              title="You're not in a circle yet"
              description="A circle is the easiest way in — you join a group that already talks to each other instead of starting from a blank conversation."
              action={<LinkButton href="/circles/new">Start one</LinkButton>}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {active.map((circle) => (
                <CircleCard key={circle.id} circle={circle} />
              ))}
            </div>
          )}
        </section>

        {pending.length > 0 && (
          <section>
            <SectionHeading
              title="Waiting on a moderator"
              subtitle="You'll hear back when someone reviews your request."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              {pending.map((circle) => (
                <CircleCard key={circle.id} circle={circle} />
              ))}
            </div>
          </section>
        )}

        {suggested.length > 0 && (
          <section>
            <SectionHeading
              title="Circles that fit you"
              subtitle="Based on your interests, where you are and when you're free."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              {suggested
                .filter((c) => !suggestedIds.has(c.id))
                .map((circle) => (
                  <CircleCard key={circle.id} circle={circle} />
                ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeading
            title="Browse"
            subtitle="Everything public, whether or not it's a match."
          />
          <div className="mb-4">
            <CircleSearch initialQuery={q ?? ""} />
          </div>

          {browse.length === 0 ? (
            <EmptyState
              icon="🔍"
              title={q ? `Nothing matching "${q}"` : "No public circles yet"}
              description={
                q
                  ? "Try a broader word, or start a circle for it yourself."
                  : "Be the first — a circle with one thoughtful description attracts better people than an empty search page."
              }
              action={<LinkButton href="/circles/new">Start a circle</LinkButton>}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {browse.map((circle) => (
                <CircleCard key={circle.id} circle={circle} />
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
