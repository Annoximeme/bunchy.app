import { db } from "@/server/db/client";
import { notFound } from "@/server/errors";
import { MIN_CLUSTER } from "@/server/modules/availability/service";
import type { BuzzCategory } from "@/generated/prisma/enums";

/**
 * Bunchy Buzz — the reason to get in touch, not the thing to consume.
 *
 * Every post carries the action it exists to produce. That is a column, not a
 * guideline: `actionLabel` and `actionQuery` are non-null, so a post that ends
 * in nothing but reading cannot be written.
 *
 * ## The numbers on this page are real or absent
 *
 * There is no "2.4k people interested" here, and that is deliberate rather than
 * unfinished. Bunchy has not launched; every engagement figure on this surface
 * would have to be invented, on a product whose landing page labels its own
 * example faces as examples and whose About page says in as many words that
 * there are no member numbers to quote.
 *
 * So the two counts this module reports are counted from rows:
 *
 *   `interested`  members who pressed "I'm in" on that post.
 *   `pulse`       members whose availability status is live right now.
 *
 * Both are suppressed below `MIN_CLUSTER`, the same floor the availability
 * clusters use, and for the same two reasons: a count of one is a name, and a
 * count of two announced as activity is a lie about a room that is empty. Below
 * the floor the UI shows the action and no number, which is the honest shape of
 * a product on its first day.
 */

/** Body blocks. Rendered to React elements, never to HTML. */
export type BuzzBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[] };

export interface BuzzCard {
  slug: string;
  eyebrow: string;
  headline: string;
  standfirst: string;
  category: BuzzCategory;
  isPick: boolean;
  actionLabel: string;
  actionQuery: string;
  /** Null when nobody has pressed it yet, or when too few have to say so. */
  interested: number | null;
  /** Whether the viewer is one of them. */
  viewerIsIn: boolean;
}

export interface BuzzArticle extends BuzzCard {
  body: BuzzBlock[];
  /** What the post is about, so the closing block can count real members. */
  interestSlugs: string[];
  publishedAt: Date;
  /** Other posts about the same interests. Never "related articles" — these
   *  carry their own actions, so the end of a post is another way in. */
  alsoOn: BuzzCard[];
}

const CARD_SELECT = {
  slug: true,
  eyebrow: true,
  headline: true,
  standfirst: true,
  category: true,
  isPick: true,
  actionLabel: true,
  actionQuery: true,
  interestSlugs: true,
  publishedAt: true,
  _count: { select: { signals: true } },
} as const;

type CardRow = {
  slug: string;
  eyebrow: string;
  headline: string;
  standfirst: string;
  category: BuzzCategory;
  isPick: boolean;
  actionLabel: string;
  actionQuery: string;
  _count: { signals: number };
};

function toCard(row: CardRow, viewerSignals: Set<string>): BuzzCard {
  return {
    slug: row.slug,
    eyebrow: row.eyebrow,
    headline: row.headline,
    standfirst: row.standfirst,
    category: row.category,
    isPick: row.isPick,
    actionLabel: row.actionLabel,
    actionQuery: row.actionQuery,
    // Absent rather than zero. "0 interested" is worse than no number: it is a
    // number that argues against pressing the button.
    interested: row._count.signals >= MIN_CLUSTER ? row._count.signals : null,
    viewerIsIn: viewerSignals.has(row.slug),
  };
}

async function viewerSignalSlugs(profileId: string): Promise<Set<string>> {
  const rows = await db.buzzSignal.findMany({
    where: { profileId },
    select: { post: { select: { slug: true } } },
  });
  return new Set(rows.map((r) => r.post.slug));
}

/**
 * The board.
 *
 * Finite and grouped, never a feed. `take` is a real limit rather than a page
 * size with a cursor behind it: the guardrail on this section is that it ends,
 * so that leaving it is the obvious next move.
 */
