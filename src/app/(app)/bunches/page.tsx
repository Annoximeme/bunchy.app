import { BunchesIcon, SearchIcon } from "@/components/icons";
import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { browseBunches, listMyBunches } from "@/server/modules/bunches/service";
import { recommendBunches } from "@/server/modules/matching/bunches";
import { PageHeader, PageShell } from "@/components/page-header";
import { BunchCard } from "@/components/cards";
import { EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { BunchSearch } from "@/components/bunch-search";
import { getTranslations } from "@/server/i18n";

export const metadata: Metadata = { title: "Bunches" };
export const dynamic = "force-dynamic";

export default async function BunchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const t = await getTranslations();
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
        title={t("bunches.title")}
        subtitle={t("bunches.subtitle")}
        action={<LinkButton href="/bunches/new">{t("bunches.start")}</LinkButton>}
      />

      <div className="space-y-12">
        {invitations.length > 0 && (
          <section>
            <SectionHeading
              title={t("bunches.invited")}
              subtitle={t("bunches.invitedSubtitle")}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {invitations.map((bunch) => (
                <BunchCard key={bunch.id} bunch={bunch} />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeading title={t("bunches.yours")} />
          {active.length === 0 ? (
            <EmptyState
              icon={<BunchesIcon />}
              title={t("bunches.noneTitle")}
              description="A bunch is the easiest way in. You join a group that already talks to each other instead of starting from a blank conversation."
              action={<LinkButton href="/bunches/new">{t("bunches.startOne")}</LinkButton>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {active.map((bunch) => (
                <BunchCard key={bunch.id} bunch={bunch} />
              ))}
            </div>
          )}
        </section>

        {pending.length > 0 && (
          <section>
            <SectionHeading
              title={t("bunches.waiting")}
              subtitle={t("bunches.waitingSubtitle")}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {pending.map((bunch) => (
                <BunchCard key={bunch.id} bunch={bunch} />
              ))}
            </div>
          </section>
        )}

        {suggested.length > 0 && (
          <section>
            <SectionHeading
              title={t("bunches.fitTitle")}
              subtitle={t("bunches.fitSubtitle")}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
            title={t("bunches.browse")}
            subtitle={t("bunches.browseSubtitle")}
          />
          <div className="mb-4">
            <BunchSearch initialQuery={q ?? ""} />
          </div>

          {browse.length === 0 ? (
            <EmptyState
              icon={<SearchIcon />}
              title={q ? t("bunches.nothingMatching", { query: q }) : t("bunches.quiet")}
              description={
                q
                  ? t("bunches.broaderWord")
                  : "Be the first to start a bunch. One with a thoughtful description attracts better people than an empty search page ever will."
              }
              action={<LinkButton href="/bunches/new">{t("bunches.start")}</LinkButton>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
