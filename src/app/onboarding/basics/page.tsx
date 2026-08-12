import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { OnboardingShell } from "@/components/onboarding/shell";
import { BasicsStep } from "@/components/onboarding/basics-step";

export const metadata: Metadata = { title: "About you" };

export default async function BasicsPage() {
  const viewer = await requireViewer();
  const profile = await db.profile.findUniqueOrThrow({
    where: { id: viewer.profileId },
    select: {
      username: true,
      displayName: true,
      bio: true,
      cityLabel: true,
      countryCode: true,
    },
  });

  return (
    <OnboardingShell
      step="basics"
      question="First, who are you?"
      intro="Nothing here is public until you say so, and we never ask for an address."
    >
      <BasicsStep
        initial={{
          // The generated placeholder username is not worth showing back.
          username: profile.username.includes("-") ? "" : profile.username,
          displayName: profile.displayName.includes("-") ? "" : profile.displayName,
          bio: profile.bio,
          cityLabel: profile.cityLabel,
          countryCode: profile.countryCode,
        }}
      />
    </OnboardingShell>
  );
}
