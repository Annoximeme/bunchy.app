import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { OnboardingShell } from "@/components/onboarding/shell";
import { GoalsStep } from "@/components/onboarding/preference-steps";
import { getTranslations } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("onboarding.goalsTitle") };
}

export default async function GoalsPage() {
  const t = await getTranslations();
  const viewer = await requireViewer();
  const goals = await db.profileSocialGoal.findMany({
    where: { profileId: viewer.profileId },
    select: { goal: true },
  });

  return (
    <OnboardingShell
      step="goals"
      question={t("onboarding.goalsQuestion")}
      intro={t("onboarding.goalsIntro")}
    >
      <GoalsStep initial={goals.map((g) => g.goal)} />
    </OnboardingShell>
  );
}
