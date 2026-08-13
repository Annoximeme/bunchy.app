import { db } from "@/server/db/client";

/**
 * How many people are near enough to matter, and what to call where they are.
 *
 * This exists for the empty state. A matching product with nobody in it shows
 * the same blank page whether it has two members or two hundred, and "nothing
 * to show you" reads as broken rather than as early. A count and a threshold
 * turn the same emptiness into a position in a queue: still nothing to click,
 * but now it is obvious what has to happen next and who can make it happen.
 *
 * No names, no profiles, no map — a number and a place label. Someone learning
 * "3 people near Antwerp" learns nothing about who they are.
 */

/**
 * Bunches are five to twelve people (§3). Below roughly eight nearby members
 * there is not enough overlap in interests and free evenings to form one that
 * holds together, so this is the number the empty state counts towards. It is a
 * product judgement, not a computed threshold.
 */
export const BUNCH_SEED_TARGET = 8;

export interface Neighbourhood {
  /** Completed profiles in the same place, including the viewer. */
  count: number;
  /** "Antwerp", "Belgium", or null when we know neither. */
  label: string | null;
  target: number;
  /** True once there are plausibly enough people to form a bunch. */
  ready: boolean;
}

export async function neighbourhoodFor(
  profileId: string,
): Promise<Neighbourhood> {
  const me = await db.profile.findUnique({
    where: { id: profileId },
    select: { cityLabel: true, regionLabel: true, countryCode: true },
  });

  if (!me) {
    return { count: 0, label: null, target: BUNCH_SEED_TARGET, ready: false };
  }

  // Narrowest place we actually know, widening only when the narrower one is
  // missing. Counting a country when a city is known would flatter the number.
  const [where, label] = me.cityLabel
    ? [{ cityLabel: me.cityLabel }, me.cityLabel]
    : me.regionLabel
      ? [{ regionLabel: me.regionLabel }, me.regionLabel]
      : me.countryCode
        ? [{ countryCode: me.countryCode }, me.countryCode]
        : [null, null];

  if (!where) {
    return { count: 0, label: null, target: BUNCH_SEED_TARGET, ready: false };
  }

  const count = await db.profile.count({
    where: { ...where, onboardingStage: "COMPLETE" },
  });

  return {
    count,
    label,
    target: BUNCH_SEED_TARGET,
    ready: count >= BUNCH_SEED_TARGET,
  };
}
