/**
 * Bunch chemistry.
 *
 * Compatibility answers "would these people get on, on paper". Chemistry asks
 * the harder question: *is this group actually working*. A bunch of nine people
 * where two do all the talking scores brilliantly on paper and is not a bunch —
 * it is an audience with extra steps.
 *
 * Three rules, all of which fall out of the product's stance rather than the
 * maths:
 *
 * 1. **Silence is not failure, it is absence of evidence.** A bunch four days
 *    old has nothing to say about its own liveliness. Those signals return
 *    `null` and the score renormalizes over what actually ran, exactly as the
 *    matching engine does. A brand-new bunch reads "too new to tell", never 0%.
 *
 * 2. **Breadth beats volume.** The heaviest behavioural signal is what share of
 *    members have said anything at all, not how many messages there are. A
 *    product that scored volume would be asking groups to perform for a number.
 *
 * 3. **Members never see the number.** `observations` is what a person is shown:
 *    plain sentences about things they could act on. The score exists to rank
 *    recommendations, to propose new bunches, and to let staff spot a group
 *    dying quietly — not to grade anybody's friendships.
 */

export type ChemistrySignalName =
  | "compatibility"
  | "voice"
  | "balance"
  | "liveliness"
  | "turn_up"
  | "size";

export interface ChemistrySignal {
  signal: ChemistrySignalName;
  /** 0-1. */
  score: number;
  weight: number;
  reason: string;
}

export type ChemistryConfidence = "none" | "low" | "good";

export interface BunchChemistry {
  /** 0-100, or null when there is genuinely not enough to say. */
  score: number | null;
  confidence: ChemistryConfidence;
  signals: ChemistrySignal[];
  /** Plain sentences, safe to show a member. Most actionable first. */
  observations: string[];
}

export interface ChemistryMember {
  profileId: string;
  joinedAt: Date;
}

export interface ChemistryMessage {
  /** Null once the author has deleted their account; still counts as a voice. */
  authorId: string | null;
  createdAt: Date;
}

export interface ChemistryActivity {
  startsAt: Date;
  cancelled: boolean;
  participantIds: string[];
}

export interface ChemistryInput {
  members: ChemistryMember[];
  /** Pairwise compatibility, 0-1, for as many pairs as were scored. */
  pairs: Array<{ score: number }>;
  messages: ChemistryMessage[];
  activities: ChemistryActivity[];
  now: Date;
}

/** Behavioural signals need this much history before they mean anything. */
const WARMUP_DAYS = 7;
const RECENT_DAYS = 30;
/** Below this many members, group dynamics are not really group dynamics. */
const MIN_MEMBERS_FOR_BALANCE = 3;

const WEIGHTS: Record<ChemistrySignalName, number> = {
  compatibility: 0.3,
  voice: 0.25,
  balance: 0.15,
  liveliness: 0.15,
  turn_up: 0.1,
  size: 0.05,
};

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const days = (ms: number) => ms / 86_400_000;

