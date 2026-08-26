import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { OnboardingShell } from "@/components/onboarding/shell";
import { BasicsStep } from "@/components/onboarding/basics-step";
import { getTranslations } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("onboarding.basicsTitle") };
}

export default async function BasicsPage() {
  const t = await getTranslations();
  const viewer = await requireViewer();
  const profile = await db.profile.findUniqueOrThrow({
    where: { id: viewer.profileId },
    select: {
      username: true,
      displayName: true,
      bio: true,
      cityLabel: true,
      countryCode: true,
      // Loaded so the form can show what is already stored. Without this the
      // birth year came back blank every time somebody opened this page to edit
      // something else, which made it look like a field they had never filled
      // in and could not change.
      user: { select: { birthYear: true, birthMonth: true } },
    },
  });

  return (
    <OnboardingShell
      step="basics"
      question={t("onboarding.basicsQuestion")}
      intro={t("onboarding.basicsIntro")}
    >
      <BasicsStep
        initial={{
          // The generated placeholder username is not worth showing back.
          username: profile.username.includes("-") ? "" : profile.username,
          displayName: profile.displayName.includes("-") ? "" : profile.displayName,
          bio: profile.bio,
          birthYear: profile.user.birthYear,
          birthMonth: profile.user.birthMonth,
          cityLabel: profile.cityLabel,
          countryCode: profile.countryCode,
        }}
      />
    </OnboardingShell>
  );
}
