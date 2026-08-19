import { db } from "@/server/db/client";
import { notFound, validationFailed } from "@/server/errors";
import { recordModerationEvent } from "@/server/modules/admin/audit";
import type { StaffViewer } from "@/server/modules/admin/guard";
import type { AnnouncementTier } from "@/generated/prisma/enums";
import type { AnnouncementBlock } from "@/server/modules/announcements/blocks";

/**
 * Announcements, the things the operator did that affect you.
 *
 * ## Why this exists at all
 *
 * Not because a product needs a changelog. Because two published policies
 * already promise it and nothing could keep them:
 *
 *   Privacy §14  "If we change anything that affects what we hold or what we do
 *                with it, we will tell you in the product before it takes
 *                effect, not with a quiet edit and a new date at the top."
 *   Terms §14    "If a change materially affects your rights, we will tell you
 *                in the product before it takes effect and give you a fair
 *                chance to leave with your data if you disagree."
 *
 * Every column here comes from that. `effectiveAt` is separate from
 * `publishedAt` so "before it takes effect" is something `publish` can refuse
 * rather than something an operator remembers. Reads are per member so a banner
 * can retire itself. Publishing writes to the audit trail because it reaches
 * more people than any moderation action in the dashboard.
 *
 * ## The line that keeps this from becoming spam
 *
 * /about promises there are "no notifications designed to pull you back" and
 * that you are only told about "something a person actually did that involves
 * you". An announcement sits inside that promise only while it is genuinely the
 * operator acting on you, a policy change, an outage, the site going down on
 * Sunday. "We shipped a thing, come back and look" is the other kind, and the
 * moment it is pushed the sentence on /about stops being true.
 *
 * That distinction is not left to whoever writes the copy. `DELIVERY` maps the
 * tier to the route, `CRITICAL` is the only tier that interrupts anybody, and
 * `publish` refuses to mark something CRITICAL without a reason recorded in the
 * audit trail. Choosing the wrong box is a decision somebody has to defend
 * later, not a checkbox.
 *
 * ## Three states, not two
 *
 * `publishedAt` carries all of them, which is why every read in this file
 * filters on `publishedAt <= now` rather than on `publishedAt != null`:
 *
 *   null            a draft. Written, saved, reaching nobody.
 *   in the future   scheduled. Complete and invisible until its moment.
 *   in the past     published.
 *
 * Scheduling matters more here than it would elsewhere. A notice has to arrive
 * before a change takes effect, and the person who can write the notice
 * properly is rarely at a keyboard at the moment it should go out.
 */

export const DELIVERY: Record<
  AnnouncementTier,
  { banner: boolean; whatsNew: boolean; mayEmail: boolean }
> = {
  // Interrupts. Reserved for rights, data and availability.
  CRITICAL: { banner: true, whatsNew: true, mayEmail: true },
  // Findable, never pushed.
  NOTABLE: { banner: false, whatsNew: true, mayEmail: false },
  // On the record.
  NOTED: { banner: false, whatsNew: true, mayEmail: false },
};

/** How many an unfiltered page of the record holds. */
export const PAGE_SIZE = 20;

export interface AnnouncementSummary {
  slug: string;
  title: string;
  summary: string;
  tier: AnnouncementTier;
  linkHref: string | null;
  linkLabel: string | null;
  publishedAt: Date;
  effectiveAt: Date | null;
  read: boolean;
}

export interface AnnouncementDetail extends AnnouncementSummary {
  body: AnnouncementBlock[];
}

export interface AnnouncementPage {
  announcements: AnnouncementSummary[];
  /** Everything matching the filter, not just this page. */
  total: number;
  /** Absent when this is the last page. */
  nextCursor: string | null;
}

const SUMMARY_SELECT = {
  slug: true,
  title: true,
  summary: true,
  tier: true,
  linkHref: true,
  linkLabel: true,
  publishedAt: true,
  effectiveAt: true,
} as const;

type SummaryRow = {
  slug: string;
  title: string;
  summary: string;
  tier: AnnouncementTier;
  linkHref: string | null;
  linkLabel: string | null;
  publishedAt: Date | null;
  effectiveAt: Date | null;
};

function toSummary(row: SummaryRow, read: Set<string>): AnnouncementSummary {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    tier: row.tier,
    linkHref: row.linkHref,
    linkLabel: row.linkLabel,
    publishedAt: row.publishedAt!,
    effectiveAt: row.effectiveAt,
    read: read.has(row.slug),
  };
}

