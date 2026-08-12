import { db } from "@/server/db/client";
import type { Prisma } from "@/generated/prisma/client";
import { conflict, forbidden, notFound } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import { findPlace } from "@/server/modules/geo/gazetteer";
import { notify } from "@/server/modules/notifications/service";
import { markRecommendationActed } from "@/server/modules/matching/engine";
import type {
  ActivityCreateInput,
  ActivityUpdateInput,
} from "@/server/modules/activities/schemas";

/**
 * Activities.
 *
 * The measure of whether Bunchy works is whether people end up somewhere
 * together, so this module is deliberately as prominent as matching. Joining is
 * one call, capacity is enforced with a waitlist that promotes automatically,
 * and cancelling tells everyone who had planned around it.
 */

const ACTIVITY_SELECT = {
  id: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  mode: true,
  locationLabel: true,
  cityLabel: true,
  onlineUrl: true,
  maxParticipants: true,
  status: true,
  createdAt: true,
  organizerId: true,
  organizer: {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  },
  bunch: { select: { id: true, slug: true, name: true } },
  participants: {
    where: { status: { in: ["JOINED", "WAITLISTED"] } },
    select: {
      status: true,
      profile: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  },
} satisfies Prisma.ActivitySelect;

type ActivityRow = {
  id: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date | null;
  mode: string;
  locationLabel: string | null;
  cityLabel: string | null;
  onlineUrl: string | null;
  maxParticipants: number;
  status: string;
  createdAt: Date;
  organizerId: string;
  organizer: { id: string; username: string; displayName: string; avatarUrl: string | null };
  bunch: { id: string; slug: string; name: string } | null;
  participants: Array<{
    status: string;
    profile: { id: string; username: string; displayName: string; avatarUrl: string | null };
  }>;
};

export function toActivityView(row: ActivityRow, viewerProfileId: string) {
  const joined = row.participants.filter((p) => p.status === "JOINED");
  const waitlisted = row.participants.filter((p) => p.status === "WAITLISTED");
  const viewerEntry = row.participants.find(
    (p) => p.profile.id === viewerProfileId,
  );

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    mode: row.mode,
    locationLabel: row.locationLabel,
    cityLabel: row.cityLabel,
    // The meeting link is only for people who are actually going.
    onlineUrl: viewerEntry?.status === "JOINED" ? row.onlineUrl : null,
    maxParticipants: row.maxParticipants,
    participantCount: joined.length,
    spotsLeft: Math.max(0, row.maxParticipants - joined.length),
    status: row.status,
    organizer: row.organizer,
    bunch: row.bunch,
    participants: joined.map((p) => p.profile),
    waitlistCount: waitlisted.length,
    viewerStatus: viewerEntry?.status ?? null,
    viewerIsOrganizer: row.organizerId === viewerProfileId,
  };
}

export type ActivityView = ReturnType<typeof toActivityView>;

export async function createActivity(
  organizerId: string,
  input: ActivityCreateInput,
): Promise<{ id: string }> {
  await consume("activityCreate", organizerId);

  if (input.bunchId) {
    const membership = await db.bunchMembership.findUnique({
      where: {
        bunchId_profileId: { bunchId: input.bunchId, profileId: organizerId },
      },
      select: { status: true },
    });
    if (membership?.status !== "ACTIVE") {
      throw forbidden("You can only plan activities in bunches you're in.");
    }
  }

  const place =
    input.cityLabel && input.countryCode
      ? findPlace(input.cityLabel, input.countryCode)
      : undefined;

  const activity = await db.activity.create({
    data: {
      title: input.title,
      description: input.description,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      mode: input.mode,
      locationLabel: input.locationLabel ?? null,
      cityLabel: place?.cityLabel ?? input.cityLabel ?? null,
      countryCode: place?.countryCode ?? input.countryCode ?? null,
      onlineUrl: input.onlineUrl || null,
      maxParticipants: input.maxParticipants,
      organizerId,
      bunchId: input.bunchId ?? null,
      // The organizer is going, by definition.
      participants: { create: { profileId: organizerId, status: "JOINED" } },
    },
    select: { id: true, title: true, bunchId: true },
  });

  if (activity.bunchId) {
    await announceToBunch(activity.bunchId, organizerId, activity.id, input.title);
  }

  return { id: activity.id };
}

/**
 * Posts a system message in the bunch and notifies the members. This is the
 * one broadcast notification in the product, and it earns its place: a plan
 * that nobody hears about is not a plan.
 */
