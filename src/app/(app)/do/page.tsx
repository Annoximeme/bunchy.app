import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { PageHeader, PageShell } from "@/components/page-header";
import { DoSomething } from "@/components/do-something";

export const metadata: Metadata = { title: "Do something" };
export const dynamic = "force-dynamic";

export default async function DoSomethingPage() {
  await requireViewer();

  return (
    <PageShell>
      <PageHeader
        title="Do something"
        subtitle="Say what you have — money, time, energy — and get an evening back. Five taps, no typing."
      />
      <DoSomething />
    </PageShell>
  );
}
