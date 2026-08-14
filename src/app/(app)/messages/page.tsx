import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/server/auth/current-user";
import { listConversations } from "@/server/modules/messaging/direct";
import { relativeTime } from "@/lib/format";
import { PageHeader, PageShell } from "@/components/page-header";
import { Avatar, EmptyState, LinkButton } from "@/components/ui";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const viewer = await requireViewer();
  const conversations = await listConversations(viewer.profileId);

  return (
    <PageShell>
      <PageHeader
        title="Messages"
        subtitle="Only people you've both agreed to talk to. Nobody can message you out of nowhere."
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No conversations yet"
          description="A conversation opens as soon as someone accepts your connection request, or you accept theirs."
          action={<LinkButton href="/discover">Find people</LinkButton>}
        />
      ) : (
        <ul className="space-y-2">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/messages/${conversation.id}`}
                className="card-surface flex items-center gap-4 p-4 transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]"
              >
                <Avatar
                  name={conversation.other.displayName}
                  src={conversation.other.avatarUrl}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-medium">
                      {conversation.other.displayName}
                    </p>
                    {conversation.lastMessage && (
                      <span className="shrink-0 text-xs text-muted">
                        {relativeTime(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted">
                    {conversation.lastMessage
                      ? `${conversation.lastMessage.fromViewer ? "You: " : ""}${conversation.lastMessage.body}`
                      : "Say hello"}
                  </p>
                </div>
                {conversation.unreadCount > 0 && (
                  <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-on-accent)]">
                    {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                    <span className="sr-only"> unread</span>
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
