import { BellIcon } from "@/components/icons";
import { SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/current-user";
import { listNotifications } from "@/server/modules/notifications/service";
import { PageHeader, PageShell } from "@/components/page-header";
import { NotificationList } from "@/components/notification-list";
import { EmptyState, LinkButton } from "@/components/ui";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

/**
 * Everything Bunchy has told you.
 *
 * Note what this page does not have: no pagination beyond a fixed recent
 * window, and no "load more". If a notification is old enough to have fallen
 * off, it was not something you needed to act on.
 */
export default async function NotificationsPage() {
  const viewer = await requireViewer();
  const notifications = await listNotifications(viewer.profileId, 50);

  return (
    <PageShell width="reading">
      <PageHeader
        title="Notifications"
        subtitle="Only things a person did that involve you."
        action={
          <LinkButton href="/profile" variant="ghost" size="sm">
            <SlidersHorizontal size={16} aria-hidden />
            Settings
          </LinkButton>
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
        level={2}
          icon={<BellIcon />}
          title="Nothing waiting"
          description="We'll tell you when someone wants to connect, replies to you, or your bunch plans something. Nothing else."
          action={<LinkButton href="/discover">Find people</LinkButton>}
        />
      ) : (
        <NotificationList
          initial={notifications.map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            linkPath: n.linkPath,
            readAt: n.readAt?.toISOString() ?? null,
            createdAt: n.createdAt.toISOString(),
          }))}
        />
      )}
    </PageShell>
  );
}
