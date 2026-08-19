import { db } from "@/server/db/client";
import type { Prisma } from "@/generated/prisma/client";
import { distanceKm } from "@/server/modules/geo/distance";
import { locationLabel } from "@/server/modules/geo/precision";
import {
  availabilityClusters,
  type AvailabilityCluster,
} from "@/server/modules/availability/service";

/**
 * Bunch Radar, what is going on around here.
 *
 * "Radar" is a metaphor that has to be handled carefully, because the obvious
 * implementation of one is a map with dots on it, and this product does not
 * know where anybody is. It knows a grid cell about five kilometres across and
 * a city label, which is all it has ever stored (see `geo/precision.ts`).
 *
 * So this returns *bands*, not positions: "Board games · 3 km away" rather than
 * a pin. Distance is computed from grid centre to grid centre and then rounded
 * outward to a band, which means the number on screen cannot be triangulated
 * back into a location even in principle, three readings from three accounts
 * would still only intersect a cell.
 *
 * The people layer is counts only, and inherits the k-anonymity threshold from
 * the availability service rather than reimplementing it.
 */

/** Bands, in kilometres. Anything further is "further out". */
const BANDS = [2, 5, 10, 25, 50, 100] as const;

export type RadarKind = "bunch" | "activity";

export interface RadarItem {
  kind: RadarKind;
  id: string;
  /** Slug for a bunch, id for an activity. */
  href: string;
  title: string;
  /** "Antwerp region", "3 km away", "Nearby", "Online". */
  where: string;
  /** Null for online things, which have no distance to speak of. */
  distanceKm: number | null;
  interests: string[];
  mode: "ONLINE" | "OFFLINE" | null;
  /** Members for a bunch; people going for an activity. */
  count: number;
  /** Activities only. */
  startsAt: Date | null;
}

export interface RadarResult {
  items: RadarItem[];
  /** Opted-in availability, as counts by area. Never names anybody. */
  clusters: AvailabilityCluster[];
  /** What was applied, so the screen can show and undo it. */
  applied: { withinKm: number | null; interest: string | null; mode: string | null };
  /** The member has no location, so distance filtering is meaningless. */
  locationUnknown: boolean;
}

export interface RadarOptions {
  withinKm?: number | null;
  interestSlug?: string | null;
  mode?: "ONLINE" | "OFFLINE" | null;
  /** Only activities starting within this many days. */
  withinDays?: number | null;
  limit?: number;
  now?: Date;
}

const DEFAULT_RADIUS_KM = 50;
const DEFAULT_LIMIT = 24;

export async function scanRadar(
  profileId: string,
  options: RadarOptions = {},
): Promise<RadarResult> {
  const now = options.now ?? new Date();
  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, 60);

  const viewer = await db.profile.findUnique({
    where: { id: profileId },
    select: { approxLat: true, approxLng: true, countryCode: true },
  });

  const origin =
    viewer?.approxLat !== null && viewer?.approxLat !== undefined && viewer.approxLng !== null
      ? { lat: viewer.approxLat, lng: viewer.approxLng }
      : null;

  const withinKm =
    options.withinKm === null
      ? null
      : origin
        ? (options.withinKm ?? DEFAULT_RADIUS_KM)
        : null;

  const [bunches, activities, clusters] = await Promise.all([
    nearbyBunches(profileId, options, limit),
    nearbyActivities(profileId, options, now, limit),
    availabilityClusters(profileId, { countryCode: viewer?.countryCode ?? null, now }),
  ]);

  const items = [...bunches, ...activities]
    .map((item) => withDistance(item, origin))
    // Online things have no distance and are never filtered out by one.
    .filter((item) => withinKm === null || item.distanceKm === null || item.distanceKm <= withinKm)
    .sort(byNearestThenSoonest)
    .slice(0, limit);

  return {
    items,
    clusters,
    applied: {
      withinKm,
      interest: options.interestSlug ?? null,
      mode: options.mode ?? null,
    },
    locationUnknown: origin === null,
  };
}

// --- Sources ----------------------------------------------------------------

type Raw = Omit<RadarItem, "distanceKm" | "where"> & {
  approxLat: number | null;
  approxLng: number | null;
  cityLabel: string | null;
  regionLabel: string | null;
  countryCode: string | null;
};