export function bunchChemistry(input: ChemistryInput): BunchChemistry {
  const { members, messages, activities, now } = input;
  const memberCount = members.length;

  const oldestJoin = members.reduce<Date | null>(
    (acc, m) => (acc === null || m.joinedAt < acc ? m.joinedAt : acc),
    null,
  );
  const ageDays = oldestJoin ? days(now.getTime() - oldestJoin.getTime()) : 0;
  const warmedUp = ageDays >= WARMUP_DAYS;

  const recentCutoff = new Date(now.getTime() - RECENT_DAYS * 86_400_000);
  const recent = messages.filter((m) => m.createdAt >= recentCutoff);

  const signals: ChemistrySignal[] = [];
  const observations: string[] = [];

  // --- Compatibility: the on-paper case for this group existing. -----------
  if (input.pairs.length > 0) {
    const mean =
      input.pairs.reduce((sum, p) => sum + p.score, 0) / input.pairs.length;
    signals.push({
      signal: "compatibility",
      score: clamp(mean),
      weight: WEIGHTS.compatibility,
      reason:
        mean >= 0.7
          ? "On paper this group is a strong fit for each other"
          : mean >= 0.5
            ? "A reasonable fit on interests and goals"
            : "Members have less in common than most bunches",
    });
  }

  // --- Voice: how many people are actually in the conversation. ------------
  if (warmedUp && memberCount > 0) {
    const speakers = new Set(
      recent.map((m) => m.authorId).filter((id): id is string => id !== null),
    );
    const memberIds = new Set(members.map((m) => m.profileId));
    const speakingMembers = [...speakers].filter((id) => memberIds.has(id));
    const share = speakingMembers.length / memberCount;

    signals.push({
      signal: "voice",
      score: clamp(share),
      weight: WEIGHTS.voice,
      reason: `${speakingMembers.length} of ${memberCount} have said something in the last month`,
    });

    const quiet = memberCount - speakingMembers.length;
    if (quiet > 0 && recent.length > 0) {
      observations.push(
        quiet === 1
          ? "One member hasn't said anything this month."
          : `${quiet} members haven't said anything this month.`,
      );
    }
  }

  // --- Balance: is it a conversation or a broadcast? -----------------------
  if (warmedUp && memberCount >= MIN_MEMBERS_FOR_BALANCE && recent.length >= 5) {
    const counts = new Map<string, number>();
    for (const m of recent) {
      if (!m.authorId) continue;
      counts.set(m.authorId, (counts.get(m.authorId) ?? 0) + 1);
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0);

    if (total > 0) {
      // Normalized Shannon entropy across *members*, so silent members count
      // against balance rather than being excluded from the denominator.
      let entropy = 0;
      for (const count of counts.values()) {
        const p = count / total;
        entropy -= p * Math.log(p);
      }
      const maxEntropy = Math.log(memberCount);
      const balance = maxEntropy > 0 ? entropy / maxEntropy : 1;

      signals.push({
        signal: "balance",
        score: clamp(balance),
        weight: WEIGHTS.balance,
        reason:
          balance >= 0.7
            ? "The conversation is shared around"
            : "A few members are doing most of the talking",
      });

      const topShare = Math.max(...counts.values()) / total;
      if (topShare > 0.6 && counts.size > 1) {
        observations.push(
          "Most of the messages are coming from one person. The others may be waiting to be asked something.",
        );
      }
    }
  }

  // --- Liveliness: is anything happening at all? ---------------------------
  if (warmedUp) {
    // One message per member per month is "alive"; more is not better, so the
    // signal saturates rather than rewarding volume without limit.
    const expected = Math.max(4, memberCount);
    signals.push({
      signal: "liveliness",
      score: clamp(recent.length / expected),
      weight: WEIGHTS.liveliness,
      reason:
        recent.length === 0
          ? "Nothing has been said in a month"
          : `${recent.length} message${recent.length === 1 ? "" : "s"} in the last month`,
    });

    if (recent.length === 0) {
      observations.push("This bunch has gone quiet. Nobody has posted in a month.");
    }
  }

  // --- Turning up: the only signal that proves people actually met. --------
  const happened = activities.filter(
    (a) => !a.cancelled && a.startsAt <= now,
  );
  if (happened.length > 0 && memberCount > 0) {
    const attended = new Set<string>();
    for (const activity of happened) {
      for (const id of activity.participantIds) attended.add(id);
    }
    const share =
      members.filter((m) => attended.has(m.profileId)).length / memberCount;
    signals.push({
      signal: "turn_up",
      score: clamp(share),
      weight: WEIGHTS.turn_up,
      reason: `${Math.round(share * 100)}% of members have turned up to something`,
    });
  } else if (warmedUp && activities.length === 0) {
    observations.push("Nothing has been planned yet. A first activity is usually what makes a bunch stick.");
  }

  // --- Size: 5-12 is the shape the product is built around. ----------------
  signals.push({
    signal: "size",
    score: sizeFit(memberCount),
    weight: WEIGHTS.size,
    reason:
      memberCount < 5
        ? `${memberCount} member${memberCount === 1 ? "" : "s"}, still filling up`
        : memberCount <= 12
          ? `${memberCount} members. A good size`
          : `${memberCount} members, large enough that people start to go unnoticed`,
  });

  if (memberCount < 5 && warmedUp) {
    observations.push(
      `Only ${memberCount} ${memberCount === 1 ? "person is" : "people are"} in this bunch. Inviting a few more usually gets the conversation going.`,
    );
  }

  // --- Composition ---------------------------------------------------------
  const behavioural = signals.filter((s) => s.signal !== "size" && s.signal !== "compatibility");
  const confidence: ChemistryConfidence =
    behavioural.length === 0 ? "none" : behavioural.length >= 3 ? "good" : "low";

  if (confidence === "none") {
    return {
      score: null,
      confidence,
      signals,
      observations: warmedUp
        ? observations
        : ["Too new to tell, check back once the bunch has had a week."],
    };
  }

  const totalWeight = signals.reduce((sum, s) => sum + s.weight, 0);
  const weighted = signals.reduce((sum, s) => sum + s.score * s.weight, 0);

  return {
    score: Math.round((weighted / totalWeight) * 100),
    confidence,
    signals,
    observations,
  };
}

/** Plateaus across the 5-12 band the product is designed around. */
function sizeFit(count: number): number {
  if (count >= 5 && count <= 12) return 1;
  if (count < 5) return clamp(count / 5);
  // Past 12 it degrades slowly rather than falling off a cliff — a bunch of 14
  // is worse than one of 9, not broken.
  return clamp(1 - (count - 12) / 20);
}
