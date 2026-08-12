import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/current-user";

export default async function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  return <main id="main">{children}</main>;
}
