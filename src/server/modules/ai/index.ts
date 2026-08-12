import { env } from "@/server/env";
import { LocalAssistant } from "@/server/modules/ai/local";
import { createAnthropicAssistant } from "@/server/modules/ai/anthropic";
import type { Assistant } from "@/server/modules/ai/provider";

let cached: Assistant | undefined;
let override: Assistant | undefined;

/** Test seam. */
export function setAssistant(next: Assistant | undefined) {
  override = next;
  cached = undefined;
}

/**
 * Resolves the configured assistant, falling back to the local implementation
 * whenever the hosted one cannot be constructed. Selection happens once per
 * process, not per call.
 */
export function assistant(): Assistant {
  if (override) return override;
  if (cached) return cached;

  cached =
    env().AI_PROVIDER === "anthropic"
      ? (createAnthropicAssistant() ?? new LocalAssistant())
      : new LocalAssistant();

  return cached;
}

export type * from "@/server/modules/ai/provider";
