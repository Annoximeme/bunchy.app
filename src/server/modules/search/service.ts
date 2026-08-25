import { db } from "@/server/db/client";

/**
 * Search across the things this member already has.
 *
 * Deliberately not a second Discover. "Find Someone" already answers "who
 * should I meet", from a sentence about what somebody wants to do, and it is
 * good at it. What had no answer at all was the far more ordinary question:
 * *where was that*. The bunch somebody joined in March, the person they met at
 * a board games night whose name they half remember, the message with the
 * address in it. Thirty connections and a few hundred messages in, this is the
 * first thing anybody reaches for, and until now there was not so much as an
 * input to type it into.
 *
 * ## Scope, and why it is drawn here
 *
 * Everything below is bounded by what the member can already see: their own
 * connections, their own bunches and the public ones, activities they are part
 * of or could join, and messages in conversations they are in. Search is a new
 * way into existing data, never a new grant of access. The block list is
 * applied to people and messages both, because a search result is a perfectly
 * good way to put somebody in front of a person they blocked.
 *
 * ## Why `contains` and not full text
 *
 * Postgres has a real full-text search and this does not use it. At this size
 * an indexed prefix scan over a few thousand rows is instant, and the
 * behaviour people actually expect from a search box on their own data is
 * substring matching, not stemming: somebody typing "bass" wants "Bar Bassin",
 * which `to_tsquery` would not give them. When the row counts make this slow,
 * the replacement is a `tsvector` column per searchable table and no change to
 * this function's shape.
 */

export interface SearchResult {
  kind: "person" | "bunch" | "activity" | "message";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  /** ISO date, when the thing has one worth ordering or showing by. */
  at: string | null;
}

export interface SearchResults {
  query: string;
  people: SearchResult[];
  bunches: SearchResult[];
  activities: SearchResult[];
  messages: SearchResult[];
  total: number;
}

const PER_GROUP = 8;

export async function search(
  profileId: string,
  rawQuery: string,
): Promise<SearchResults> {
  const query = rawQuery.trim();
  const empty: SearchResults = {
    query,
    people: [],
    bunches: [],
    activities: [],
    messages: [],
    total: 0,
  };
  // One character matches most of the database and helps nobody.
  if (query.length < 2) return empty;

  const like = { contains: query, mode: "insensitive" as const };

  const blocks = await db.block.findMany({
    where: { OR: [{ blockerId: profileId }, { blockedId: profileId }] },
    select: { blockerId: true, blockedId: true },
  });
  const hidden = new Set(
    blocks.flatMap((b) => [b.blockerId, b.blockedId]).filter((id) => id !== profileId),
  );
  const notHidden = hidden.size > 0 ? { notIn: [...hidden] } : undefined;

  const [people, bunches, activities, messages] = await Promise.all([
    searchPeople(profileId, like, notHidden),
    searchBunches(profileId, like),
    searchActivities(profileId, like),
    searchMessages(profileId, query, like, notHidden),
  ]);

  return {
    query,
    people,
    bunches,
    activities,
    messages,
    total: people.length + bunches.length + activities.length + messages.length,
  };
}

/**
 * People this member is connected to, plus discoverable people beyond that.
 *
 * Connections first and always, because "find the person I already know" is
 * the question being asked nine times in ten, and a stranger who happens to
 * share a name should never push them down the page.
 */
async function searchPeople(
  profileId: string,
  like: { contains: string; mode: "insensitive" },
  notHidden: { notIn: string[] } | undefined,
): Promise<SearchResult[]> {
  const connections = await db.connection.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: profileId }, { addresseeId: profileId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  const connectedIds = connections
    .map((c) => (c.requesterId === profileId ? c.addresseeId : c.requesterId))
    .filter((id) => !notHidden?.notIn.includes(id));

  const matches = await db.profile.findMany({
    where: {
      id: { not: profileId, ...(notHidden ?? {}) },
      OR: [{ displayName: like }, { username: like }],
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      cityLabel: true,
      privacy: { select: { discoverable: true } },
    },
    take: PER_GROUP * 3,
  });

  const connected = new Set(connectedIds);
  // Somebody who has switched discoverability off is still findable by the
  // people they are connected to. They chose to connect; hiding an existing
  // connection from its own half of the pair helps nobody and reads as a bug.
  return matches
    .filter((m) => connected.has(m.id) || m.privacy?.discoverable !== false)
    .sort((a, b) => Number(connected.has(b.id)) - Number(connected.has(a.id)))
    .slice(0, PER_GROUP)
    .map((m) => ({
      kind: "person" as const,
      id: m.id,
      title: m.displayName,
      subtitle: connected.has(m.id)
        ? `@${m.username}, connected`
        : `@${m.username}${m.cityLabel ? `, ${m.cityLabel}` : ""}`,
      href: `/u/${m.username}`,
      at: null,
    }));
}

