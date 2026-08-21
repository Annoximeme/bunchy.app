/**
 * Where a bunch is in its life, worked out rather than recorded.
 *
 * ## Why there is no status column
 *
 * The obvious implementation is a `BunchStatus` enum and a job that keeps it
 * up to date. That is the wrong shape, and it fails in a specific way: a stored
 * status is a second copy of facts the database already holds, so the moment
 * somebody joins, leaves, cancels an evening or ends a ritual, the column is
 * wrong until a job notices. A bunch reading "Almost full" with two spare seats
 * is worse than a bunch reading nothing, because the reader believes it.
 *
 * Everything this needs is already true somewhere: how many members, how many
 * seats, whether an evening is coming, whether it repeats. So this is a pure
 * function over those facts, computed at render, and it cannot drift because
 * there is nothing to drift from.
 *
 * ## The line against gamification
 *
 * Every state here is a fact about the group, phrased as the group. None of
 * them are aimed at a person, none of them count consecutive anything, and none
 * of them get better by opening the app. "Almost full" is information somebody
 * deciding whether to join actually wants. "You're on a 4 week streak" would be
 * a liability handed to a member, and is exactly what the brief this came from
 * warns against in the same paragraph that asks for the states.
 *
 * The ordering matters as much as the states. What is happening soonest wins,
 * because a bunch with an evening on Thursday is a bunch with an evening on
 * Thursday whether or not it also has two seats free.
 */

export type LifecycleTone = "live" | "soon" | "open" | "settled" | "quiet";

export interface Lifecycle {
  label: string;
  tone: LifecycleTone;
}

export interface LifecycleFacts {
  memberCount: number;
  maxMembers: number;
  /** The next evening this bunch has, if any. */
  nextActivityAt?: Date | null;
  /** When the standing arrangement next comes round, if it has one. */
  nextSeriesAt?: Date | null;
  /** Evenings that have been and gone. */
  completedCount?: number;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Fewer seats than this left and it is worth saying so. */
const NEARLY_FULL_SPOTS = 2;

/** Below this a bunch is still gathering rather than being a group. */
const FORMING_BELOW = 3;

function whenLabel(at: Date, now: Date): string {
  const ms = at.getTime() - now.getTime();
  if (ms <= 0) return "happening now";
  if (ms < HOUR_MS) {
    const minutes = Math.max(1, Math.round(ms / 60_000));
    return `starting in ${minutes} min`;
  }
  if (ms < 6 * HOUR_MS) {
    const hours = Math.round(ms / HOUR_MS);
    return `starting in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  if (ms < DAY_MS) return "on tonight";
  if (ms < 2 * DAY_MS) return "on tomorrow";
  if (ms < 7 * DAY_MS) {
    return `on ${at.toLocaleDateString("en-GB", { weekday: "long" })}`;
  }
  return `on ${at.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;
}

export function lifecycleOf(
  facts: LifecycleFacts,
  now = new Date(),
): Lifecycle {
  const spotsLeft = Math.max(0, facts.maxMembers - facts.memberCount);

  // 1. Something is actually happening. Beats everything else, because it is
  //    the only state that is time-critical to the reader.
  if (facts.nextActivityAt) {
    const ms = facts.nextActivityAt.getTime() - now.getTime();
    if (ms > -2 * HOUR_MS && ms < 7 * DAY_MS) {
      return {
        label: whenLabel(facts.nextActivityAt, now),
        tone: ms < 6 * HOUR_MS ? "live" : "soon",
      };
    }
  }

  // 2. It repeats. A standing arrangement is the strongest thing a bunch can
  //    say about itself, so it outranks how full it is.
  if (facts.nextSeriesAt) {
    const weekday = facts.nextSeriesAt.toLocaleDateString("en-GB", {
      weekday: "long",
    });
    return { label: `Next: ${weekday}`, tone: "settled" };
  }

  // 3. No room. Said plainly rather than hidden, because somebody who cannot
  //    join wants to know before they read the description.
  if (spotsLeft === 0) {
    return { label: "Full", tone: "settled" };
  }

  // 4. Nearly no room. Genuine information for a reader deciding, and the one
  //    state here that could tip into urgency, which is why it is a count of
  //    seats rather than a countdown.
  if (spotsLeft <= NEARLY_FULL_SPOTS) {
    return {
      label: `${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left`,
      tone: "open",
    };
  }

  // 5. Still gathering. Phrased as the group's state, not as a shortfall: a
  //    bunch of two is a bunch of two, not a failed bunch of six.
  if (facts.memberCount < FORMING_BELOW) {
    return {
      label: `${facts.memberCount} so far`,
      tone: "quiet",
    };
  }

  // 6. It has done things. Only said once there is a plural, because "met
  //    once" is not a track record and reads as faint praise.
  if ((facts.completedCount ?? 0) > 1) {
    return {
      label: `Met ${facts.completedCount} times`,
      tone: "settled",
    };
  }

  // 7. A working group with room. The default, and deliberately the plainest
  //    thing here: most bunches are this most of the time and it should not
  //    shout.
  return {
    label: `${facts.memberCount} of ${facts.maxMembers}`,
    tone: "open",
  };
}
