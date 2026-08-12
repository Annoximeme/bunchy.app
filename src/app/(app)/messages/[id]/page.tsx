import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth/current-user";
import { isAppError } from "@/server/errors";
import { getConversation } from "@/server/modules/messaging/direct";
import { PageShell } from "@/components/page-header";
import { DirectThread } from "@/components/direct-thread";
import { ReportButton } from "@/components/moderation-actions";
import { Avatar } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const viewer = await requireViewer();
    const conversation = await getConversation(id, viewer.profileId);
    return { title: conversation.other.displayName };
  } catch {
    return { title: "Conversation" };
  }
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireViewer();
  const { id } = await params;

  let conversation;
  try {
    conversation = await getConversation(id, viewer.profileId);
  } catch (error) {
    if (isAppError(error) && error.code === "not_found") notFound();
    throw error;
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link
            href={`/u/${conversation.other.username}`}
            className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80"
          >
            <Avatar
              name={conversation.other.displayName}
              src={conversation.other.avatarUrl}
            />
            <span className="min-w-0">
              <span className="block truncate text-lg font-semibold tracking-tight">
                {conversation.other.displayName}
              </span>
              <span className="block truncate text-sm text-muted">
                @{conversation.other.username}
              </span>
            </span>
          </Link>
          <Link href="/messages" className="shrink-0 text-sm text-muted hover:text-ink">
            All messages
          </Link>
        </header>

        <DirectThread
          conversationId={conversation.id}
          otherName={conversation.other.displayName}
          initialMessages={conversation.messages}
          readOnly={conversation.readOnly}
        />

        <div className="mt-6 border-t border-line pt-4">
          <ReportButton
            targetType="PROFILE"
            targetId={conversation.other.id}
            label="Report this person"
          />
        </div>
      </div>
    </PageShell>
  );
}
