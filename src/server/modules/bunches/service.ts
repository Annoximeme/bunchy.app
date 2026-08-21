import { randomBytes } from "node:crypto";
import { db } from "@/server/db/client";
import { conflict, forbidden, notFound } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import { INTEREST_BY_SLUG, slugifyInterest } from "@/lib/interests";
import { findPlace } from "@/server/modules/geo/gazetteer";
import { snapToGrid } from "@/server/modules/geo/precision";
import { notify } from "@/server/modules/notifications/service";
import { markRecommendationActed } from "@/server/modules/matching/engine";
import type {
  BunchCreateInput,
  BunchUpdateInput,
} from "@/server/modules/bunches/schemas";
import type { BunchRole } from "@/generated/prisma/enums";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";

/**
 * Bunches: creation, membership and moderation.
 *
 * A bunch is capped at 12 members. That is the product, not a placeholder,
 * past roughly a dozen people a group stops being somewhere you're known and
 * becomes somewhere you post. The cap is enforced on every path that can add a
 * member, including invite acceptance and join approval.
 */

async function uniqueSlug(name: string): Promise<string> {
  const base = slugifyInterest(name) || "bunch";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate =
      attempt === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
    const taken = await db.bunch.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${randomBytes(4).toString("hex")}`;
}

/** Resolves interest slugs to rows, creating catalog entries on first use. */
async function resolveInterestIds(slugs: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const slug of slugs) {
    const existing = await db.interest.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const seed = INTEREST_BY_SLUG.get(slug);
    if (!seed) continue;
    const created = await db.interest.create({
      data: { slug: seed.slug, label: seed.label, category: seed.category },
      select: { id: true },
    });
    ids.push(created.id);
  }
  return ids;
}

export async function createBunch(
  profileId: string,
  input: BunchCreateInput,
): Promise<{ id: string; slug: string }> {
  await consume("bunchCreate", profileId);

  const slug = await uniqueSlug(input.name);
  const interestIds = await resolveInterestIds(input.interestSlugs);
  if (interestIds.length === 0) {
    throw conflict("Pick at least one interest we recognise.");
  }

  const place =
    input.cityLabel && input.countryCode
      ? findPlace(input.cityLabel, input.countryCode)
      : undefined;
  const approx = place ? snapToGrid(place.lat, place.lng) : null;

  const bunch = await db.bunch.create({
    data: {
      slug,
      name: input.name,
      description: input.description,
      type: input.type,
      visibility: input.visibility,
      maxMembers: input.maxMembers,
      rules: input.rules || null,
      imageUrl: input.imageUrl || null,
      cityLabel: place?.cityLabel ?? input.cityLabel ?? null,
      regionLabel: place?.regionLabel ?? null,
      countryCode: place?.countryCode ?? input.countryCode ?? null,
      approxLat: approx?.approxLat ?? null,
      approxLng: approx?.approxLng ?? null,
      createdById: profileId,
      interests: { create: interestIds.map((interestId) => ({ interestId })) },
      memberships: {
        create: { profileId, role: "OWNER", status: "ACTIVE" },
      },
      messages: {
        create: {
          kind: "SYSTEM",
          body: `${input.name} was created.`,
        },
      },
    },
    select: { id: true, slug: true },
  });

  track({
    name: ANALYTICS_EVENTS.BUNCH_CREATED,
    profileId,
    properties: { bunchId: bunch.id, type: input.type, visibility: input.visibility },
  });

  return bunch;
}

async function requireMembership(
  bunchId: string,
  profileId: string,
  roles?: BunchRole[],
) {
  const membership = await db.bunchMembership.findUnique({
    where: { bunchId_profileId: { bunchId, profileId } },
    select: { role: true, status: true },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw forbidden("You're not a member of this bunch.");
  }
  if (roles && !roles.includes(membership.role)) {
    throw forbidden("Only moderators can do that.");
  }
  return membership;
}

async function activeMemberCount(bunchId: string): Promise<number> {
  return db.bunchMembership.count({
    where: { bunchId, status: "ACTIVE" },
  });
}

async function assertRoom(bunchId: string, maxMembers: number): Promise<void> {
  if ((await activeMemberCount(bunchId)) >= maxMembers) {
    throw conflict("This bunch is full.");
  }
}

// --- Joining ----------------------------------------------------------------

/**
 * Public bunches take join requests a moderator approves. Approval is not
 * bureaucracy: it is the mechanism that lets a small group stay a group it
 * chose, which is the whole promise of a bunch.
 */
export async function requestToJoin(
  bunchId: string,
  profileId: string,
): Promise<{ status: string }> {
  const bunch = await db.bunch.findUnique({
    where: { id: bunchId },
    select: { id: true, name: true, visibility: true, maxMembers: true, archivedAt: true },
  });
  if (!bunch || bunch.archivedAt) throw notFound("That bunch no longer exists.");
  if (bunch.visibility === "PRIVATE") {
    throw forbidden("This bunch is invite-only.");
  }

  const existing = await db.bunchMembership.findUnique({
    where: { bunchId_profileId: { bunchId, profileId } },
    select: { status: true },
  });

  if (existing?.status === "ACTIVE") throw conflict("You're already in this bunch.");
  if (existing?.status === "REQUESTED") throw conflict("Your request is already pending.");
  if (existing?.status === "REMOVED") {
    throw forbidden("You can't rejoin this bunch.");
  }

  if (existing?.status === "INVITED") {
    await assertRoom(bunchId, bunch.maxMembers);
    await acceptInvite(bunchId, profileId);
    return { status: "ACTIVE" };
  }

  await assertRoom(bunchId, bunch.maxMembers);

  await db.bunchMembership.upsert({
    where: { bunchId_profileId: { bunchId, profileId } },
    create: { bunchId, profileId, status: "REQUESTED" },
    update: { status: "REQUESTED" },
  });

  await markRecommendationActed(profileId, "BUNCH", bunchId);
  track({
    name: ANALYTICS_EVENTS.BUNCH_JOIN_REQUESTED,
    profileId,
    properties: { bunchId },
  });

  const moderators = await db.bunchMembership.findMany({
    where: { bunchId, status: "ACTIVE", role: { in: ["OWNER", "MODERATOR"] } },
    select: { profileId: true },
  });
  const requester = await db.profile.findUnique({
    where: { id: profileId },
    select: { displayName: true },
  });

  await Promise.all(
    moderators.map((m) =>
      notify({
        profileId: m.profileId,
        actorProfileId: profileId,
        type: "BUNCH_JOIN_REQUEST",
        title: `${requester?.displayName ?? "Someone"} asked to join ${bunch.name}`,
        linkPath: `/bunches/${bunchId}/members`,
        groupKey: `bunch-join:${bunchId}`,
      }),
    ),
  );

  return { status: "REQUESTED" };
}

export async function approveJoinRequest(
  bunchId: string,
  moderatorProfileId: string,
  targetProfileId: string,
): Promise<void> {
  await requireMembership(bunchId, moderatorProfileId, ["OWNER", "MODERATOR"]);

  const bunch = await db.bunch.findUniqueOrThrow({
    where: { id: bunchId },
    select: { name: true, maxMembers: true },
  });
  await assertRoom(bunchId, bunch.maxMembers);

  const membership = await db.bunchMembership.findUnique({
    where: { bunchId_profileId: { bunchId, profileId: targetProfileId } },
    select: { status: true },
  });
  if (membership?.status !== "REQUESTED") {
    throw conflict("There's no pending request from that person.");
  }

  const profile = await db.profile.findUniqueOrThrow({
    where: { id: targetProfileId },
    select: { displayName: true },
  });

  await db.$transaction([
    db.bunchMembership.update({
      where: { bunchId_profileId: { bunchId, profileId: targetProfileId } },
      data: { status: "ACTIVE", joinedAt: new Date() },
    }),
    db.bunchMessage.create({
      data: {
        bunchId,
        kind: "SYSTEM",
        body: `${profile.displayName} joined the bunch.`,
      },
    }),
  ]);

  track({
    name: ANALYTICS_EVENTS.BUNCH_JOINED,
    profileId: targetProfileId,
    properties: { bunchId, via: "approved" },
  });

  await notify({
    profileId: targetProfileId,
    type: "BUNCH_INVITE",
    title: `You're in, welcome to ${bunch.name}`,
    linkPath: `/bunches/${bunchId}`,
  });
}

