import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { OnboardingShell } from "@/components/onboarding/shell";
import { PersonalityStep } from "@/components/onboarding/preference-steps";
import { getTranslations } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("onboarding.personalityTitle") };
}

export default async function PersonalityPage() {
  const t = await getTranslations();
  const viewer = await requireViewer();
  const personality = await db.personalityProfile.findUnique({
    where: { profileId: viewer.profileId },
    select: {
      introversionExtraversion: true,
      spontaneityPlanning: true,
      competitiveRelaxed: true,
      deepCasual: true,
      onlineOffline: true,
      smallLargeGroups: true,
      nightMorning: true,
    },
  });

  return (
    <OnboardingShell
      step="personality"
      question={t("onboarding.personalityQuestion")}
      intro={t("onboarding.personalityIntro")}
    >
      <PersonalityStep initial={personality} />
    </OnboardingShell>
  );
}