async function nearbyBunches(
  profileId: string,
  options: RadarOptions,
  limit: number,
): Promise<Raw[]> {
  const where: Prisma.BunchWhereInput = {
    archivedAt: null,
    // Private bunches are invite-only and have no business on a discovery
    // surface, being findable is the entire difference between the two.
    visibility: "PUBLIC",
    // Already in it: the radar is for things you are not part of yet.
    memberships: { none: { profileId, status: "ACTIVE" } },
    ...(options.interestSlug
      ? { interests: { some: { interest: { slug: options.interestSlug } } } }
      : {}),
  };

  const rows = await db.bunch.findMany({
    where,
    select: {
      id: true,
      slug: true,
      name: true,
      approxLat: true,
      approxLng: true,
      cityLabel: true,
      regionLabel: true,
      countryCode: true,
      interests: { select: { interest: { select: { label: true } } } },
      _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { createdAt: "desc" },
    take: limit * 2,
  });

  return rows.map((row) => ({
    kind: "bunch" as const,
    id: row.id,
    href: `/bunches/${row.slug}`,
    title: row.name,
    interests: row.interests.map((i) => i.interest.label),
    mode: null,
    count: row._count.memberships,
    startsAt: null,
    approxLat: row.approxLat,
    approxLng: row.approxLng,
    cityLabel: row.cityLabel,
    regionLabel: row.regionLabel,
    countryCode: row.countryCode,
  }));
}

async function nearbyActivities(
  profileId: string,
  options: RadarOptions,
  now: Date,
  limit: number,
): Promise<Raw[]> {
  const until = options.withinDays
    ? new Date(now.getTime() + options.withinDays * 86_400_000)
    : undefined;

  const rows = await db.activity.findMany({
    where: {
      status: "SCHEDULED",
      startsAt: { gte: now, ...(until ? { lte: until } : {}) },
      ...(options.mode ? { mode: options.mode } : {}),
      // Not already going, and not inside a bunch that is invite-only.
      participants: { none: { profileId, status: "JOINED" } },
      OR: [{ bunchId: null }, { bunch: { visibility: "PUBLIC", archivedAt: null } }],
    },
    select: {
      id: true,
      title: true,
      startsAt: true,
      mode: true,
      cityLabel: true,
      countryCode: true,
      bunch: {
        select: {
          approxLat: true,
          approxLng: true,
          regionLabel: true,
          interests: { select: { interest: { select: { label: true } } } },
        },
      },
    },
    orderBy: { startsAt: "asc" },
    take: limit * 2,
  });

  return rows.map((row) => ({
    kind: "activity" as const,
    id: row.id,
    href: `/activities/${row.id}`,
    title: row.title,
    interests: row.bunch?.interests.map((i) => i.interest.label) ?? [],
    mode: row.mode,
    count: 0,
    startsAt: row.startsAt,
    // Activities carry a city label but no coordinates of their own; the
    // bunch's grid cell is the closest honest thing available.
    approxLat: row.bunch?.approxLat ?? null,
    approxLng: row.bunch?.approxLng ?? null,
    cityLabel: row.cityLabel,
    regionLabel: row.bunch?.regionLabel ?? null,
    countryCode: row.countryCode,
  }));
}

// --- Distance, as a band ----------------------------------------------------

function withDistance(
  raw: Raw,
  origin: { lat: number; lng: number } | null,
): RadarItem {
  const { approxLat, approxLng, cityLabel, regionLabel, countryCode, ...rest } = raw;

  if (rest.mode === "ONLINE") {
    return { ...rest, distanceKm: null, where: "Online" };
  }

  const exact =
    origin && approxLat !== null && approxLng !== null
      ? distanceKm(origin, { lat: approxLat, lng: approxLng })
      : null;

  return {
    ...rest,
    distanceKm: exact === null ? null : band(exact),
    where: describe(exact, { cityLabel, regionLabel, countryCode }),
  };
}

/**
 * Rounds a distance up to the next band.
 *
 * Reporting "3.2 km" from a grid-snapped coordinate would imply a precision the
 * data does not have, and repeated readings from different accounts would start
 * to triangulate. A band is honest about the resolution and stays useless for
 * locating anyone.
 */
function band(km: number): number {
  return BANDS.find((edge) => km <= edge) ?? 100;
}

function describe(
  km: number | null,
  place: { cityLabel: string | null; regionLabel: string | null; countryCode: string | null },
): string {
  if (km === null) return locationLabel(place);
  if (km <= 2) return place.cityLabel ? `${place.cityLabel} · nearby` : "Nearby";
  const rounded = band(km);
  if (rounded > 100) return locationLabel(place);
  return place.cityLabel
    ? `${place.cityLabel} · within ${rounded} km`
    : `Within ${rounded} km`;
}

/** Nearest first; among equals, the thing happening soonest. */
function byNearestThenSoonest(a: RadarItem, b: RadarItem): number {
  const left = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
  const right = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
  if (left !== right) return left - right;
  if (a.startsAt && b.startsAt) return a.startsAt.getTime() - b.startsAt.getTime();
  if (a.startsAt) return -1;
  if (b.startsAt) return 1;
  return b.count - a.count;
}
