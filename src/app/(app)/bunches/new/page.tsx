import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { PageHeader, PageShell } from "@/components/page-header";
import { BunchForm } from "@/components/bunch-form";

export const metadata: Metadata = { title: "Start a bunch" };

export default async function NewBunchPage() {
  const viewer = await requireViewer();
  const profile = await db.profile.findUniqueOrThrow({
    where: { id: viewer.profileId },
    select: { cityLabel: true, countryCode: true },
  });

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Start a bunch"
          subtitle="A good bunch is specific. Five people who all want the same evening beat fifty who vaguely agree."
        />
        <BunchForm
          defaultCity={profile.cityLabel}
          defaultCountry={profile.countryCode}
        />
      </div>
    </PageShell>
  );
}