async function readSlugs(profileId: string): Promise<Set<string>> {
  const rows = await db.announcementRead.findMany({
    where: { profileId },
    select: { announcement: { select: { slug: true } } },
  });
  return new Set(rows.map((r) => r.announcement.slug));
}

/**
 * The condition that means "a member is entitled to see this".
 *
 * One constant rather than four copies of the same object literal, because the
 * archive, the banner, the unread count and the feed have to agree about what
 * published means. They disagreed the moment scheduling arrived: a filter of
 * `publishedAt != null` shows a scheduled announcement the instant it is saved,
 * which is precisely the quiet early disclosure scheduling exists to avoid.
 */
function publishedFilter(now: Date) {
  return { publishedAt: { not: null, lte: now } } as const;
}

export interface ListOptions {
  /** Narrow to one tier. Undefined means all of them. */
  tier?: AnnouncementTier;
  /** Only the ones this member has not read. */
  unreadOnly?: boolean;
  /** The `nextCursor` of the previous page: a slug. */
  cursor?: string | null;
  limit?: number;
}

/**
 * The record, newest first, one page at a time.
 *
 * Paginated because this list only grows. It is the one screen in the product
 * guaranteed to be longer next year than it is today, and a member who joined
 * at launch eventually loads every notice ever published in order to read the
 * three at the top.
 *
 * The cursor is the slug rather than an offset. Slugs are unique and stable,
 * so a notice published while somebody is on page two does not shunt a row
 * they have already seen onto page three.
 */
export async function listAnnouncements(
  profileId: string,
  options: ListOptions = {},
): Promise<AnnouncementPage> {
  const limit = Math.min(options.limit ?? PAGE_SIZE, 100);
  const now = new Date();

  const where = {
    ...publishedFilter(now),
    ...(options.tier ? { tier: options.tier } : {}),
    ...(options.unreadOnly ? { reads: { none: { profileId } } } : {}),
  };

  const [rows, total, read] = await Promise.all([
    db.announcement.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      // One more than asked for, so "is there another page" is answered by the
      // same query rather than by a second count that can disagree with it.
      take: limit + 1,
      ...(options.cursor
        ? { cursor: { slug: options.cursor }, skip: 1 }
        : {}),
      select: SUMMARY_SELECT,
    }),
    db.announcement.count({ where }),
    readSlugs(profileId),
  ]);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    announcements: page.map((row) => toSummary(row, read)),
    total,
    nextCursor: hasMore ? (page[page.length - 1]?.slug ?? null) : null,
  };
}

/** How many published announcements exist in total, for the empty state. */
export async function countAnnouncements(): Promise<number> {
  return db.announcement.count({ where: publishedFilter(new Date()) });
}

export async function getAnnouncement(
  slug: string,
  profileId: string,
): Promise<AnnouncementDetail> {
  const row = await db.announcement.findUnique({
    where: { slug },
    select: { ...SUMMARY_SELECT, body: true },
  });
  if (!row?.publishedAt || row.publishedAt > new Date()) {
    throw notFound("There is no such announcement.");
  }
  const read = await readSlugs(profileId);
  return { ...toSummary(row, read), body: (row.body as AnnouncementBlock[]) ?? [] };
}

/**
 * What to interrupt this member with, if anything.
 *
 * Only CRITICAL, only unread, oldest first, so somebody who has been away
 * meets the changes in the order they happened rather than in reverse. One at a
 * time: a stack of banners is a wall, and a wall gets dismissed without reading,
 * which defeats the entire promise this exists to keep.
 */
export async function bannerFor(
  profileId: string,
): Promise<AnnouncementSummary | null> {
  const rows = await db.announcement.findMany({
    where: {
      tier: "CRITICAL",
      ...publishedFilter(new Date()),
      reads: { none: { profileId } },
    },
    orderBy: { publishedAt: "asc" },
    take: 1,
    select: SUMMARY_SELECT,
  });

  const row = rows[0];
  return row ? toSummary(row, new Set()) : null;
}

/** How many published announcements this member has not seen. */
export async function unreadCount(profileId: string): Promise<number> {
  return db.announcement.count({
    where: {
      ...publishedFilter(new Date()),
      reads: { none: { profileId } },
    },
  });
}

