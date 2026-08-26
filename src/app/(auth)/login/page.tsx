import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/current-user";
import { onboardingPath } from "@/server/modules/profile/service";
import { SignInForm } from "@/components/auth-forms";
import { brand } from "@/lib/brand";
import { getTranslations, localeHref } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("authFrame.signInTitle"),
    // Without its own, this page inherited the site description and looked
    // like a duplicate of the homepage to a crawler comparing snippets.
    description: t("authFrame.signInDescription", { brand: brand.name }),
  };
}

export default async function LoginPage() {
  const viewer = await getViewer();
  if (viewer) redirect(await localeHref(onboardingPath(viewer.onboardingStage)));
  return <SignInForm />;
}
