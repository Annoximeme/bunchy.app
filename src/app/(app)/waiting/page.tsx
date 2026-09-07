import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { waitingOnYou } from "@/server/modules/waiting/service";
import { PageHeader, PageShell } from "@/components/page-header";
import { WaitingOnYou } from "@/components/waiting";
import { EmptyState, LinkButton } from "@/components/ui";
import { PeopleIcon } from "@/components/icons";
import { getTranslations } from "@/server/i18n";

export const metadata: Metadata = { title: "Waiting on you" };
export const dynamic = "force-dynamic";

/**
 * The whole list, for the link in the digest and the one on Discover.
 *
 * An empty version of this page is a good outcome rather than a failure, so it
 * says so plainly and points at the thing worth doing instead. It is the one
 * screen in the product that is *supposed* to be empty most of the time.
 */
export default async function WaitingPage() {
  const t = await getTranslations();
  const viewer = await requireViewer();
  const items = await waitingOnYou(viewer.profileId);

  return (
    <PageShell width="reading">
      <PageHeader title={t("waiting.title")} subtitle={t("waiting.subtitle")} />

      {items.length === 0 ? (
        <EmptyState
          icon={<PeopleIcon />}
          title={t("waiting.clearTitle")}
          description={t("waiting.clearBody")}
          action={<LinkButton href="/discover">{t("waiting.clearAction")}</LinkButton>}
        />
      ) : (
        <WaitingOnYou items={items} />
      )}
    </PageShell>
  );
}
