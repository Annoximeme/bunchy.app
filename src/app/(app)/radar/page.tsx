import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { scanRadar } from "@/server/modules/discovery/radar";
import { PageHeader, PageShell } from "@/components/page-header";
import { Radar } from "@/components/radar";
import { getTranslations } from "@/server/i18n";

export const metadata: Metadata = { title: "Radar" };
export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const t = await getTranslations();
  const viewer = await requireViewer();

  const [initial, interests] = await Promise.all([
    scanRadar(viewer.profileId),
    // The member's own interests lead the filter, because those are the ones
    // they will actually filter by. A dropdown of the whole taxonomy is a
    // scrolling exercise.
    db.userInterest.findMany({
      where: { profileId: viewer.profileId },
      select: { interest: { select: { slug: true, label: true } } },
      orderBy: { strength: "desc" },
      take: 20,
    }),
  ]);

  return (
    <PageShell>
      <PageHeader
        title={t("radar.title")}
        subtitle={t("radar.subtitle")}
      />
      {/* Dates cross the server/client boundary intact under RSC, so the
          result is passed as-is rather than round-tripped through JSON. */}
      <Radar initial={initial} interests={interests.map((i) => i.interest)} />
    </PageShell>
  );
}