export async function declineJoinRequest(
  bunchId: string,
  moderatorProfileId: string,
  targetProfileId: string,
): Promise<void> {
  await requireMembership(bunchId, moderatorProfileId, ["OWNER", "MODERATOR"]);
  await db.bunchMembership.deleteMany({
    where: { bunchId, profileId: targetProfileId, status: "REQUESTED" },
  });
}

export async function inviteToBunch(
  bunchId: string,
  inviterProfileId: string,
  targetProfileId: string,
): Promise<void> {
  await requireMembership(bunchId, inviterProfileId);

  const bunch = await db.bunch.findUniqueOrThrow({
    where: { id: bunchId },
    select: { name: true, maxMembers: true },
  });
  await assertRoom(bunchId, bunch.maxMembers);

  const target = await db.profile.findUnique({
    where: { id: targetProfileId },
    select: {
      id: true,
      privacy: { select: { invitableToBunches: true } },
    },
  });
  if (!target) throw notFound("We couldn't find that profile.");
  if (target.privacy?.invitableToBunches === false) {
    throw forbidden("This person isn't accepting bunch invites.");
  }

  const existing = await db.bunchMembership.findUnique({
    where: { bunchId_profileId: { bunchId, profileId: targetProfileId } },
    select: { status: true },
  });
  if (existing?.status === "ACTIVE") throw conflict("They're already a member.");
  if (existing?.status === "REMOVED") {
    throw forbidden("That person was removed from this bunch.");
  }

  await db.bunchMembership.upsert({
    where: { bunchId_profileId: { bunchId, profileId: targetProfileId } },
    create: { bunchId, profileId: targetProfileId, status: "INVITED" },
    update: { status: "INVITED" },
  });

  await notify({
    profileId: targetProfileId,
    actorProfileId: inviterProfileId,
    type: "BUNCH_INVITE",
    title: `You've been invited to ${bunch.name}`,
    linkPath: `/bunches/${bunchId}`,
  });
}

