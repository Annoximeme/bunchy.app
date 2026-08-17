import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireViewer } from "@/server/auth/current-user";
import { getAnnouncement } from "@/server/modules/announcements/service";
import type { AnnouncementBlock } from "@/server/modules/announcements/blocks";
import { isAppError } from "@/server/errors";
import { PageShell } from "@/components/page-header";
import { TierChip, WhenLine } from "@/components/announcements/announcement-list";
import { MarkReadOnView } from "@/components/announcements/mark-read-on-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const viewer = await requireViewer();
    const item = await getAnnouncement(slug, viewer.profileId);
    return { title: item.title, description: item.summary };
  } catch {
    return { title: "What's new" };
  }
}

/**
 * One announcement, in full.
 *
 * The bodies have been written and stored since the day this feature shipped
 * and there has been nowhere to read them: the archive listed titles and
 * summaries, and the banner carried a link to the policy rather than to the
 * notice itself. So the detail of *what changed and why* — the part the
 * policies actually promise — was the one thing not on screen anywhere.
 *
 * Opening this marks it read — from a client effect rather than from this
 * render, because a server component is a render and not an event, and because
 * the unread badge is counted in the layout above and would otherwise stay
 * stale while the member sat there reading the thing it was counting.
 */
export default async function AnnouncementPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const viewer = await requireViewer();
  const { slug } = await params;

  let item;
  try {
    item = await getAnnouncement(slug, viewer.profileId);
  } catch (error) {
    if (isAppError(error) && error.status === 404) {
      const { notFound } = await import("next/navigation");
      notFound();
    }
    throw error;
  }

  return (
    <PageShell>
      <Link
        href="/whats-new"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} aria-hidden />
        What&rsquo;s new
      </Link>

      <MarkReadOnView slug={slug} />

      <article className="mt-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <TierChip tier={item.tier} />
          <WhenLine
            publishedAt={item.publishedAt}
            effectiveAt={item.effectiveAt}
          />
        </div>

        <h1 className="mt-4 max-w-[24ch] text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {item.title}
        </h1>
        <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-ink-soft">
          {item.summary}
        </p>

        {item.body.length > 0 && (
          <div className="prose prose-band mt-8">
            {item.body.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>
        )}

        {item.linkHref && (
          <div className="mt-10 rounded-[var(--radius-card)] border border-line bg-surface-sunken p-6">
            <p className="font-semibold">The document itself</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
              This is the notice. The wording that actually binds is in the
              document.
            </p>
            <Link
              href={item.linkHref}
              className="mt-4 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-[var(--color-on-accent)] transition-transform duration-200 hover:scale-[1.02]"
            >
              {item.linkLabel ?? "Read it"}
            </Link>
          </div>
        )}
      </article>
    </PageShell>
  );
}

/** Rendered to elements. No markdown parser, no HTML, on any path. */
function Block({ block }: { block: AnnouncementBlock }) {
  switch (block.kind) {
    case "heading":
      return <h2>{block.text}</h2>;
    case "quote":
      return (
        <blockquote>
          <p>{block.text}</p>
        </blockquote>
      );
    case "list":
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "paragraph":
    default:
      return <p>{block.text}</p>;
  }
}
