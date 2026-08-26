import type { Metadata } from "next";
import { Link } from "@/components/link";
import { requireViewer } from "@/server/auth/current-user";
import {
  PAGE_SIZE,
  countAnnouncements,
  listAnnouncements,
  unreadCount,
} from "@/server/modules/announcements/service";
import type { AnnouncementTier } from "@/generated/prisma/enums";
import { PageHeader, PageShell } from "@/components/page-header";
import { EmptyState } from "@/components/ui";
import { AnnouncementList } from "@/components/announcements/announcement-list";

export const metadata: Metadata = { title: "What's new" };
export const dynamic = "force-dynamic";

/**
 * The permanent record of everything the operator has told members.
 *
 * The archive half of the promise in Privacy §14 and Terms §14. The banner is
 * how notice is *given*; this is how it stays checkable afterwards, a member
 * who wants to know when something changed, or whether they were told, has one
 * page to look at rather than a support email to write.
 *
 * Nothing is ever deleted from here. Withdrawing an announcement unpublishes it
 * and leaves the audit trail intact, so the record of what was said and when
 * survives changing our minds about saying it.
 *
 * ## Why the filters are links
 *
 * Every control on this page is an anchor with a query string, and the whole
 * screen is a server component. No client state, no fetch on click. That is
 * partly because a record is a thing you link somebody to. "The unread ones"
 * and "everything that interrupted us" should both be URLs you can paste. It is
 * also because this is the page a member lands on when they want to check
 * whether they were told something, which is not a moment to depend on
 * JavaScript having loaded.
 */

const TIERS: { value: AnnouncementTier | "all"; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "CRITICAL", label: "Important" },
  { value: "NOTABLE", label: "New" },
  { value: "NOTED", label: "Noted" },
];

type Search = { tier?: string; unread?: string; cursor?: string };

/** Rebuilds the query string with one thing changed. */
function href(current: Search, change: Partial<Search>): string {
  const next = { ...current, ...change };
  const params = new URLSearchParams();
  if (next.tier && next.tier !== "all") params.set("tier", next.tier);
  if (next.unread === "1") params.set("unread", "1");
  // Carried only when the caller wants it. Every filter link above passes
  // `cursor: undefined` on purpose: changing a filter has to start from the top
  // of the new result set, or the first page of "Important" begins wherever the
  // reader happened to have got to in the full list.
  if (next.cursor) params.set("cursor", next.cursor);
  const query = params.toString();
  return query ? `/whats-new?${query}` : "/whats-new";
}

function Chip({
  children,
  active,
  to,
}: {
  children: React.ReactNode;
  active: boolean;
  to: string;
}) {
  return (
    <Link
      href={to}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-transparent bg-ink text-canvas"
          : "border-line text-ink-soft hover:border-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function WhatsNewPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const viewer = await requireViewer();
  const params = await searchParams;

  // Anything unrecognised in the query string falls back rather than erroring.
  // A stale link from an old email should show the record, not a 500.
  const tier = TIERS.some((t) => t.value === params.tier)
    ? (params.tier as AnnouncementTier)
    : undefined;
  const unreadOnly = params.unread === "1";
  const filtered = tier !== undefined || unreadOnly;

  const [page, unread, total] = await Promise.all([
    listAnnouncements(viewer.profileId, {
      tier,
      unreadOnly,
      cursor: params.cursor ?? null,
    }),
    unreadCount(viewer.profileId),
    countAnnouncements(),
  ]);

  const current: Search = {
    tier: params.tier,
    unread: params.unread,
    cursor: params.cursor,
  };

  return (
    <PageShell>
      <PageHeader
        title="What's new"
        subtitle="Everything we have told you, and when. Changes that affect your rights or your data appear here before they take effect."
      />

      {total === 0 ? (
        <EmptyState
          level={2}
          icon="📭"
          title="Nothing to report"
          description="When something changes that affects you, whether that is what we hold, what the terms say, or whether the site is up, it lands here. The important ones find you rather than waiting to be found."
        />
      ) : (
        <>
          <nav
            aria-label="Filter the record"
            className="flex flex-wrap items-center gap-2 border-b border-line pb-6"
          >
            {TIERS.map((t) => (
              <Chip
                key={t.value}
                active={(params.tier ?? "all") === t.value}
                to={href(current, { tier: t.value, cursor: undefined })}
              >
                {t.label}
              </Chip>
            ))}

            <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden />

            <Chip
              active={unreadOnly}
              to={href(current, {
                unread: unreadOnly ? undefined : "1",
                cursor: undefined,
              })}
            >
              {unread === 0 ? "Unread" : `Unread (${unread})`}
            </Chip>
          </nav>

          <p className="mt-6 text-sm text-muted">
            {unread === 0
              ? "You have read all of these."
              : `${unread} you have not read yet.`}{" "}
            Nothing is ever removed from this page. Withdrawing an announcement
            takes it off the board and leaves the record alone.
          </p>

          {page.announcements.length === 0 ? (
            <EmptyState
              level={2}
              icon="🔎"
              title="Nothing under that filter"
              description={
                unreadOnly
                  ? "You have read everything here. Clear the filter to see the whole record."
                  : "No announcement of that kind has been published yet."
              }
              action={
                <Link
                  href="/whats-new"
                  className="font-semibold text-accent-ink underline underline-offset-2"
                >
                  Show everything
                </Link>
              }
            />
          ) : (
            <>
              <AnnouncementList announcements={page.announcements} />

              {/*
                One direction only. The record is read newest first, and the
                browser's own back button is a better "newer" control than a
                second link that has to reconstruct a cursor it already used.
              */}
              {page.nextCursor && (
                <div className="mt-10 flex justify-center">
                  <Link
                    href={href(current, { cursor: page.nextCursor })}
                    className="rounded-[var(--radius-control)] border border-line px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
                  >
                    Show older
                  </Link>
                </div>
              )}

              {page.total > PAGE_SIZE && (
                <p className="mt-4 text-center text-sm text-muted">
                  {filtered
                    ? `${page.total} match this filter.`
                    : `${page.total} in the record.`}
                </p>
              )}
            </>
          )}
        </>
      )}

      <p className="mt-10 text-sm text-muted">
        The documents themselves:{" "}
        <Link href="/privacy" className="text-accent-ink underline underline-offset-2">
          privacy policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="text-accent-ink underline underline-offset-2">
          terms
        </Link>
        . The public version of this record is the{" "}
        <Link href="/changelog" className="text-accent-ink underline underline-offset-2">
          changelog
        </Link>
        .
      </p>
    </PageShell>
  );
}
