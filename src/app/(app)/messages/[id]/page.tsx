import type { Metadata } from "next";
import { Link } from "@/components/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth/current-user";
import { isAppError } from "@/server/errors";
import { getConversation } from "@/server/modules/messaging/direct";
import { pairPlan, suggestTimes } from "@/server/modules/messaging/plans";
import { PageShell } from "@/components/page-header";
import { DirectThread } from "@/components/direct-thread";
import { PairPlan } from "@/components/pair-plan";
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

  // Loaded here rather than fetched by the card, so somebody who opens a
  // conversation with a plan waiting in it sees the plan in the first paint
  // instead of a card that appears a moment later.
  const [plan, suggestions] = await Promise.all([
    pairPlan(id, viewer.profileId),
    suggestTimes(id, viewer.profileId),
  ]);

  return (
    <PageShell width="reading">
      <header className="mb-6 flex items-center justify-between gap-4">
        <Link
          href={`/u/${conversation.other.username}`}
          className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80"
        >
          <Avatar
            name={conversation.other.displayName}
            src={conversation.other.avatarUrl}
          />
          {/*
            The name is the page's heading, so it is one. It looked like a
            heading and was a `span`, which left this the only screen in the
            app with no `h1` on it: a screen reader announcing the page had
            nothing to announce it as, and the audit said so.
          */}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {conversation.other.displayName}
            </h1>
            <span className="block truncate text-sm text-muted">
              @{conversation.other.username}
            </span>
          </div>
        </Link>
        <Link href="/messages" className="shrink-0 text-sm text-muted hover:text-ink">
          All messages
        </Link>
      </header>

      <PairPlan
        conversationId={conversation.id}
        otherName={conversation.other.displayName}
        plan={
          plan && {
            ...plan,
            options: plan.options.map((option) => ({
              ...option,
              startsAt: option.startsAt.toISOString(),
            })),
          }
        }
        suggestions={suggestions.map((suggestion) => ({
          startsAt: suggestion.startsAt.toISOString(),
          weekend: suggestion.weekend,
        }))}
        readOnly={conversation.readOnly}
      />

      <DirectThread
        conversationId={conversation.id}
        otherName={conversation.other.displayName}
        initialMessages={conversation.messages}
        readOnly={conversation.readOnly}
        initialOtherLastReadAt={conversation.otherLastReadAt}
      />

      <div className="mt-6 border-t border-line pt-4">
        <ReportButton
          targetType="PROFILE"
          targetId={conversation.other.id}
          label="Report this person"
        />
      </div>
    </PageShell>
  );
}
