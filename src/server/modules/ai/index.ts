import { BunchyAssistant } from "@/server/modules/ai/assistant";
import type { Assistant } from "@/server/modules/ai/provider";

/**
 * The assistant, resolved.
 *
 * There is one implementation and it is free, see `provider.ts` for why that
 * is a design decision rather than a placeholder. This file used to pick
 * between a local and a hosted provider based on `AI_PROVIDER`; the hosted one
 * is gone, along with the environment variables that could have switched it on
 * by accident.
 *
 * It stays a function rather than an exported instance so tests can substitute
 * one, and so adding a *free* self-hosted model later is a change here and
 * nowhere else.
 */

let cached: Assistant | undefined;
let override: Assistant | undefined;

/** Test seam. */
export function setAssistant(next: Assistant | undefined) {
  override = next;
  cached = undefined;
}

export function assistant(): Assistant {
  if (override) return override;
  cached ??= new BunchyAssistant();
  return cached;
}

export type * from "@/server/modules/ai/provider";
