import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/current-user";
import { onboardingPath } from "@/server/modules/profile/service";
import { SignInForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Sign in",
  // Without its own, this page inherited the site description and looked like
  // a duplicate of the homepage to a crawler comparing snippets.
  description: "Sign in to Bunchy to see your bunches, plans and messages.",
};

export default async function LoginPage() {
  const viewer = await getViewer();
  if (viewer) redirect(onboardingPath(viewer.onboardingStage));
  return <SignInForm />;
}
