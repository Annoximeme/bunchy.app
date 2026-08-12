import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/current-user";
import { onboardingPath } from "@/server/modules/profile/service";
import { db } from "@/server/db/client";
import { AppNav } from "@/components/nav";

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

  const [unreadMessages, pendingRequests] = await Promise.all([
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
  ]);

  return (
    <div className="min-h-dvh md:pl-60">
      <AppNav
        displayName={viewer.displayName}
        username={viewer.username}
        avatarUrl={viewer.avatarUrl}
        unreadMessages={await countTrulyUnread(viewer.profileId, unreadMessages)}
        pendingRequests={pendingRequests}
      />
      <main id="main" className="pb-24 md:pb-10">
        {children}
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
