import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { PageHeader, PageShell } from "@/components/page-header";
import { CircleForm } from "@/components/circle-form";

export const metadata: Metadata = { title: "Start a circle" };

export default async function NewCirclePage() {
  const viewer = await requireViewer();
  const profile = await db.profile.findUniqueOrThrow({
    where: { id: viewer.profileId },
    select: { cityLabel: true, countryCode: true },
  });

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Start a circle"
          subtitle="A good circle is specific. Five people who all want the same evening beat fifty who vaguely agree."
        />
        <CircleForm
          defaultCity={profile.cityLabel}
          defaultCountry={profile.countryCode}
        />
      </div>
    </PageShell>
  );
}