/** Dismissing a banner and reading the thing are the same act. */
export async function markRead(slug: string, profileId: string): Promise<void> {
  const row = await db.announcement.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!row) throw notFound("There is no such announcement.");

  await db.announcementRead.upsert({
    where: {
      announcementId_profileId: { announcementId: row.id, profileId },
    },
    create: { announcementId: row.id, profileId },
    update: {},
  });
}

// ---------------------------------------------------------------------------
// The signed-out record
// ---------------------------------------------------------------------------

export interface PublicAnnouncement {
  slug: string;
  title: string;
  summary: string;
  tier: AnnouncementTier;
  publishedAt: Date;
  effectiveAt: Date | null;
  body: AnnouncementBlock[];
}

/**
 * The changelog anybody can read, including somebody deciding whether to join.
 *
 * A policy history behind a login is a policy history nobody can check before
 * they hand over their data, which inverts the point of publishing one. So the
 * default for a new announcement is public, and holding one back is the
 * deliberate act.
 *
 * Note what is *not* here: `read`. There is no viewer, so there is no unread
 * state, and the signed-out page must not grow one. Rendering a "new" mark to
 * an anonymous visitor would mean tracking them to know what new meant.
 */
export async function listPublicAnnouncements(
  limit = 50,
): Promise<PublicAnnouncement[]> {
  const rows = await db.announcement.findMany({
    where: { ...publishedFilter(new Date()), publicVisible: true },
    orderBy: { publishedAt: "desc" },
    take: Math.min(limit, 200),
    select: {
      slug: true,
      title: true,
      summary: true,
      tier: true,
      publishedAt: true,
      effectiveAt: true,
      body: true,
    },
  });

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    tier: row.tier,
    publishedAt: row.publishedAt!,
    effectiveAt: row.effectiveAt,
    body: (row.body as AnnouncementBlock[]) ?? [],
  }));
}

export async function getPublicAnnouncement(
  slug: string,
): Promise<PublicAnnouncement> {
  const row = await db.announcement.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      summary: true,
      tier: true,
      publishedAt: true,
      effectiveAt: true,
      body: true,
      publicVisible: true,
    },
  });

  if (!row?.publishedAt || row.publishedAt > new Date() || !row.publicVisible) {
    throw notFound("There is no such announcement.");
  }

  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    tier: row.tier,
    publishedAt: row.publishedAt,
    effectiveAt: row.effectiveAt,
    body: (row.body as AnnouncementBlock[]) ?? [],
  };
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export interface PublishInput {
  slug: string;
  title: string;
  summary: string;
  body: AnnouncementBlock[];
  tier: AnnouncementTier;
  linkHref?: string | null;
  linkLabel?: string | null;
  effectiveAt?: Date | null;
  /**
   * When this goes live.
   *
   * Undefined means now, which is what every existing caller means. `null` is
   * a draft. A date in the future is a scheduled publish.
   */
  publishAt?: Date | null;
  /** Whether it belongs on the signed-out changelog. Defaults to true. */
  publicVisible?: boolean;
  /** Why this tier. Recorded in the audit trail, required for CRITICAL. */
  reason?: string;
}

/**
 * Publish, schedule or save, and record who did it.
 *
 * Three refusals, all of them the promise made concrete:
 *
 * An effective date that lands before the announcement does is rejected,
 * because an announcement that arrives after the change is not notice. It is
 * a changelog entry, and the policies specifically promise the other thing.
 * The comparison is against the publish moment rather than against now, or
 * scheduling would open a hole: a notice scheduled for Friday about a change
 * effective Thursday passes a check written against today.
 *
 * A publish date in the past is rejected. It would silently backdate the
 * record of when members were told, which is the one fact this table exists to
 * be able to prove.
 *
 * CRITICAL without a stated reason is rejected. It is the only tier that
 * interrupts every member, so the operator writes down why before it goes, and
 * that sentence lands in the audit trail next to their name. A draft is exempt
 * only until it publishes: nothing has reached anybody yet, and demanding the
 * justification for an act that has not happened is how a required field turns
 * into a field people type "x" into.
 */
