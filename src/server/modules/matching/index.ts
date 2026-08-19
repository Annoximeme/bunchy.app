import { deterministicScorer } from "@/server/modules/matching/deterministic";
import type { CompatibilityScorer } from "@/server/modules/matching/types";

/**
 * The active scorer.
 *
 * Everything that ranks people goes through this accessor, so introducing an
 * embedding index or an LLM re-ranker is a change here and nowhere else. A
 * future version can also read a config flag and return different scorers for
 * different cohorts to run an evaluation in production, every recommendation
 * already records which scorer produced it.
 */
let active: CompatibilityScorer = deterministicScorer;

export function scorer(): CompatibilityScorer {
  return active;
}

/** Test seam and the hook a future rollout flag would use. */
export function setScorer(next: CompatibilityScorer) {
  active = next;
}

export * from "@/server/modules/matching/types";
export { deterministicScorer } from "@/server/modules/matching/deterministic";
