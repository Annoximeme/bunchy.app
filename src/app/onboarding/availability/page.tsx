import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { OnboardingShell } from "@/components/onboarding/shell";
import { AvailabilityStep } from "@/components/onboarding/preference-steps";

export const metadata: Metadata = { title: "When you're free" };

export default async function AvailabilityPage() {
  const viewer = await requireViewer();
  const windows = await db.profileAvailability.findMany({
    where: { profileId: viewer.profileId },
    select: { window: true },
  });

  return (
    <OnboardingShell
      step="availability"
      question="When are you usually free?"
      intro="So we only suggest people and plans you could actually show up for."
    >
      <AvailabilityStep initial={windows.map((w) => w.window)} />
    </OnboardingShell>
  );
}
