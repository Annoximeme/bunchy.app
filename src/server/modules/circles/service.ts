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
  CircleCreateInput,
  CircleUpdateInput,
} from "@/server/modules/circles/schemas";
import type { CircleRole } from "@/generated/prisma/enums";

/**
 * Circles: creation, membership and moderation.
 *
 * A circle is capped at 12 members. That is the product, not a placeholder —
 * past roughly a dozen people a group stops being somewhere you're known and
 * becomes somewhere you post. The cap is enforced on every path that can add a
 * member, including invite acceptance and join approval.
 */

async function uniqueSlug(name: string): Promise<string> {
  const base = slugifyInterest(name) || "circle";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate =
      attempt === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
    const taken = await db.circle.findUnique({
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

export async function createCircle(
  profileId: string,
  input: CircleCreateInput,
): Promise<{ id: string; slug: string }> {
  await consume("circleCreate", profileId);

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

  const circle = await db.circle.create({
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

  return circle;
}

async function requireMembership(
  circleId: string,
  profileId: string,
  roles?: CircleRole[],
) {
  const membership = await db.circleMembership.findUnique({
    where: { circleId_profileId: { circleId, profileId } },
    select: { role: true, status: true },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw forbidden("You're not a member of this circle.");
  }
  if (roles && !roles.includes(membership.role)) {
    throw forbidden("Only moderators can do that.");
  }
  return membership;
}

async function activeMemberCount(circleId: string): Promise<number> {
  return db.circleMembership.count({
    where: { circleId, status: "ACTIVE" },
  });
}

async function assertRoom(circleId: string, maxMembers: number): Promise<void> {
  if ((await activeMemberCount(circleId)) >= maxMembers) {
    throw conflict("This circle is full.");
  }
}

// --- Joining ----------------------------------------------------------------

/**
 * Public circles take join requests a moderator approves. Approval is not
 * bureaucracy: it is the mechanism that lets a small group stay a group it
 * chose, which is the whole promise of a circle.
 */
export async function requestToJoin(
  circleId: string,
  profileId: string,
): Promise<{ status: string }> {
  const circle = await db.circle.findUnique({
    where: { id: circleId },
    select: { id: true, name: true, visibility: true, maxMembers: true, archivedAt: true },
  });
  if (!circle || circle.archivedAt) throw notFound("That circle no longer exists.");
  if (circle.visibility === "PRIVATE") {
    throw forbidden("This circle is invite-only.");
  }

  const existing = await db.circleMembership.findUnique({
    where: { circleId_profileId: { circleId, profileId } },
    select: { status: true },
  });

  if (existing?.status === "ACTIVE") throw conflict("You're already in this circle.");
  if (existing?.status === "REQUESTED") throw conflict("Your request is already pending.");
  if (existing?.status === "REMOVED") {
    throw forbidden("You can't rejoin this circle.");
  }

  if (existing?.status === "INVITED") {
    await assertRoom(circleId, circle.maxMembers);
    await acceptInvite(circleId, profileId);
    return { status: "ACTIVE" };
  }

  await assertRoom(circleId, circle.maxMembers);

  await db.circleMembership.upsert({
    where: { circleId_profileId: { circleId, profileId } },
    create: { circleId, profileId, status: "REQUESTED" },
    update: { status: "REQUESTED" },
  });

  await markRecommendationActed(profileId, "CIRCLE", circleId);

  const moderators = await db.circleMembership.findMany({
    where: { circleId, status: "ACTIVE", role: { in: ["OWNER", "MODERATOR"] } },
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
        type: "CIRCLE_JOIN_REQUEST",
        title: `${requester?.displayName ?? "Someone"} asked to join ${circle.name}`,
        linkPath: `/circles/${circleId}/members`,
        groupKey: `circle-join:${circleId}`,
      }),
    ),
  );

  return { status: "REQUESTED" };
}

export async function approveJoinRequest(
  circleId: string,
  moderatorProfileId: string,
  targetProfileId: string,
): Promise<void> {
  await requireMembership(circleId, moderatorProfileId, ["OWNER", "MODERATOR"]);

  const circle = await db.circle.findUniqueOrThrow({
    where: { id: circleId },
    select: { name: true, maxMembers: true },
  });
  await assertRoom(circleId, circle.maxMembers);

  const membership = await db.circleMembership.findUnique({
    where: { circleId_profileId: { circleId, profileId: targetProfileId } },
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
    db.circleMembership.update({
      where: { circleId_profileId: { circleId, profileId: targetProfileId } },
      data: { status: "ACTIVE", joinedAt: new Date() },
    }),
    db.circleMessage.create({
      data: {
        circleId,
        kind: "SYSTEM",
        body: `${profile.displayName} joined the circle.`,
      },
    }),
  ]);

  await notify({
    profileId: targetProfileId,
    type: "CIRCLE_INVITE",
    title: `You're in — welcome to ${circle.name}`,
    linkPath: `/circles/${circleId}`,
  });
}

export async function declineJoinRequest(
  circleId: string,
  moderatorProfileId: string,
  targetProfileId: string,
): Promise<void> {
  await requireMembership(circleId, moderatorProfileId, ["OWNER", "MODERATOR"]);
  await db.circleMembership.deleteMany({
    where: { circleId, profileId: targetProfileId, status: "REQUESTED" },
  });
}

export async function inviteToCircle(
  circleId: string,
  inviterProfileId: string,
  targetProfileId: string,
): Promise<void> {
  await requireMembership(circleId, inviterProfileId);

  const circle = await db.circle.findUniqueOrThrow({
    where: { id: circleId },
    select: { name: true, maxMembers: true },
  });
  await assertRoom(circleId, circle.maxMembers);

  const target = await db.profile.findUnique({
    where: { id: targetProfileId },
    select: {
      id: true,
      privacy: { select: { invitableToCircles: true } },
    },
  });
  if (!target) throw notFound("We couldn't find that profile.");
  if (target.privacy?.invitableToCircles === false) {
    throw forbidden("This person isn't accepting circle invites.");
  }

  const existing = await db.circleMembership.findUnique({
    where: { circleId_profileId: { circleId, profileId: targetProfileId } },
    select: { status: true },
  });
  if (existing?.status === "ACTIVE") throw conflict("They're already a member.");
  if (existing?.status === "REMOVED") {
    throw forbidden("That person was removed from this circle.");
  }

  await db.circleMembership.upsert({
    where: { circleId_profileId: { circleId, profileId: targetProfileId } },
    create: { circleId, profileId: targetProfileId, status: "INVITED" },
    update: { status: "INVITED" },
  });

  await notify({
    profileId: targetProfileId,
    actorProfileId: inviterProfileId,
    type: "CIRCLE_INVITE",
    title: `You've been invited to ${circle.name}`,
    linkPath: `/circles/${circleId}`,
  });
}

export async function acceptInvite(
  circleId: string,
  profileId: string,
): Promise<void> {
  const membership = await db.circleMembership.findUnique({
    where: { circleId_profileId: { circleId, profileId } },
    select: { status: true },
  });
  if (membership?.status !== "INVITED") {
    throw notFound("That invite is no longer available.");
  }

  const circle = await db.circle.findUniqueOrThrow({
    where: { id: circleId },
    select: { maxMembers: true },
  });
  await assertRoom(circleId, circle.maxMembers);

  const profile = await db.profile.findUniqueOrThrow({
    where: { id: profileId },
    select: { displayName: true },
  });

  await db.$transaction([
    db.circleMembership.update({
      where: { circleId_profileId: { circleId, profileId } },
      data: { status: "ACTIVE", joinedAt: new Date() },
    }),
    db.circleMessage.create({
      data: {
        circleId,
        kind: "SYSTEM",
        body: `${profile.displayName} joined the circle.`,
      },
    }),
  ]);
}

export async function leaveCircle(
  circleId: string,
  profileId: string,
): Promise<void> {
  const membership = await db.circleMembership.findUnique({
    where: { circleId_profileId: { circleId, profileId } },
    select: { role: true, status: true },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw conflict("You're not in this circle.");
  }

  if (membership.role === "OWNER") {
    // Hand the circle to the longest-standing moderator, then any member,
    // rather than leaving it ownerless.
    const successor = await db.circleMembership.findFirst({
      where: {
        circleId,
        status: "ACTIVE",
        profileId: { not: profileId },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      select: { profileId: true },
    });

    if (successor) {
      await db.circleMembership.update({
        where: { circleId_profileId: { circleId, profileId: successor.profileId } },
        data: { role: "OWNER" },
      });
    } else {
      // Last person out archives the circle.
      await db.circle.update({
        where: { id: circleId },
        data: { archivedAt: new Date() },
      });
    }
  }

  const profile = await db.profile.findUniqueOrThrow({
    where: { id: profileId },
    select: { displayName: true },
  });

  await db.$transaction([
    db.circleMembership.update({
      where: { circleId_profileId: { circleId, profileId } },
      data: { status: "LEFT", role: "MEMBER" },
    }),
    db.circleMessage.create({
      data: {
        circleId,
        kind: "SYSTEM",
        body: `${profile.displayName} left the circle.`,
      },
    }),
  ]);
}

export async function removeMember(
  circleId: string,
  moderatorProfileId: string,
  targetProfileId: string,
): Promise<void> {
  const moderator = await requireMembership(circleId, moderatorProfileId, [
    "OWNER",
    "MODERATOR",
  ]);
  if (moderatorProfileId === targetProfileId) {
    throw conflict("Use leave instead.");
  }

  const target = await db.circleMembership.findUnique({
    where: { circleId_profileId: { circleId, profileId: targetProfileId } },
    select: { role: true },
  });
  if (!target) throw notFound("They're not in this circle.");
  if (target.role === "OWNER") throw forbidden("The owner can't be removed.");
  if (target.role === "MODERATOR" && moderator.role !== "OWNER") {
    throw forbidden("Only the owner can remove a moderator.");
  }

  await db.circleMembership.update({
    where: { circleId_profileId: { circleId, profileId: targetProfileId } },
    data: { status: "REMOVED", role: "MEMBER" },
  });
}

export async function setMemberRole(
  circleId: string,
  ownerProfileId: string,
  targetProfileId: string,
  role: "MEMBER" | "MODERATOR",
): Promise<void> {
  await requireMembership(circleId, ownerProfileId, ["OWNER"]);
  await db.circleMembership.update({
    where: { circleId_profileId: { circleId, profileId: targetProfileId } },
    data: { role },
  });
}

export async function updateCircle(
  circleId: string,
  profileId: string,
  input: CircleUpdateInput,
): Promise<void> {
  await requireMembership(circleId, profileId, ["OWNER", "MODERATOR"]);

  const place =
    input.cityLabel && input.countryCode
      ? findPlace(input.cityLabel, input.countryCode)
      : undefined;
  const approx = place ? snapToGrid(place.lat, place.lng) : null;

  await db.circle.update({
    where: { id: circleId },
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
      db.circleInterest.deleteMany({ where: { circleId } }),
      db.circleInterest.createMany({
        data: interestIds.map((interestId) => ({ circleId, interestId })),
      }),
    ]);
  }
}

// --- Reads ------------------------------------------------------------------

export async function listMyCircles(profileId: string) {
  const rows = await db.circleMembership.findMany({
    where: { profileId, status: { in: ["ACTIVE", "INVITED", "REQUESTED"] } },
    select: {
      role: true,
      status: true,
      lastReadAt: true,
      circle: {
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
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const unreadCounts = await Promise.all(
    rows.map(async (row) =>
      row.status === "ACTIVE"
        ? db.circleMessage.count({
            where: {
              circleId: row.circle.id,
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
    id: row.circle.id,
    slug: row.circle.slug,
    name: row.circle.name,
    description: row.circle.description,
    imageUrl: row.circle.imageUrl,
    type: row.circle.type,
    locationLabel: row.circle.cityLabel,
    memberCount: row.circle._count.memberships,
    maxMembers: row.circle.maxMembers,
    interests: row.circle.interests.map((i) => i.interest.label),
    role: row.role,
    membershipStatus: row.status,
    unreadCount: unreadCounts[index] ?? 0,
  }));
}

export async function getCircle(circleIdOrSlug: string, viewerProfileId: string) {
  const circle = await db.circle.findFirst({
    where: {
      OR: [{ id: circleIdOrSlug }, { slug: circleIdOrSlug }],
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

  if (!circle || circle.archivedAt) throw notFound("That circle no longer exists.");

  const viewerMembership = await db.circleMembership.findUnique({
    where: { circleId_profileId: { circleId: circle.id, profileId: viewerProfileId } },
    select: { role: true, status: true },
  });

  const isMember = viewerMembership?.status === "ACTIVE";

  // A private circle shows nothing beyond its name to non-members — not its
  // description, not who is in it.
  if (circle.visibility === "PRIVATE" && !isMember && viewerMembership?.status !== "INVITED") {
    throw notFound("That circle no longer exists.");
  }

  return {
    id: circle.id,
    slug: circle.slug,
    name: circle.name,
    description: circle.description,
    imageUrl: circle.imageUrl,
    type: circle.type,
    visibility: circle.visibility,
    locationLabel: circle.cityLabel ?? circle.regionLabel,
    memberCount: circle._count.memberships,
    maxMembers: circle.maxMembers,
    rules: circle.rules,
    createdAt: circle.createdAt.toISOString(),
    interests: circle.interests.map((i) => i.interest.label),
    interestSlugs: circle.interests.map((i) => i.interest.slug),
    viewerRole: viewerMembership?.role ?? null,
    viewerStatus: viewerMembership?.status ?? null,
    isMember,
    // Only members see the member list.
    members: isMember
      ? circle.memberships
          .filter((m) => m.status === "ACTIVE")
          .map((m) => ({ ...m.profile, role: m.role }))
      : [],
    joinRequests:
      viewerMembership?.role === "OWNER" || viewerMembership?.role === "MODERATOR"
        ? circle.memberships
            .filter((m) => m.status === "REQUESTED")
            .map((m) => m.profile)
        : [],
  };
}

/**
 * Browsable public circles. Distinct from `recommendCircles`, which ranks by
 * compatibility — this is the plain "show me what exists" list with a search box.
 */
export async function browseCircles(
  viewerProfileId: string,
  query?: string,
  limit = 24,
) {
  const circles = await db.circle.findMany({
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

  return circles.map((c) => ({
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
