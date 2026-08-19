import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { LegalPage } from "@/components/legal";
import {
  listPublicAnnouncements,
  type PublicAnnouncement,
} from "@/server/modules/announcements/service";
import type { AnnouncementBlock } from "@/server/modules/announcements/blocks";

export const metadata: Metadata = {
  title: "Changelog",
  description: `Every change ${brand.name} has announced, when it was announced, and when it took effect. Readable without an account.`,
  alternates: {
    types: {
      "application/atom+xml": [
        { url: "/changelog/feed.xml", title: `${brand.name} changelog` },
      ],
    },
  },
};

// The record changes when something is published, which is not a build.
export const dynamic = "force-dynamic";

/**
 * The record, without a login.
 *
 * ## Why this is not just What's new signed out
 *
 * What's new answers "was I told?", which is a question about a particular
 * member and needs a session to answer. This page answers "what has this
 * product done to its users, and how did it tell them?", which is a question
 * somebody asks *before* they hand anything over, and answering it only to
 * people who have already signed up inverts the point of publishing it.
 *
 * Privacy §14 and Terms §14 are promises made to people who have not joined
 * yet as much as to people who have: they are part of what a cautious reader
 * is deciding about on /about and /safety. A policy history behind a login is
 * a policy history that cannot be checked by the one person it would most
 * inform.
 *
 * ## What is deliberately absent
 *
 * No unread marks, no "new since your last visit", no counts. There is no
 * viewer here, and inventing one would mean tracking an anonymous reader in
 * order to know what new meant — on the page whose entire subject is how
 * carefully this product handles people's data.
 *
 * `publicVisible` is what holds something back. It defaults to true because
 * everything published so far is a policy or availability notice, and those
 * belong in public.
 */
export default async function ChangelogPage() {
  const announcements = await listPublicAnnouncements();

  return (
    <LegalPage
      path="/changelog"
      title="Changelog"
      contact={LEGAL.privacyContact}
      summary={`Every change ${brand.name} has announced, in the order it happened. Published here at the same moment members are told, so the two records cannot drift apart.`}
    >
      {announcements.length === 0 ? (
        <section>
          <p className="text-lg leading-relaxed text-ink-soft">
            Nothing has been announced yet. When {brand.name} changes something
            that affects what it holds about people or what the terms say, the
            notice appears here on the day it goes to members, with the date it
            takes effect on it.
          </p>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            The documents themselves are the{" "}
            <Link href="/privacy">privacy policy</Link> and the{" "}
            <Link href="/terms">terms</Link>.
          </p>
        </section>
      ) : (
        announcements.map((item) => <Entry key={item.slug} item={item} />)
      )}

      <section>
        <p className="text-sm text-ink-soft">
          This page is also an{" "}
          <Link href="/changelog/feed.xml">Atom feed</Link>, so a change to the
          terms can be watched without visiting anything. Members see the same
          record, plus which ones they have read, at{" "}
          <Link href="/whats-new">What&rsquo;s new</Link>.
        </p>
      </section>
    </LegalPage>
  );
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const TIER_LABEL = {
  CRITICAL: "Important",
  NOTABLE: "New",
  NOTED: "Noted",
} as const;

function Entry({ item }: { item: PublicAnnouncement }) {
  return (
    <section id={item.slug} className="scroll-mt-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="font-bold uppercase tracking-[0.14em] text-accent-ink">
          {TIER_LABEL[item.tier]}
        </span>
        <time dateTime={item.publishedAt.toISOString()} className="text-muted">
          {formatDate(item.publishedAt)}
        </time>
        {item.effectiveAt && (
          <span className="text-muted">
            {/* The second date is the one the policies are about. On the public
                record it is always stated as a date rather than as a countdown:
                this page is read by people deciding whether to join, and "in
                four days" is only meaningful to somebody already affected. */}
            Took effect{" "}
            <time
              dateTime={item.effectiveAt.toISOString()}
              className="font-medium"
            >
              {formatDate(item.effectiveAt)}
            </time>
          </span>
        )}
      </div>

      <h2 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
        {item.title}
      </h2>
      <p className="mt-3 text-lg leading-relaxed text-ink-soft">{item.summary}</p>

      {item.body.length > 0 && (
        <div className="prose prose-band mt-5">
          {item.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Rendered to elements. No markdown parser, no HTML, on any path. */
function Block({ block }: { block: AnnouncementBlock }) {
  switch (block.kind) {
    case "heading":
      return <h3>{block.text}</h3>;
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
