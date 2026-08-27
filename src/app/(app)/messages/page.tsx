import { ChatIcon } from "@/components/icons";
import type { Metadata } from "next";
import { Link } from "@/components/link";
import { requireViewer } from "@/server/auth/current-user";
import { listConversations } from "@/server/modules/messaging/direct";
import { PageHeader, PageShell } from "@/components/page-header";
import { Avatar, EmptyState, LinkButton } from "@/components/ui";
import { getFormats, getTranslations } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("messages.title") };
}
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const t = await getTranslations();
  const { relativeTime } = await getFormats();
  const viewer = await requireViewer();
  const conversations = await listConversations(viewer.profileId);

  return (
    <PageShell width="reading">
      <PageHeader
        title={t("messages.title")}
        subtitle={t("messages.subtitle")}
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={<ChatIcon />}
          title={t("messages.emptyTitle")}
          description={t("messages.emptyBody")}
          action={<LinkButton href="/discover">{t("messages.findPeople")}</LinkButton>}
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
                      : t("messages.sayHello")}
                  </p>
                </div>
                {conversation.unreadCount > 0 && (
                  <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-on-accent)]">
                    {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                    <span className="sr-only"> {t("messages.unread")}</span>
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