export async function acceptInvite(
  bunchId: string,
  profileId: string,
): Promise<void> {
  const membership = await db.bunchMembership.findUnique({
    where: { bunchId_profileId: { bunchId, profileId } },
    select: { status: true },
  });
  if (membership?.status !== "INVITED") {
    throw notFound("That invite is no longer available.");
  }

  const bunch = await db.bunch.findUniqueOrThrow({
    where: { id: bunchId },
    select: { maxMembers: true },
  });
  await assertRoom(bunchId, bunch.maxMembers);

  const profile = await db.profile.findUniqueOrThrow({
    where: { id: profileId },
    select: { displayName: true },
  });

  // A bunch proposed by staff is created with every member INVITED and nobody
  // in it, so the first person through the door takes ownership. Without this
  // such a bunch would have no owner and nobody able to moderate it.
  const hasOwner =
    (await db.bunchMembership.count({
      where: { bunchId, role: "OWNER", status: "ACTIVE" },
    })) > 0;

  await db.$transaction([
    db.bunchMembership.update({
      where: { bunchId_profileId: { bunchId, profileId } },
      data: {
        status: "ACTIVE",
        joinedAt: new Date(),
        ...(hasOwner ? {} : { role: "OWNER" as const }),
      },
    }),
    db.bunchMessage.create({
      data: {
        bunchId,
        kind: "SYSTEM",
        body: `${profile.displayName} joined the bunch.`,
      },
    }),
  ]);

  track({
    name: ANALYTICS_EVENTS.BUNCH_JOINED,
    profileId,
    properties: { bunchId, via: "invite" },
  });
}

