import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { OnboardingShell } from "@/components/onboarding/shell";
import { InterestsStep } from "@/components/onboarding/interests-step";

export const metadata: Metadata = { title: "Your interests" };

export default async function InterestsPage() {
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
      question="What are you into?"
      intro="Pick a few. Add anything we're missing — plenty of people are here for something niche."
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
