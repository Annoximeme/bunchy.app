import {
  availabilityClusters,
  availabilityDisabled,
  HORIZON_KINDS,
  myAvailability,
  type AvailabilityCluster,
  type Horizon,
} from "@/server/modules/availability/service";
import { findPeople, type FindPeopleResult } from "@/server/modules/discovery/find-people";

/**
 * Bunchy Now, what people are up for, right now.
 *
 * A composition, not a new subsystem. The counts come from the availability
 * clusters that already exist, and the people come from `findPeople`, which
 * already knows how to filter on availability and distance, already applies
 * blocks, privacy audiences and discoverability, and already reports which
 * constraint to relax when it finds nobody.
 *
 * Building a second query path for this board would have meant a second place
 * for a privacy rule to be forgotten, which is the specific way features like
 * this leak.
 *
 * Note what is NOT here: a `bunchy_now.viewed` analytics event. The brief asked
 * for one, and the taxonomy test forbids any event matching /view|impression|
 * session|dwell/ because the privacy policy states plainly that page views are
 * not tracked. Opening a page is attention, not an action; the events worth
 * having from this board are the ones already fired when somebody sets a status
 * or starts something, and those exist.
 */

/**
 * The horizon, phrased so the parser hears a *time* and nothing else.
 *
 * These strings are load-bearing. "someone to do something with" reads as
 * neutral and parses to `goals: [ACTIVITY_PARTNERS]`, which silently filtered
 * the default board down to people who had ticked that one goal, a member
 * three streets away with a live status simply did not appear, and the only
 * clue was a "try dropping: goals" hint under an empty state.
 *
 * A test pins that these parse to no goals and no interests.
 */
const HORIZON_QUERY: Record<Horizon | "all", string> = {
  now: "someone free right now",
  tonight: "someone free tonight",
  weekend: "someone free this weekend",
  all: "someone free",
};

export interface BunchyNowFilters {
  horizon?: Horizon | "all";
  withinKm?: number | null;
  /** Only people at or above this compatibility. */
  minScore?: number;
  mode?: "ONLINE" | "OFFLINE" | null;
}

export interface BunchyNowBoard {
  /** Aggregate counts. Never fewer than MIN_CLUSTER, never names. */
  clusters: AvailabilityCluster[];
  /** Compatible people who are up, and what to relax if there are none. */
  people: FindPeopleResult;
  /** The viewer's own status, so the board can say "you are on it". */
  mine: Awaited<ReturnType<typeof myAvailability>>;
  /** True when the viewer switched availability off entirely. */
  hidden: boolean;
  horizon: Horizon | "all";
}

export async function bunchyNow(
  profileId: string,
  filters: BunchyNowFilters = {},
): Promise<BunchyNowBoard> {
  const horizon = filters.horizon ?? "all";

  const [hidden, mine, clusters] = await Promise.all([
    availabilityDisabled(profileId),
    myAvailability(profileId),
    availabilityClusters(profileId),
  ]);

  const kinds =
    horizon === "all" ? null : new Set<string>(HORIZON_KINDS[horizon]);

  // The horizon becomes the query, so the existing intent parser does the work
  // of turning "tonight" into a time window rather than a second code path
  // reimplementing it here.
  const people = await findPeople(profileId, HORIZON_QUERY[horizon], {
    availableNow: true,
    withinKm: filters.withinKm ?? undefined,
    limit: 12,
  });

  const filtered = kinds
    ? clusters.filter((cluster) => kinds.has(cluster.kind))
    : clusters;

  return {
    clusters: filtered,
    people: {
      ...people,
      people: filters.minScore
        ? people.people.filter((p) => p.score >= filters.minScore!)
        : people.people,
    },
    mine,
    hidden,
    horizon,
  };
}
