import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { OnboardingShell } from "@/components/onboarding/shell";
import { InterestsStep } from "@/components/onboarding/interests-step";
import { getTranslations } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("onboarding.interestsTitle") };
}

export default async function InterestsPage() {
  const t = await getTranslations();
  const viewer = await requireViewer();
  const rows = await db.userInterest.findMany({
    where: { profileId: viewer.profileId },
    select: {
      strength: true,
      intent: true,
      interest: { select: { slug: true, label: true, isCustom: true } },
    },
  });

  return (
    <OnboardingShell
      step="interests"
      question={t("onboarding.interestsQuestion")}
      intro={t("onboarding.interestsIntro")}
    >
      <InterestsStep
        initial={rows.map((r) => ({
          slug: r.interest.slug,
          strength: r.strength,
          intent: r.intent,
          ...(r.interest.isCustom ? { custom: r.interest.label } : {}),
        }))}
      />
    </OnboardingShell>
  );
}