export async function leaveBunch(
  bunchId: string,
  profileId: string,
): Promise<void> {
  const membership = await db.bunchMembership.findUnique({
    where: { bunchId_profileId: { bunchId, profileId } },
    select: { role: true, status: true },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw conflict("You're not in this bunch.");
  }

  if (membership.role === "OWNER") {
    // Hand the bunch to the longest-standing moderator, then any member,
    // rather than leaving it ownerless.
    const successor = await db.bunchMembership.findFirst({
      where: {
        bunchId,
        status: "ACTIVE",
        profileId: { not: profileId },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      select: { profileId: true },
    });

    if (successor) {
      await db.bunchMembership.update({
        where: { bunchId_profileId: { bunchId, profileId: successor.profileId } },
        data: { role: "OWNER" },
      });
    } else {
      // Last person out archives the bunch.
      await db.bunch.update({
        where: { id: bunchId },
        data: { archivedAt: new Date() },
      });
    }
  }

  const profile = await db.profile.findUniqueOrThrow({
    where: { id: profileId },
    select: { displayName: true },
  });

  await db.$transaction([
    db.bunchMembership.update({
      where: { bunchId_profileId: { bunchId, profileId } },
      data: { status: "LEFT", role: "MEMBER" },
    }),
    db.bunchMessage.create({
      data: {
        bunchId,
        kind: "SYSTEM",
        body: `${profile.displayName} left the bunch.`,
      },
    }),
  ]);

  track({ name: ANALYTICS_EVENTS.BUNCH_LEFT, profileId, properties: { bunchId } });
}

export async function removeMember(
  bunchId: string,
  moderatorProfileId: string,
  targetProfileId: string,
): Promise<void> {
  const moderator = await requireMembership(bunchId, moderatorProfileId, [
    "OWNER",
    "MODERATOR",
  ]);
  if (moderatorProfileId === targetProfileId) {
    throw conflict("Use leave instead.");
  }

  const target = await db.bunchMembership.findUnique({
    where: { bunchId_profileId: { bunchId, profileId: targetProfileId } },
    select: { role: true },
  });
  if (!target) throw notFound("They're not in this bunch.");
  if (target.role === "OWNER") throw forbidden("The owner can't be removed.");
  if (target.role === "MODERATOR" && moderator.role !== "OWNER") {
    throw forbidden("Only the owner can remove a moderator.");
  }

  await db.bunchMembership.update({
    where: { bunchId_profileId: { bunchId, profileId: targetProfileId } },
    data: { status: "REMOVED", role: "MEMBER" },
  });
}

export async function setMemberRole(
  bunchId: string,
  ownerProfileId: string,
  targetProfileId: string,
  role: "MEMBER" | "MODERATOR",
): Promise<void> {
  await requireMembership(bunchId, ownerProfileId, ["OWNER"]);
  await db.bunchMembership.update({
    where: { bunchId_profileId: { bunchId, profileId: targetProfileId } },
    data: { role },
  });
}

export async function updateBunch(
  bunchId: string,
  profileId: string,
  input: BunchUpdateInput,
): Promise<void> {
  await requireMembership(bunchId, profileId, ["OWNER", "MODERATOR"]);

  const place =
    input.cityLabel && input.countryCode
      ? findPlace(input.cityLabel, input.countryCode)
      : undefined;
  const approx = place ? snapToGrid(place.lat, place.lng) : null;

  await db.bunch.update({
    where: { id: bunchId },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.rules !== undefined ? { rules: input.rules || null } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl || null } : {}),
      ...(input.maxMembers ? { maxMembers: input.maxMembers } : {}),
      ...(place
        ? {
            cityLabel: place.cityLabel,
            regionLabel: place.regionLabel,
            countryCode: place.countryCode,
            approxLat: approx?.approxLat ?? null,
            approxLng: approx?.approxLng ?? null,
          }
        : {}),
    },
  });

  if (input.interestSlugs) {
    const interestIds = await resolveInterestIds(input.interestSlugs);
    await db.$transaction([
      db.bunchInterest.deleteMany({ where: { bunchId } }),
      db.bunchInterest.createMany({
        data: interestIds.map((interestId) => ({ bunchId, interestId })),
      }),
    ]);
  }
}

// --- Reads ------------------------------------------------------------------

