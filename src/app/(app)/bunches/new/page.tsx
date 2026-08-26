import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { PageHeader, PageShell } from "@/components/page-header";
import { BunchForm } from "@/components/bunch-form";
import { getTranslations } from "@/server/i18n";

export const metadata: Metadata = { title: "Start a bunch" };

export default async function NewBunchPage() {
  const t = await getTranslations();
  const viewer = await requireViewer();
  const profile = await db.profile.findUniqueOrThrow({
    where: { id: viewer.profileId },
    select: { cityLabel: true, countryCode: true },
  });

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title={t("bunchForm.title")}
          subtitle={t("bunchForm.subtitle")}
        />
        <BunchForm
          defaultCity={profile.cityLabel}
          defaultCountry={profile.countryCode}
        />
      </div>
    </PageShell>
  );
}
