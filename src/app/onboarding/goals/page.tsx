import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { OnboardingShell } from "@/components/onboarding/shell";
import { GoalsStep } from "@/components/onboarding/preference-steps";

export const metadata: Metadata = { title: "What you're looking for" };

export default async function GoalsPage() {
  const viewer = await requireViewer();
  const goals = await db.profileSocialGoal.findMany({
    where: { profileId: viewer.profileId },
    select: { goal: true },
  });

  return (
    <OnboardingShell
      step="goals"
      question="What are you hoping to find?"
      intro="Pick as many as apply. This shapes who we put in front of you more than anything else."
    >
      <GoalsStep initial={goals.map((g) => g.goal)} />
    </OnboardingShell>
  );
}
