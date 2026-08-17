import { db } from "@/server/db/client";
import { notFound, validationFailed } from "@/server/errors";
import { recordModerationEvent } from "@/server/modules/admin/audit";
import type { StaffViewer } from "@/server/modules/admin/guard";
import type { AnnouncementTier } from "@/generated/prisma/enums";
import type { BuzzBlock } from "@/server/modules/buzz/service";

/**
 * Announcements — the things the operator did that affect you.
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
 * operator acting on you — a policy change, an outage, the site going down on
 * Sunday. "We shipped a thing, come back and look" is the other kind, and the
 * moment it is pushed the sentence on /about stops being true.
 *
 * That distinction is not left to whoever writes the copy. `DELIVERY` maps the
 * tier to the route, `CRITICAL` is the only tier that interrupts anybody, and
 * `publish` refuses to mark something CRITICAL without a reason recorded in the
 * audit trail. Choosing the wrong box is a decision somebody has to defend
 * later, not a checkbox.
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
  body: BuzzBlock[];
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

/** Everything published, newest first. The permanent record. */
export async function listAnnouncements(
  profileId: string,
): Promise<AnnouncementSummary[]> {
  const [rows, read] = await Promise.all([
    db.announcement.findMany({
      where: { publishedAt: { not: null, lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      select: SUMMARY_SELECT,
    }),
    readSlugs(profileId),
  ]);
  return rows.map((row) => toSummary(row, read));
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
  return { ...toSummary(row, read), body: (row.body as BuzzBlock[]) ?? [] };
}

/**
 * What to interrupt this member with, if anything.
 *
 * Only CRITICAL, only unread, oldest first — so somebody who has been away
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
      publishedAt: { not: null, lte: new Date() },
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
      publishedAt: { not: null, lte: new Date() },
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

export interface PublishInput {
  slug: string;
  title: string;
  summary: string;
  body: BuzzBlock[];
  tier: AnnouncementTier;
  linkHref?: string | null;
  linkLabel?: string | null;
  effectiveAt?: Date | null;
  /** Why this tier. Recorded in the audit trail, required for CRITICAL. */
  reason?: string;
}

/**
 * Publish, and record who did it.
 *
 * Two refusals, both of them the promise made concrete:
 *
 * An effective date in the past is rejected, because an announcement that
 * arrives after the change is not notice — it is a changelog entry, and the
 * policies specifically promise the other thing.
 *
 * CRITICAL without a stated reason is rejected. It is the only tier that
 * interrupts every member, so the operator writes down why before it goes, and
 * that sentence lands in the audit trail next to their name.
 */
export async function publishAnnouncement(
  actor: StaffViewer,
  input: PublishInput,
): Promise<{ slug: string }> {
  const now = new Date();

  if (input.effectiveAt && input.effectiveAt < now) {
    throw validationFailed(
      "That date has passed. Members are told before a change takes effect, not after — pick a date in the future or leave it empty.",
    );
  }

  if (input.tier === "CRITICAL" && !input.reason?.trim()) {
    throw validationFailed(
      "A critical announcement interrupts every member. Say why, for the record.",
    );
  }

  const saved = await db.announcement.upsert({
    where: { slug: input.slug },
    create: {
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      body: input.body,
      tier: input.tier,
      linkHref: input.linkHref ?? null,
      linkLabel: input.linkLabel ?? null,
      effectiveAt: input.effectiveAt ?? null,
      publishedAt: now,
    },
    update: {
      title: input.title,
      summary: input.summary,
      body: input.body,
      tier: input.tier,
      linkHref: input.linkHref ?? null,
      linkLabel: input.linkLabel ?? null,
      effectiveAt: input.effectiveAt ?? null,
      publishedAt: now,
    },
    select: { id: true, slug: true },
  });

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
      interrupts: DELIVERY[input.tier].banner,
    },
  });

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

/** Everything, published or not. Staff view. */
export async function listAllForStaff() {
  return db.announcement.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: { ...SUMMARY_SELECT, createdAt: true },
  });
}
