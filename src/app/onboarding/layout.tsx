import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/current-user";
import { currentLocale, localeHref } from "@/server/i18n";
import { rememberLocale } from "@/server/modules/profile/service";

export default async function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();
  if (!viewer) redirect(await localeHref("/login"));

  // What to write emails in later. Only touches the database when the answer
  // has changed, which is almost never.
  const locale = await currentLocale();
  if (viewer.locale !== locale) await rememberLocale(viewer.profileId, locale);

  return <main id="main">{children}</main>;
}
