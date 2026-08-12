import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { browseBunches, listMyBunches } from "@/server/modules/bunches/service";
import { recommendBunches } from "@/server/modules/matching/bunches";
import { PageHeader, PageShell } from "@/components/page-header";
import { BunchCard } from "@/components/cards";
import { EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { BunchSearch } from "@/components/bunch-search";

export const metadata: Metadata = { title: "Bunches" };
export const dynamic = "force-dynamic";

export default async function BunchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const viewer = await requireViewer();
  const { q } = await searchParams;

  const [mine, suggested, browse] = await Promise.all([
    listMyBunches(viewer.profileId),
    q ? Promise.resolve([]) : recommendBunches(viewer.profileId, 4),
    browseBunches(viewer.profileId, q),
  ]);

  const active = mine.filter((c) => c.membershipStatus === "ACTIVE");
  const invitations = mine.filter((c) => c.membershipStatus === "INVITED");
  const pending = mine.filter((c) => c.membershipStatus === "REQUESTED");
  const suggestedIds = new Set(mine.map((c) => c.id));

  return (
    <PageShell>
      <PageHeader
        title="Bunches"
        subtitle="Small groups, five to twelve people. Small enough that you're known."
        action={<LinkButton href="/bunches/new">Start a bunch</LinkButton>}
      />

      <div className="space-y-12">
        {invitations.length > 0 && (
          <section>
            <SectionHeading
              title="You've been invited"
              subtitle="Someone thought you'd fit."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              {invitations.map((bunch) => (
                <BunchCard key={bunch.id} bunch={bunch} />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeading title="Your bunches" />
          {active.length === 0 ? (
            <EmptyState
              icon="○"
              title="You're not in a bunch yet"
              description="A bunch is the easiest way in — you join a group that already talks to each other instead of starting from a blank conversation."
              action={<LinkButton href="/bunches/new">Start one</LinkButton>}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {active.map((bunch) => (
                <BunchCard key={bunch.id} bunch={bunch} />
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
              {pending.map((bunch) => (
                <BunchCard key={bunch.id} bunch={bunch} />
              ))}
            </div>
          </section>
        )}

        {suggested.length > 0 && (
          <section>
            <SectionHeading
              title="Bunches that fit you"
              subtitle="Based on your interests, where you are and when you're free."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              {suggested
                .filter((c) => !suggestedIds.has(c.id))
                .map((bunch) => (
                  <BunchCard key={bunch.id} bunch={bunch} />
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
            <BunchSearch initialQuery={q ?? ""} />
          </div>

          {browse.length === 0 ? (
            <EmptyState
              icon="🔍"
              title={q ? `Nothing matching "${q}"` : "No public bunches yet"}
              description={
                q
                  ? "Try a broader word, or start a bunch for it yourself."
                  : "Be the first — a bunch with one thoughtful description attracts better people than an empty search page."
              }
              action={<LinkButton href="/bunches/new">Start a bunch</LinkButton>}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {browse.map((bunch) => (
                <BunchCard key={bunch.id} bunch={bunch} />
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
