/**
 * Bunchy AI — the assistant contract.
 *
 * Two rules constrain everything behind this interface:
 *
 * 1. The assistant is *assistive*. Every capability here produces something a
 *    member asked for at the moment they asked for it. There is deliberately no
 *    method for generating a reason to come back, no engagement scoring, and no
 *    "what would keep this person online" signal. Adding one would mean adding
 *    it to this interface, in public, on purpose.
 *
 * 2. It must degrade, not disappear. `LocalAssistant` is a real implementation,
 *    not a stub — with no API key configured the product still writes openers,
 *    still summarizes a busy bunch, and still proposes activities.
 */

export interface StarterContext {
  viewerName: string;
  otherName: string;
  sharedInterests: string[];
  complementaryInterests: string[];
  otherGoals: string[];
}

export interface ConversationSummaryInput {
  bunchName: string;
  messages: Array<{ author: string; body: string; createdAt: Date }>;
}

export interface ActivitySuggestionInput {
  bunchName: string;
  interests: string[];
  cityLabel: string | null;
  recentMessages: string[];
}

export interface ActivitySuggestion {
  title: string;
  description: string;
  mode: "ONLINE" | "OFFLINE";
  rationale: string;
}

/**
 * A request the deterministic parser could not make sense of, plus the only
 * vocabulary an assistant is allowed to answer in.
 *
 * The catalogue is passed *in* rather than described in a prompt, and the reply
 * is filtered against it before anyone sees it. An assistant that invents
 * "cottagecore-adjacent birdwatching" returns a slug matching nothing and is
 * dropped — so §23's "never fabricate" is enforced by the caller rather than
 * requested in a system prompt.
 */
export interface IntentReadingInput {
  text: string;
  catalogue: ReadonlyArray<{ slug: string; label: string }>;
}

export interface IntentReading {
  /** Slugs chosen from the catalogue. Anything else is discarded. */
  interestSlugs: string[];
  /** A short name for the thing, taken from the member's own words. */
  topic: string | null;
}

export interface Assistant {
  readonly id: string;
  /** Openers for a brand-new conversation, grounded in what the two share. */
  conversationStarters(context: StarterContext): Promise<string[]>;
  /** A short digest of a bunch someone has been away from. */
  summarizeConversation(input: ConversationSummaryInput): Promise<string>;
  /** Something the bunch could actually do, based on what they discuss. */
  suggestActivity(
    input: ActivitySuggestionInput,
  ): Promise<ActivitySuggestion | null>;
  /**
   * A second opinion on a request the grammar could not place.
   *
   * Returns `null` for "nothing to add", which is what the local assistant
   * always says — it *is* the deterministic parser, so asking it to re-read the
   * sentence would just return the same answer more slowly.
   */
  readIntent(input: IntentReadingInput): Promise<IntentReading | null>;
}
