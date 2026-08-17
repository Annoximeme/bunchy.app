import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireViewer } from "@/server/auth/current-user";
import {
  getBuzzPost,
  interestedNearby,
  type BuzzBlock,
} from "@/server/modules/buzz/service";
import { isAppError } from "@/server/errors";
import { PageShell } from "@/components/page-header";
import { ActionCard, BunchUp } from "@/components/buzz/buzz-ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  // Titles come from the row, and a missing row is a 404 rather than a title
  // that leaks the slug somebody guessed.
  try {
    const viewer = await requireViewer();
    const post = await getBuzzPost(slug, viewer.profileId);
    return { title: post.headline, description: post.standfirst };
  } catch {
    return { title: "Bunchy Buzz" };
  }
}

/**
 * One Buzz post.
 *
 * A narrow reading column and then, without fail, a way to do the thing with
 * other people. The rule this page is built around is that it must not be
 * possible to reach the bottom and find only a comment box or a row of related
 * articles — so the closing block is a component, not an editorial habit, and
 * the post's own action text drives it.
 *
 * `alsoOn` is the nearest thing here to "related articles", and it is
 * deliberately two cards that each carry their own button. Another way in, not
 * another thing to read.
 */
export default async function BuzzArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const viewer = await requireViewer();
  const { slug } = await params;

  let post;
  try {
    post = await getBuzzPost(slug, viewer.profileId);
  } catch (error) {
    if (isAppError(error) && error.status === 404) {
      const { notFound } = await import("next/navigation");
      notFound();
    }
    throw error;
  }

  // A real count of members into the same thing, or null. Never invented.
  const nearby = await interestedNearby(post.interestSlugs);

  return (
    <PageShell>
      <Link
        href="/discover/buzz"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} aria-hidden />
        Bunchy Buzz
      </Link>

      <article className="mt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-ink">
          {post.eyebrow}
        </p>
        <h1 className="mt-3 max-w-[22ch] text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {post.headline}
        </h1>
        <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-ink-soft">
          {post.standfirst}
        </p>

        <div className="prose prose-band mt-10">
          {post.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      </article>

      <BunchUp query={post.actionQuery} label={post.actionLabel} nearby={nearby} />

      {post.alsoOn.length > 0 && (
        <section className="mt-14">
          <h2 className="text-lg font-extrabold tracking-tight">
            Also worth doing
          </h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {post.alsoOn.map((card) => (
              <ActionCard key={card.slug} card={card} />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}

/**
 * A body block.
 *
 * A small tagged union rendered to React elements. There is no markdown parser
 * and no `dangerouslySetInnerHTML` anywhere on this path, so a post cannot
 * carry markup no matter who writes it or how the row got there.
 */
function Block({ block }: { block: BuzzBlock }) {
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
