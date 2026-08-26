import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/current-user";
import { localeHref } from "@/server/i18n";

export default async function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();
  if (!viewer) redirect(await localeHref("/login"));

  return <main id="main">{children}</main>;
}