export async function listMyBunches(profileId: string) {
  const rows = await db.bunchMembership.findMany({
    where: { profileId, status: { in: ["ACTIVE", "INVITED", "REQUESTED"] } },
    select: {
      role: true,
      status: true,
      lastReadAt: true,
      bunch: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          imageUrl: true,
          type: true,
          cityLabel: true,
          maxMembers: true,
          interests: { select: { interest: { select: { label: true } } } },
          _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
          // The soonest evening, so the card can lead with what is happening
          // rather than with how many seats are spare. One row per bunch.
          activities: {
            where: { status: "SCHEDULED", startsAt: { gte: new Date() } },
            orderBy: { startsAt: "asc" },
            take: 1,
            select: { startsAt: true },
          },
          // And whichever standing arrangement comes round next.
          series: {
            where: { endedAt: null },
            orderBy: { nextAt: "asc" },
            take: 1,
            select: { nextAt: true },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const unreadCounts = await Promise.all(
    rows.map(async (row) =>
      row.status === "ACTIVE"
        ? db.bunchMessage.count({
            where: {
              bunchId: row.bunch.id,
              kind: "TEXT",
              deletedAt: null,
              authorId: { not: profileId },
              ...(row.lastReadAt ? { createdAt: { gt: row.lastReadAt } } : {}),
            },
          })
        : 0,
    ),
  );

  return rows.map((row, index) => ({
    id: row.bunch.id,
    slug: row.bunch.slug,
    name: row.bunch.name,
    description: row.bunch.description,
    imageUrl: row.bunch.imageUrl,
    type: row.bunch.type,
    locationLabel: row.bunch.cityLabel,
    memberCount: row.bunch._count.memberships,
    maxMembers: row.bunch.maxMembers,
    nextActivityAt: row.bunch.activities[0]?.startsAt ?? null,
    nextSeriesAt: row.bunch.series[0]?.nextAt ?? null,
    interests: row.bunch.interests.map((i) => i.interest.label),
    role: row.role,
    membershipStatus: row.status,
    unreadCount: unreadCounts[index] ?? 0,
  }));
}

export async function getBunch(bunchIdOrSlug: string, viewerProfileId: string) {
  const bunch = await db.bunch.findFirst({
    where: {
      OR: [{ id: bunchIdOrSlug }, { slug: bunchIdOrSlug }],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      imageUrl: true,
      type: true,
      visibility: true,
      cityLabel: true,
      regionLabel: true,
      maxMembers: true,
      rules: true,
      activityScore: true,
      createdAt: true,
      archivedAt: true,
      interests: {
        select: { interest: { select: { slug: true, label: true } } },
      },
      memberships: {
        where: { status: { in: ["ACTIVE", "REQUESTED"] } },
        select: {
          role: true,
          status: true,
          joinedAt: true,
          profile: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
    },
  });

  if (!bunch || bunch.archivedAt) throw notFound("That bunch no longer exists.");

  const viewerMembership = await db.bunchMembership.findUnique({
    where: { bunchId_profileId: { bunchId: bunch.id, profileId: viewerProfileId } },
    select: { role: true, status: true },
  });

  const isMember = viewerMembership?.status === "ACTIVE";

  // A private bunch shows nothing beyond its name to non-members, not its
  // description, not who is in it.
  if (bunch.visibility === "PRIVATE" && !isMember && viewerMembership?.status !== "INVITED") {
    throw notFound("That bunch no longer exists.");
  }

  return {
    id: bunch.id,
    slug: bunch.slug,
    name: bunch.name,
    description: bunch.description,
    imageUrl: bunch.imageUrl,
    type: bunch.type,
    visibility: bunch.visibility,
    locationLabel: bunch.cityLabel ?? bunch.regionLabel,
    memberCount: bunch._count.memberships,
    maxMembers: bunch.maxMembers,
    rules: bunch.rules,
    createdAt: bunch.createdAt.toISOString(),
    interests: bunch.interests.map((i) => i.interest.label),
    interestSlugs: bunch.interests.map((i) => i.interest.slug),
    viewerRole: viewerMembership?.role ?? null,
    viewerStatus: viewerMembership?.status ?? null,
    isMember,
    // Only members see the member list.
    members: isMember
      ? bunch.memberships
          .filter((m) => m.status === "ACTIVE")
          .map((m) => ({ ...m.profile, role: m.role }))
      : [],
    joinRequests:
      viewerMembership?.role === "OWNER" || viewerMembership?.role === "MODERATOR"
        ? bunch.memberships
            .filter((m) => m.status === "REQUESTED")
            .map((m) => m.profile)
        : [],
  };
}

/**
 * Browsable public bunches. Distinct from `recommendBunches`, which ranks by
 * compatibility, this is the plain "show me what exists" list with a search box.
 */
export async function browseBunches(
  viewerProfileId: string,
  query?: string,
  limit = 24,
) {
  const bunches = await db.bunch.findMany({
    where: {
      visibility: "PUBLIC",
      archivedAt: null,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { description: { contains: query, mode: "insensitive" as const } },
              {
                interests: {
                  some: {
                    interest: {
                      label: { contains: query, mode: "insensitive" as const },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      imageUrl: true,
      type: true,
      cityLabel: true,
      maxMembers: true,
      interests: { select: { interest: { select: { label: true } } } },
      memberships: {
        where: { profileId: viewerProfileId },
        select: { status: true },
      },
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
    },
    orderBy: [{ activityScore: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return bunches.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    imageUrl: c.imageUrl,
    type: c.type,
    locationLabel: c.cityLabel,
    memberCount: c._count.memberships,
    maxMembers: c.maxMembers,
    interests: c.interests.map((i) => i.interest.label),
    membershipStatus: c.memberships[0]?.status ?? null,
  }));
}
