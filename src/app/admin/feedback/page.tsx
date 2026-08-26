import type { Metadata } from "next";
import { Link } from "@/components/link";
import { requireStaff } from "@/server/modules/admin/guard";
import { feedbackCounts, feedbackQueue } from "@/server/modules/feedback/service";
import { AdminHeader, Panel } from "@/components/admin/primitives";
import { Chip } from "@/components/ui";
import { KIND_LABEL, STATUS_LABEL, STATUS_TONE } from "@/lib/feedback";
import { FeedbackAnswer } from "@/components/admin/feedback-answer";
import type { FeedbackStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Feedback" };
export const dynamic = "force-dynamic";

const TABS: Array<{ label: string; status?: FeedbackStatus }> = [
  { label: "Unread", status: "NEW" },
  { label: "Read", status: "READ" },
  { label: "On the list", status: "PLANNED" },
  { label: "Shipped", status: "SHIPPED" },
  { label: "Declined", status: "DECLINED" },
  { label: "Everything" },
];

/**
 * The feedback queue.
 *
 * Oldest first, deliberately. The failure mode of an inbox is that its bottom
 * is never reached, and newest-first guarantees that the first person who ever
 * wrote to you is the last one you answer.
 */
export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const active = (params.status ?? "NEW") as FeedbackStatus | "ALL";

  const [items, counts] = await Promise.all([
    feedbackQueue(active === "ALL" ? {} : { status: active }),
    feedbackCounts(),
  ]);

  return (
    <>
      <AdminHeader
        title="Feedback"
        subtitle="What members say about the product. Not reports, which are about people."
      />

      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const key = tab.status ?? "ALL";
          const isActive = active === key;
          const count = tab.status ? counts[tab.status] : undefined;
          return (
            <Link
              key={key}
              href={`/admin/feedback?status=${key}`}
              className={
                isActive
                  ? "rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-[var(--color-on-accent)]"
                  : "rounded-full px-3 py-1.5 text-sm text-ink-soft hover:bg-surface"
              }
            >
              {tab.label}
              {count !== undefined && count > 0 && (
                <span className="ml-1.5 opacity-70">{count}</span>
              )}
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <Panel>
          <p className="px-4 py-10 text-center text-sm text-muted">
            Nothing here.
          </p>
        </Panel>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <Panel>
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={STATUS_TONE[item.status]}>
                      {STATUS_LABEL[item.status]}
                    </Chip>
                    <span className="text-xs text-muted">
                      {KIND_LABEL[item.kind]} &middot;{" "}
                      {item.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {item.author ? (
                        <>
                          {" "}
                          &middot;{" "}
                          <Link
                            href={`/u/${item.author.username}`}
                            className="underline underline-offset-2"
                          >
                            {item.author.displayName}
                          </Link>
                        </>
                      ) : (
                        " · account deleted, nobody to reply to"
                      )}
                      {item.pagePath && (
                        <>
                          {" "}
                          &middot; <code className="font-mono">{item.pagePath}</code>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm text-ink">{item.message}</p>

                  <FeedbackAnswer
                    id={item.id}
                    status={item.status}
                    reply={item.reply}
                    canReply={Boolean(item.author)}
                  />
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
