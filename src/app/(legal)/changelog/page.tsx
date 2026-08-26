import type { Metadata } from "next";
import { Link } from "@/components/link";
import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { LegalPage } from "@/components/legal";
import {
  listPublicAnnouncements,
  type PublicAnnouncement,
} from "@/server/modules/announcements/service";
import type { AnnouncementBlock } from "@/server/modules/announcements/blocks";
import { currentLocale, getTranslations } from "@/server/i18n";
import { INTL_TAGS, type Locale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("changelog.title"),
    description: t("changelog.metaDescription"),
    alternates: {
      types: {
        "application/atom+xml": [
          { url: "/changelog/feed.xml", title: `${brand.name} changelog` },
        ],
      },
    },
  };
}

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
 * order to know what new meant, on the page whose entire subject is how
 * carefully this product handles people's data.
 *
 * `publicVisible` is what holds something back. It defaults to true because
 * everything published so far is a policy or availability notice, and those
 * belong in public.
 */
export default async function ChangelogPage() {
  const announcements = await listPublicAnnouncements();
  const t = await getTranslations();

  return (
    <LegalPage
      path="/changelog"
      title={t("changelog.title")}
      contact={LEGAL.privacyContact}
      summary={t("changelog.summary", { brand: brand.name })}
    >
      {announcements.length === 0 ? (
        <section>
          <p className="text-lg leading-relaxed text-ink-soft">
            {t("changelog.empty", { brand: brand.name })}
          </p>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            {t("changelog.documentsBefore")}{" "}
            <Link href="/privacy">{t("changelog.privacy")}</Link>{" "}
            {t("changelog.documentsAnd")}{" "}
            <Link href="/terms">{t("changelog.terms")}</Link>.
          </p>
        </section>
      ) : (
        announcements.map((item) => <Entry key={item.slug} item={item} />)
      )}

      <section>
        <p className="text-sm text-ink-soft">
          {t("changelog.feedBefore")}{" "}
          <Link href="/changelog/feed.xml">{t("changelog.feed")}</Link>
          {t("changelog.feedAfter")}{" "}
          <Link href="/whats-new">{t("changelog.whatsNew")}</Link>.
        </p>
      </section>
    </LegalPage>
  );
}

/**
 * The long date, in the reader's language.
 *
 * The announcements themselves are not translated and are not meant to be:
 * each one is a notice that was published to members on a day, in the words it
 * was published in, and rewriting a record after the fact is the opposite of
 * what a changelog is for. Only the furniture around them moves.
 */
function formatDate(value: Date, locale: Locale) {
  return value.toLocaleDateString(INTL_TAGS[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const TIER_LABEL = {
  CRITICAL: "changelog.tierCritical",
  NOTABLE: "changelog.tierNotable",
  NOTED: "changelog.tierNoted",
} as const;

async function Entry({ item }: { item: PublicAnnouncement }) {
  const t = await getTranslations();
  const locale = await currentLocale();

  return (
    <section id={item.slug} className="scroll-mt-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="font-bold uppercase tracking-[0.14em] text-accent-ink">
          {t(TIER_LABEL[item.tier])}
        </span>
        <time dateTime={item.publishedAt.toISOString()} className="text-muted">
          {formatDate(item.publishedAt, locale)}
        </time>
        {item.effectiveAt && (
          <span className="text-muted">
            {/* The second date is the one the policies are about. On the public
                record it is always stated as a date rather than as a countdown:
                this page is read by people deciding whether to join, and "in
                four days" is only meaningful to somebody already affected. */}
            {t("changelog.tookEffect")}{" "}
            <time
              dateTime={item.effectiveAt.toISOString()}
              className="font-medium"
            >
              {formatDate(item.effectiveAt, locale)}
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
