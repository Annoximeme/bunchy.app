import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/current-user";
import { onboardingPath } from "@/server/modules/profile/service";
import { SignUpForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Join" };

export default async function SignUpPage() {
  const viewer = await getViewer();
  if (viewer) redirect(onboardingPath(viewer.onboardingStage));
  return <SignUpForm />;
}
