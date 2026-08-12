/**
 * Location fuzzing.
 *
 * Bunchy never stores where someone lives. Coordinates enter the system already
 * snapped to a coarse grid, so the most precise fact the database can express is
 * "somewhere in this ~5 km cell". That is plenty to rank people by distance and
 * useless for finding a front door.
 *
 * Snapping happens on write (see the profile service) rather than on read, so a
 * future bug in a serializer cannot leak precision that was never persisted.
 */

/** ~0.05° of latitude is a little over 5 km. */
const GRID_DEGREES = 0.05;

export interface ApproximateLocation {
  approxLat: number;
  approxLng: number;
}

export function snapToGrid(lat: number, lng: number): ApproximateLocation {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Coordinates must be finite numbers.");
  }

  const clampedLat = Math.min(90, Math.max(-90, lat));
  const wrappedLng = ((((lng + 180) % 360) + 360) % 360) - 180;

  const snap = (value: number) =>
    // Snap to cell centres so a point never lands exactly on a boundary.
    Math.round(
      (Math.floor(value / GRID_DEGREES) * GRID_DEGREES + GRID_DEGREES / 2) * 1e6,
    ) / 1e6;

  return { approxLat: snap(clampedLat), approxLng: snap(wrappedLng) };
}

/** Human-readable coarse location, e.g. "Antwerp region". */
export function locationLabel(input: {
  cityLabel?: string | null;
  regionLabel?: string | null;
  countryCode?: string | null;
}): string {
  if (input.cityLabel) return `${input.cityLabel} region`;
  if (input.regionLabel) return input.regionLabel;
  if (input.countryCode) return input.countryCode;
  return "Location not shared";
}