async function announceToBunch(
  bunchId: string,
  organizerId: string,
  activityId: string,
  title: string,
): Promise<void> {
  const [bunch, organizer, members] = await Promise.all([
    db.bunch.findUniqueOrThrow({
      where: { id: bunchId },
      select: { name: true },
    }),
    db.profile.findUniqueOrThrow({
      where: { id: organizerId },
      select: { displayName: true },
    }),
    db.bunchMembership.findMany({
      where: { bunchId, status: "ACTIVE", profileId: { not: organizerId } },
      select: { profileId: true },
    }),
  ]);

  await db.bunchMessage.create({
    data: {
      bunchId,
      kind: "SYSTEM",
      body: `${organizer.displayName} planned "${title}".`,
    },
  });

  await Promise.all(
    members.map((m) =>
      notify({
        profileId: m.profileId,
        actorProfileId: organizerId,
        type: "ACTIVITY_INVITE",
        title: `${bunch.name} is doing something: ${title}`,
        linkPath: `/activities/${activityId}`,
        groupKey: `activity:${activityId}`,
      }),
    ),
  );
}

export async function joinActivity(
  activityId: string,
  profileId: string,
): Promise<{ status: "JOINED" | "WAITLISTED" }> {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      status: true,
      maxParticipants: true,
      startsAt: true,
      bunchId: true,
      organizerId: true,
      bunch: { select: { visibility: true } },
    },
  });
  if (!activity) throw notFound("That activity no longer exists.");
  if (activity.status !== "SCHEDULED") throw conflict("That activity isn't running.");
  if (activity.startsAt.getTime() < Date.now()) {
    throw conflict("That activity has already started.");
  }

  // Anything hosted in a private bunch is members-only.
  if (activity.bunchId && activity.bunch?.visibility === "PRIVATE") {
    const membership = await db.bunchMembership.findUnique({
      where: {
        bunchId_profileId: { bunchId: activity.bunchId, profileId },
      },
      select: { status: true },
    });
    if (membership?.status !== "ACTIVE") {
      throw notFound("That activity no longer exists.");
    }
  }

  const existing = await db.activityParticipant.findUnique({
    where: { activityId_profileId: { activityId, profileId } },
    select: { status: true },
  });
  if (existing?.status === "JOINED") throw conflict("You're already going.");
  if (existing?.status === "WAITLISTED") throw conflict("You're already on the waitlist.");

  const joinedCount = await db.activityParticipant.count({
    where: { activityId, status: "JOINED" },
  });
  const status = joinedCount >= activity.maxParticipants ? "WAITLISTED" : "JOINED";

  await db.activityParticipant.upsert({
    where: { activityId_profileId: { activityId, profileId } },
    create: { activityId, profileId, status },
    update: { status, joinedAt: new Date() },
  });

  await markRecommendationActed(profileId, "ACTIVITY", activityId);

  return { status };
}

export async function leaveActivity(
  activityId: string,
  profileId: string,
): Promise<void> {
  const entry = await db.activityParticipant.findUnique({
    where: { activityId_profileId: { activityId, profileId } },
    select: { status: true },
  });
  if (!entry || entry.status === "LEFT") throw conflict("You're not going.");

  const activity = await db.activity.findUniqueOrThrow({
    where: { id: activityId },
    select: { organizerId: true, title: true },
  });
  if (activity.organizerId === profileId) {
    throw conflict("Organizers cancel the activity rather than leaving it.");
  }

  await db.activityParticipant.update({
    where: { activityId_profileId: { activityId, profileId } },
    data: { status: "LEFT" },
  });

  if (entry.status === "JOINED") await promoteFromWaitlist(activityId, activity.title);
}

/** A freed spot goes to whoever has been waiting longest. */
async function promoteFromWaitlist(
  activityId: string,
  title: string,
): Promise<void> {
  const next = await db.activityParticipant.findFirst({
    where: { activityId, status: "WAITLISTED" },
    orderBy: { joinedAt: "asc" },
    select: { profileId: true },
  });
  if (!next) return;

  await db.activityParticipant.update({
    where: { activityId_profileId: { activityId, profileId: next.profileId } },
    data: { status: "JOINED" },
  });

  await notify({
    profileId: next.profileId,
    type: "ACTIVITY_CHANGED",
    title: `A spot opened up: ${title}`,
    body: "You're off the waitlist and going.",
    linkPath: `/activities/${activityId}`,
  });
}

