import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/current-user";
import { onboardingPath } from "@/server/modules/profile/service";
import { db } from "@/server/db/client";
import { AppNav } from "@/components/nav";
import { SiteFooter } from "@/components/site-links";
import { isStaff } from "@/server/modules/admin/guard";
import { unreadCount } from "@/server/modules/notifications/service";
import {
  bannerFor,
  unreadCount as announcementsUnread,
} from "@/server/modules/announcements/service";
import { AnnouncementBanner } from "@/components/announcements/announcement-banner";

/**
 * The signed-in shell.
 *
 * Also the onboarding gate: anyone who has not finished is sent back to the
 * step they stopped at. Doing it here rather than in middleware keeps the check
 * next to the session lookup it depends on, and `getViewer` is request-cached
 * so pages below pay nothing for it.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.onboardingStage !== "COMPLETE") {
    redirect(onboardingPath(viewer.onboardingStage));
  }

  const [
    unreadMessages,
    pendingRequests,
    unreadNotifications,
    banner,
    unreadAnnouncements,
  ] =
    await Promise.all([
      db.conversation.count({
      where: {
        participants: { some: { profileId: viewer.profileId } },
        messages: {
          some: {
            senderId: { not: viewer.profileId },
            deletedAt: null,
          },
        },
      },
    }),
      db.connection.count({
      where: { addresseeId: viewer.profileId, status: "PENDING" },
    }),
      unreadCount(viewer.profileId),
      // The only thing in this product allowed to interrupt somebody, and it is
      // here rather than on a page because Privacy §14 and Terms §14 promise
      // notice *in the product* before a change takes effect. A page nobody
      // visits cannot keep that promise.
      bannerFor(viewer.profileId),
      announcementsUnread(viewer.profileId),
    ]);

  return (
    <div className="relative min-h-dvh md:pl-60">
      {/*
        The same two washes the landing hero opens with, carried into the app so
        the product does not go flat the moment somebody signs in. Kept far
        weaker than the landing's, that page is a poster and this one is read
        for an hour at a time, and `fixed` so it stays a property of the room
        rather than something that scrolls away with the first screen.
      */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(46rem 26rem at 12% -8%, var(--wash-coral), transparent 62%), radial-gradient(42rem 24rem at 94% 2%, var(--wash-purple), transparent 62%)",
        }}
      />
      <AppNav
        displayName={viewer.displayName}
        username={viewer.username}
        avatarUrl={viewer.avatarUrl}
        unreadMessages={await countTrulyUnread(viewer.profileId, unreadMessages)}
        pendingRequests={pendingRequests}
        unreadNotifications={unreadNotifications}
        unreadAnnouncements={unreadAnnouncements}
        staff={isStaff(viewer)}
      />
      {banner && (
        <AnnouncementBanner
          slug={banner.slug}
          title={banner.title}
          summary={banner.summary}
          linkHref={banner.linkHref}
          linkLabel={banner.linkLabel}
          effectiveAt={banner.effectiveAt?.toISOString() ?? null}
        />
      )}
      <main id="main" className="pb-24 md:pb-10">
        {children}
        {/*
          The only route from inside the product to the pages that explain it.
          Without this, signing in made About, Safety, Volunteer, Privacy and
          Terms unreachable, they were linked from the landing page footer
          alone, and a signed-in visitor to the landing page is redirected to
          Discover before they ever see it.
        */}
        <SiteFooter />
      </main>
    </div>
  );
}

/**
 * The count above is a cheap upper bound; this narrows it to conversations with
 * genuinely unread messages. A badge that lies is worse than no badge.
 */
async function countTrulyUnread(
  profileId: string,
  upperBound: number,
): Promise<number> {
  if (upperBound === 0) return 0;

  const participants = await db.conversationParticipant.findMany({
    where: { profileId },
    select: { conversationId: true, lastReadAt: true },
  });

  let unread = 0;
  for (const participant of participants) {
    const count = await db.directMessage.count({
      where: {
        conversationId: participant.conversationId,
        senderId: { not: profileId },
        deletedAt: null,
        ...(participant.lastReadAt
          ? { createdAt: { gt: participant.lastReadAt } }
          : {}),
      },
    });
    if (count > 0) unread += 1;
  }

  return unread;
}
