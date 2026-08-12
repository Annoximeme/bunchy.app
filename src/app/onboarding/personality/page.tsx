import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { OnboardingShell } from "@/components/onboarding/shell";
import { PersonalityStep } from "@/components/onboarding/preference-steps";

export const metadata: Metadata = { title: "Your style" };

export default async function PersonalityPage() {
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
      question="How do you like to spend time?"
      intro="Seven quick questions. Not a personality test — nobody sees a score, including you."
    >
      <PersonalityStep initial={personality} />
    </OnboardingShell>
  );
}