/** The member's own bunches, and the public ones anybody can find. */
async function searchBunches(
  profileId: string,
  like: { contains: string; mode: "insensitive" },
): Promise<SearchResult[]> {
  const rows = await db.bunch.findMany({
    where: {
      archivedAt: null,
      OR: [{ name: like }, { description: like }],
      AND: [
        {
          OR: [
            { visibility: "PUBLIC" },
            { memberships: { some: { profileId, status: "ACTIVE" } } },
          ],
        },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      cityLabel: true,
      memberships: {
        where: { profileId, status: "ACTIVE" },
        select: { profileId: true },
      },
    },
    take: PER_GROUP,
  });

  return rows.map((b) => ({
    kind: "bunch" as const,
    id: b.id,
    title: b.name,
    subtitle: b.memberships.length > 0 ? "You're a member" : (b.cityLabel ?? "Open to join"),
    href: `/bunches/${b.slug}`,
    at: null,
  }));
}

/** Anything this member organised, joined, or could still join. */
async function searchActivities(
  profileId: string,
  like: { contains: string; mode: "insensitive" },
): Promise<SearchResult[]> {
  const rows = await db.activity.findMany({
    where: {
      OR: [{ title: like }, { description: like }, { locationLabel: like }],
      AND: [
        {
          OR: [
            { organizerId: profileId },
            { participants: { some: { profileId } } },
            // Anything still open, so a search can also be how somebody finds
            // the thing they were told about but never got a link to.
            { bunchId: null, status: "SCHEDULED" },
            { bunch: { memberships: { some: { profileId, status: "ACTIVE" } } } },
          ],
        },
      ],
    },
    select: {
      id: true,
      title: true,
      startsAt: true,
      locationLabel: true,
      mode: true,
      status: true,
    },
    orderBy: { startsAt: "desc" },
    take: PER_GROUP,
  });

  return rows.map((a) => ({
    kind: "activity" as const,
    id: a.id,
    title: a.title,
    subtitle:
      a.status === "CANCELLED"
        ? "Cancelled"
        : (a.locationLabel ?? (a.mode === "ONLINE" ? "Online" : "In person")),
    href: `/activities/${a.id}`,
    at: a.startsAt.toISOString(),
  }));
}

/**
 * Messages, from conversations and bunch chats alike.
 *
 * Deleted messages are excluded rather than shown as "Message removed": a
 * search that surfaces a redacted message by its original text has undone the
 * redaction, which is the entire point of the feature that removed it.
 */
async function searchMessages(
  profileId: string,
  query: string,
  like: { contains: string; mode: "insensitive" },
  notHidden: { notIn: string[] } | undefined,
): Promise<SearchResult[]> {
  const [direct, chat] = await Promise.all([
    db.directMessage.findMany({
      where: {
        body: like,
        deletedAt: null,
        ...(notHidden ? { senderId: notHidden } : {}),
        conversation: { participants: { some: { profileId } } },
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        conversationId: true,
        sender: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PER_GROUP,
    }),
    db.bunchMessage.findMany({
      where: {
        body: like,
        deletedAt: null,
        // A moderator removed it. Search must not be the way back to it.
        moderatedAt: null,
        kind: "TEXT",
        ...(notHidden ? { authorId: notHidden } : {}),
        bunch: { memberships: { some: { profileId, status: "ACTIVE" } } },
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        bunch: { select: { slug: true, name: true } },
        author: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PER_GROUP,
    }),
  ]);

  const results: SearchResult[] = [
    ...direct.map((m) => ({
      kind: "message" as const,
      id: m.id,
      title: excerpt(m.body, query),
      subtitle: `${m.sender.displayName}, direct message`,
      href: `/messages/${m.conversationId}`,
      at: m.createdAt.toISOString(),
    })),
    ...chat.map((m) => ({
      kind: "message" as const,
      id: m.id,
      title: excerpt(m.body, query),
      subtitle: `${m.author?.displayName ?? "Someone"} in ${m.bunch.name}`,
      href: `/bunches/${m.bunch.slug}`,
      at: m.createdAt.toISOString(),
    })),
  ];

  return results
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""))
    .slice(0, PER_GROUP);
}

/**
 * A window of the message around the match.
 *
 * A four-thousand-character message rendered whole in a result list is not a
 * result, it is the message. The window is generous enough to carry the
 * sentence the match is in, and the ellipses are honest about the trim.
 */
export function excerpt(body: string, query: string, radius = 60): string {
  const at = body.toLowerCase().indexOf(query.toLowerCase());
  if (at === -1) return body.slice(0, radius * 2);

  const start = Math.max(0, at - radius);
  const end = Math.min(body.length, at + query.length + radius);
  return `${start > 0 ? "…" : ""}${body.slice(start, end)}${end < body.length ? "…" : ""}`;
}