export async function updateActivity(
  activityId: string,
  profileId: string,
  input: ActivityUpdateInput,
): Promise<void> {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    select: { organizerId: true, startsAt: true, title: true },
  });
  if (!activity) throw notFound("That activity no longer exists.");
  if (activity.organizerId !== profileId) {
    throw forbidden("Only the organizer can change this.");
  }

  await db.activity.update({
    where: { id: activityId },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.startsAt ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
      ...(input.locationLabel !== undefined
        ? { locationLabel: input.locationLabel || null }
        : {}),
      ...(input.onlineUrl !== undefined ? { onlineUrl: input.onlineUrl || null } : {}),
      ...(input.maxParticipants ? { maxParticipants: input.maxParticipants } : {}),
    },
  });

  // A moved activity is the one change everyone must hear about.
  if (input.startsAt && input.startsAt.getTime() !== activity.startsAt.getTime()) {
    await notifyParticipants(
      activityId,
      profileId,
      "ACTIVITY_CHANGED",
      `${activity.title} moved to a new time`,
    );
  }
}

export async function cancelActivity(
  activityId: string,
  profileId: string,
): Promise<void> {
  const activity = await db.activity.findUnique({
    where: { id: activityId },
    select: { organizerId: true, title: true, status: true },
  });
  if (!activity) throw notFound("That activity no longer exists.");
  if (activity.organizerId !== profileId) {
    throw forbidden("Only the organizer can cancel this.");
  }
  if (activity.status === "CANCELLED") return;

  await db.activity.update({
    where: { id: activityId },
    data: { status: "CANCELLED" },
  });

  await notifyParticipants(
    activityId,
    profileId,
    "ACTIVITY_CHANGED",
    `${activity.title} was cancelled`,
  );
}

async function notifyParticipants(
  activityId: string,
  actorProfileId: string,
  type: "ACTIVITY_CHANGED",
  title: string,
): Promise<void> {
  const participants = await db.activityParticipant.findMany({
    where: { activityId, status: { in: ["JOINED", "WAITLISTED"] } },
    select: { profileId: true },
  });

  await Promise.all(
    participants.map((p) =>
      notify({
        profileId: p.profileId,
        actorProfileId,
        type,
        title,
        linkPath: `/activities/${activityId}`,
        groupKey: `activity:${activityId}`,
      }),
    ),
  );
}

// --- Reads ------------------------------------------------------------------

export async function getActivity(
  activityId: string,
  viewerProfileId: string,
): Promise<ActivityView> {
  const row = await db.activity.findUnique({
    where: { id: activityId },
    select: ACTIVITY_SELECT,
  });
  if (!row) throw notFound("That activity no longer exists.");
  return toActivityView(row as unknown as ActivityRow, viewerProfileId);
}

export interface ListActivitiesOptions {
  scope?: "upcoming" | "mine" | "organizing";
  bunchId?: string;
  limit?: number;
}

export async function listActivities(
  viewerProfileId: string,
  options: ListActivitiesOptions = {},
): Promise<ActivityView[]> {
  const { scope = "upcoming", bunchId, limit = 30 } = options;
  const now = new Date();

  const scopeFilter: Prisma.ActivityWhereInput =
    scope === "mine"
      ? {
          participants: {
            some: {
              profileId: viewerProfileId,
              status: { in: ["JOINED", "WAITLISTED"] },
            },
          },
        }
      : scope === "organizing"
        ? { organizerId: viewerProfileId }
        : {};

  const rows = await db.activity.findMany({
    where: {
      status: scope === "upcoming" ? "SCHEDULED" : undefined,
      startsAt: { gte: scope === "mine" ? new Date(0) : now },
      ...(bunchId ? { bunchId } : {}),
      ...scopeFilter,
      // Never surface something hosted in a bunch the viewer cannot see.
      OR: [
        { bunchId: null },
        { bunch: { visibility: "PUBLIC", archivedAt: null } },
        {
          bunch: {
            memberships: { some: { profileId: viewerProfileId, status: "ACTIVE" } },
          },
        },
      ],
      organizer: {
        blocksMade: { none: { blockedId: viewerProfileId } },
        blocksReceived: { none: { blockerId: viewerProfileId } },
      },
    },
    select: ACTIVITY_SELECT,
    orderBy: { startsAt: "asc" },
    take: Math.min(limit, 100),
  });

  return (rows as unknown as ActivityRow[]).map((row) =>
    toActivityView(row, viewerProfileId),
  );
}
