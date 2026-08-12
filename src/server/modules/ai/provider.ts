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
}
