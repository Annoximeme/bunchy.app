import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { PageHeader, PageShell } from "@/components/page-header";
import { Assistant } from "@/components/assistant";

export const metadata: Metadata = { title: "Bunchy AI" };

/**
 * The concierge.
 *
 * `?q=` is honoured so the answer's own suggestions can link back into a fresh
 * question, and so a link shared between screens carries the request with it.
 */
export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireViewer();
  const { q } = await searchParams;

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Bunchy AI"
          subtitle="Ask about people, bunches, activities or your own recommendations."
        />
        <Assistant initialQuery={q?.slice(0, 280) ?? ""} />
      </div>
    </PageShell>
  );
}
