import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { PageHeader, PageShell } from "@/components/page-header";
import { SurpriseMe } from "@/components/surprise-me";

export const metadata: Metadata = { title: "Surprise me" };
export const dynamic = "force-dynamic";

/**
 * Serendipity, on its own page.
 *
 * Deliberately not a card on Discover. Discover is a ranked list and this is an
 * argument against ranked lists — putting it inside one would make it look like
 * the bottom of the same order rather than a different question.
 */
export default async function SurprisePage() {
  await requireViewer();

  return (
    <PageShell>
      <PageHeader
        title="Surprise me"
        subtitle="The opposite of a recommendation: someone whose interests do not look like yours, but whose evenings do."
      />
      <SurpriseMe />
    </PageShell>
  );
}
