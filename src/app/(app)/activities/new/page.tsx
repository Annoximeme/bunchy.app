import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { PageHeader, PageShell } from "@/components/page-header";
import { ActivityForm } from "@/components/activity-form";
import { getTranslations } from "@/server/i18n";

export const metadata: Metadata = { title: "Plan something" };

export default async function NewActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ bunchId?: string; title?: string; description?: string }>;
}) {
  const t = await getTranslations();
  const viewer = await requireViewer();
  const params = await searchParams;

  const [memberships, profile] = await Promise.all([
    db.bunchMembership.findMany({
      where: { profileId: viewer.profileId, status: "ACTIVE" },
      select: { bunch: { select: { id: true, name: true } } },
    }),
    db.profile.findUniqueOrThrow({
      where: { id: viewer.profileId },
      select: { cityLabel: true, countryCode: true },
    }),
  ]);

  return (
    <PageShell width="reading">
      <PageHeader
        title={t("activityForm.title")}
        subtitle={t("activityForm.subtitle")}
      />
      <ActivityForm
        bunches={memberships.map((m) => m.bunch)}
        defaultBunchId={params.bunchId}
        defaultTitle={params.title}
        defaultDescription={params.description}
        defaultCity={profile.cityLabel}
        defaultCountry={profile.countryCode}
      />
    </PageShell>
  );
}