export async function listBuzz(
  profileId: string,
  options: { category?: BuzzCategory; picksOnly?: boolean; take?: number } = {},
): Promise<BuzzCard[]> {
  const [rows, signals] = await Promise.all([
    db.buzzPost.findMany({
      where: {
        publishedAt: { not: null, lte: new Date() },
        ...(options.category ? { category: options.category } : {}),
        ...(options.picksOnly ? { isPick: true } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: options.take ?? 24,
      select: CARD_SELECT,
    }),
    viewerSignalSlugs(profileId),
  ]);

  return rows.map((row) => toCard(row, signals));
}

export async function getBuzzPost(
  slug: string,
  profileId: string,
): Promise<BuzzArticle> {
  const post = await db.buzzPost.findUnique({
    where: { slug },
    select: { ...CARD_SELECT, body: true },
  });

  if (!post || !post.publishedAt || post.publishedAt > new Date()) {
    throw notFound("That story is not here.");
  }

  const signals = await viewerSignalSlugs(profileId);

  const alsoOn = post.interestSlugs.length
    ? await db.buzzPost.findMany({
        where: {
          slug: { not: slug },
          publishedAt: { not: null, lte: new Date() },
          interestSlugs: { hasSome: post.interestSlugs },
        },
        orderBy: { publishedAt: "desc" },
        take: 2,
        select: CARD_SELECT,
      })
    : [];

  return {
    ...toCard(post, signals),
    body: (post.body as BuzzBlock[]) ?? [],
    interestSlugs: post.interestSlugs,
    publishedAt: post.publishedAt,
    alsoOn: alsoOn.map((row) => toCard(row, signals)),
  };
}

/** "I'm in", or taking it back. Returns the state the button should now show. */
export async function toggleBuzzSignal(
  slug: string,
  profileId: string,
): Promise<{ viewerIsIn: boolean; interested: number | null }> {
  const post = await db.buzzPost.findUnique({
    where: { slug },
    select: { id: true, publishedAt: true },
  });
  if (!post || !post.publishedAt) throw notFound("That story is not here.");

  const existing = await db.buzzSignal.findUnique({
    where: { postId_profileId: { postId: post.id, profileId } },
    select: { postId: true },
  });

  if (existing) {
    await db.buzzSignal.delete({
      where: { postId_profileId: { postId: post.id, profileId } },
    });
  } else {
    await db.buzzSignal.create({ data: { postId: post.id, profileId } });
  }

  const count = await db.buzzSignal.count({ where: { postId: post.id } });

  return {
    viewerIsIn: !existing,
    interested: count >= MIN_CLUSTER ? count : null,
  };
}

/**
 * Who is actually around, right now.
 *
 * The cold-start problem is not solved by claiming a room is busy. It is solved
 * by telling the truth about it quickly: these are live availability rows,
 * counted at request time, expiring on their own. Below `MIN_CLUSTER` a lane is
 * dropped entirely rather than shown as a small number, so the bar is either
 * worth looking at or not there.
 */
export interface PulseLane {
  label: string;
  count: number;
  href: string;
}

const LANES: Array<{ label: string; kinds: string[]; href: string }> = [
  {
    label: "Gaming",
    kinds: ["UP_FOR_GAMING"],
    href: "/now?horizon=now",
  },
  {
    label: "Up for something tonight",
    kinds: ["FREE_TONIGHT", "LOOKING_FOR_SOMETHING", "UP_FOR_SPONTANEOUS"],
    href: "/now?horizon=tonight",
  },
  {
    label: "Free right now",
    kinds: ["FREE_NOW", "LOOKING_FOR_PEOPLE"],
    href: "/now?horizon=now",
  },
];

export async function tonightPulse(): Promise<PulseLane[]> {
  const now = new Date();
  const rows = await db.availabilityStatus.groupBy({
    by: ["kind"],
    where: { expiresAt: { gt: now } },
    _count: { _all: true },
  });

  const byKind = new Map(rows.map((r) => [String(r.kind), r._count._all]));

  return LANES.map((lane) => ({
    label: lane.label,
    count: lane.kinds.reduce((sum, kind) => sum + (byKind.get(kind) ?? 0), 0),
    href: lane.href,
  })).filter((lane) => lane.count >= MIN_CLUSTER);
}

/**
 * How many members here share a post's interests.
 *
 * Also a real count, also floored. It answers "who could I do this with" with a
 * number that came from the database rather than from a marketing deck.
 */
export async function interestedNearby(
  interestSlugs: string[],
): Promise<number | null> {
  if (interestSlugs.length === 0) return null;

  const count = await db.userInterest.count({
    where: { interest: { slug: { in: interestSlugs } } },
  });

  return count >= MIN_CLUSTER ? count : null;
}
