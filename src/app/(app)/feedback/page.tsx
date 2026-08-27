import type { Metadata } from "next";
import { Link } from "@/components/link";
import { requireViewer } from "@/server/auth/current-user";
import { feedbackFrom } from "@/server/modules/feedback/service";
import { brand } from "@/lib/brand";
import { Card, Chip, SectionHeading } from "@/components/ui";
import { PageHeader, PageShell } from "@/components/page-header";
import { FeedbackForm } from "@/components/feedback-form";
import { STATUS_LABEL, STATUS_TONE, KIND_LABEL } from "@/lib/feedback";

export const metadata: Metadata = { title: "Feedback" };
export const dynamic = "force-dynamic";

/**
 * Send feedback, and see what happened to the last lot.
 *
 * The second half is the part that matters. A form on its own is a suggestion
 * box: you post something into it and never learn whether anybody opened it,
 * which teaches people not to post a second time. Showing the state of
 * everything somebody has sent, including "nobody has read this yet", is what
 * makes the first message worth writing.
 */
export default async function FeedbackPage() {
  const viewer = await requireViewer();
  const mine = await feedbackFrom(viewer.profileId);

  return (
    <PageShell width="reading">
      <PageHeader
        title="Feedback"
        subtitle={`One person builds ${brand.name}, and he reads all of these. You will get an answer, including when the answer is no.`}
      />

      <Card>
        <FeedbackForm />
      </Card>

      {mine.length > 0 && (
        <section className="mt-10">
          <SectionHeading
            title="What you have sent"
            subtitle="Between you and us. None of it is public, and nothing is ranked against anybody else's."
          />

          <ul className="space-y-3">
            {mine.map((item) => (
              <li key={item.id}>
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={STATUS_TONE[item.status]}>
                      {STATUS_LABEL[item.status]}
                    </Chip>
                    <span className="text-xs text-muted">
                      {KIND_LABEL[item.kind]} &middot;{" "}
                      {item.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm text-ink">{item.message}</p>

                  {item.reply && (
                    <div className="rounded-[var(--radius-control)] border-l-2 border-accent bg-surface-sunken p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        The answer
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                        {item.reply}
                      </p>
                      {item.announcement && (
                        <Link
                          href={`/whats-new/${item.announcement.slug}`}
                          className="mt-2 inline-block text-sm font-medium text-accent-ink underline underline-offset-2"
                        >
                          {item.announcement.title}
                        </Link>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  );
}