export async function publishAnnouncement(
  actor: StaffViewer,
  input: PublishInput,
): Promise<{ slug: string }> {
  const now = new Date();
  const isDraft = input.publishAt === null;
  const publishedAt = isDraft ? null : (input.publishAt ?? now);

  // A minute of slack. The composer sends a datetime-local value, and a form
  // submitted at 09:00:30 for a 09:00 publish is somebody publishing now, not
  // somebody trying to backdate the record.
  if (publishedAt && publishedAt.getTime() < now.getTime() - 60_000) {
    throw validationFailed(
      "That publish date has passed. Members are told when they are told, and backdating the record would make it useless. Publish now, or pick a date ahead.",
    );
  }

  if (input.effectiveAt) {
    const noticeAt = publishedAt ?? now;
    if (input.effectiveAt < noticeAt) {
      throw validationFailed(
        "That date has passed. Members are told before a change takes effect, not after. Pick a date in the future, or leave it empty.",
      );
    }
  }

  if (!isDraft && input.tier === "CRITICAL" && !input.reason?.trim()) {
    throw validationFailed(
      "A critical announcement interrupts every member. Say why, for the record.",
    );
  }

  const fields = {
    title: input.title,
    summary: input.summary,
    body: input.body,
    tier: input.tier,
    linkHref: input.linkHref ?? null,
    linkLabel: input.linkLabel ?? null,
    effectiveAt: input.effectiveAt ?? null,
    publicVisible: input.publicVisible ?? true,
    publishedAt,
  };

  const saved = await db.announcement.upsert({
    where: { slug: input.slug },
    create: { slug: input.slug, ...fields },
    update: fields,
    select: { id: true, slug: true },
  });

  // A draft writes no audit entry. The trail records what reached members, and
  // a draft reaches nobody, and logging it would bury the entries that matter
  // under every save of a half-written sentence. The entry lands when it
  // publishes, which is the act worth attributing.
  if (!isDraft) {
    await recordModerationEvent({
      actor,
      action: "ANNOUNCEMENT_PUBLISHED",
      targetType: "SITE",
      targetId: saved.id,
      reason: input.reason,
      metadata: {
        slug: saved.slug,
        tier: input.tier,
        title: input.title,
        effectiveAt: input.effectiveAt?.toISOString() ?? null,
        publishedAt: publishedAt!.toISOString(),
        scheduled: publishedAt!.getTime() > now.getTime(),
        publicVisible: fields.publicVisible,
        interrupts: DELIVERY[input.tier].banner,
      },
    });
  }

  return { slug: saved.slug };
}

/** Take it back off the board. The row and its audit entries stay. */
export async function withdrawAnnouncement(
  actor: StaffViewer,
  slug: string,
  reason?: string,
): Promise<void> {
  const row = await db.announcement.findUnique({
    where: { slug },
    select: { id: true, tier: true, title: true },
  });
  if (!row) throw notFound("There is no such announcement.");

  await db.announcement.update({
    where: { id: row.id },
    data: { publishedAt: null },
  });

  await recordModerationEvent({
    actor,
    action: "ANNOUNCEMENT_WITHDRAWN",
    targetType: "SITE",
    targetId: row.id,
    reason,
    metadata: { slug, tier: row.tier, title: row.title },
  });
}

/** What state a staff-visible row is in, derived rather than stored. */
export type AnnouncementState = "draft" | "scheduled" | "published";

export function stateOf(publishedAt: Date | null, now = new Date()): AnnouncementState {
  if (!publishedAt) return "draft";
  return publishedAt > now ? "scheduled" : "published";
}

/**
 * Everything, in every state. Staff view.
 *
 * Carries the email counts because "did the notice actually go out" is the
 * question an operator has immediately after publishing something critical,
 * and the honest answer lives in a different table.
 */
export async function listAllForStaff() {
  const rows = await db.announcement.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      ...SUMMARY_SELECT,
      createdAt: true,
      publicVisible: true,
      _count: { select: { emails: true, reads: true } },
    },
  });

  const now = new Date();
  return rows.map((row) => ({
    ...row,
    state: stateOf(row.publishedAt, now),
    emailCount: row._count.emails,
    readCount: row._count.reads,
  }));
}

/** One announcement in any state, so the composer can load it back to edit. */
export async function getForStaff(slug: string) {
  const row = await db.announcement.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      summary: true,
      body: true,
      tier: true,
      linkHref: true,
      linkLabel: true,
      publishedAt: true,
      effectiveAt: true,
      publicVisible: true,
    },
  });
  if (!row) throw notFound("There is no such announcement.");

  return {
    ...row,
    body: (row.body as AnnouncementBlock[]) ?? [],
    state: stateOf(row.publishedAt),
  };
}
