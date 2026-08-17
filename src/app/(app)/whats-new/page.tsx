import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/server/auth/current-user";
import {
  listAnnouncements,
  unreadCount,
} from "@/server/modules/announcements/service";
import { PageHeader, PageShell } from "@/components/page-header";
import { EmptyState } from "@/components/ui";
import { AnnouncementList } from "@/components/announcements/announcement-list";

export const metadata: Metadata = { title: "What's new" };
export const dynamic = "force-dynamic";

/**
 * The permanent record of everything the operator has told members.
 *
 * The archive half of the promise in Privacy §14 and Terms §14. The banner is
 * how notice is *given*; this is how it stays checkable afterwards — a member
 * who wants to know when something changed, or whether they were told, has one
 * page to look at rather than a support email to write.
 *
 * Nothing is ever deleted from here. Withdrawing an announcement unpublishes it
 * and leaves the audit trail intact, so the record of what was said and when
 * survives changing our minds about saying it.
 */
export default async function WhatsNewPage() {
  const viewer = await requireViewer();
  const [announcements, unread] = await Promise.all([
    listAnnouncements(viewer.profileId),
    unreadCount(viewer.profileId),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="What's new"
        subtitle="Everything we have told you, and when. Changes that affect your rights or your data appear here before they take effect."
      />

      {announcements.length > 0 && (
        <p className="mt-6 text-sm text-muted">
          {unread === 0
            ? "You have read all of these."
            : `${unread} you have not read yet.`}{" "}
          Nothing is ever removed from this page — withdrawing an announcement
          takes it off the board and leaves the record alone.
        </p>
      )}

      {announcements.length === 0 ? (
        <EmptyState
          level={2}
          icon="📭"
          title="Nothing to report"
          description="When something changes that affects you — what we hold, what the terms say, whether the site is up — it lands here, and the important ones find you rather than waiting to be found."
        />
      ) : (
        <AnnouncementList announcements={announcements} />
      )}

      <p className="mt-10 text-sm text-muted">
        The documents themselves:{" "}
        <Link href="/privacy" className="text-accent-ink underline underline-offset-2">
          privacy policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="text-accent-ink underline underline-offset-2">
          terms
        </Link>
        .
      </p>
    </PageShell>
  );
}
