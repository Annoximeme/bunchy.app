import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { PageHeader, PageShell } from "@/components/page-header";
import { ActivityForm } from "@/components/activity-form";

export const metadata: Metadata = { title: "Plan something" };

export default async function NewActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ bunchId?: string; title?: string; description?: string }>;
}) {
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
    <PageShell>
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Plan something"
          subtitle="Small and soon beats ambitious and someday."
        />
        <ActivityForm
          bunches={memberships.map((m) => m.bunch)}
          defaultBunchId={params.bunchId}
          defaultTitle={params.title}
          defaultDescription={params.description}
          defaultCity={profile.cityLabel}
          defaultCountry={profile.countryCode}
        />
      </div>
    </PageShell>
  );
}
