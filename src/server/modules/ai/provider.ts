/**
 * Ask Bunchy: the assistant contract.
 *
 * **Nothing behind this interface costs money.** The one implementation is
 * `BunchyAssistant`, which is deterministic: templates, lexicons and the
 * member's own data, with no network call and no metered API anywhere in the
 * product. That is a deliberate constraint, not a stage on the way to a paid
 * model, and three good properties fall out of it:
 *
 * 1. **It cannot invent.** §23 asks that the assistant never fabricate a
 *    person, a compatibility score or a fact. A generator has to be watched for
 *    that; a template grounded in real rows cannot do it in the first place.
 * 2. **It cannot fail.** No key, no quota, no rate limit, no outage. Every
 *    feature that leans on it works offline and on the free tier of anything.
 * 3. **It cannot surprise anyone.** No completion is going to say something
 *    unpredictable to a member, which for a product about meeting strangers is
 *    worth more than better prose.
 *
 * The interface stays an interface so a *free* local model — Ollama, llama.cpp,
 * anything self-hosted — can be dropped in later by implementing these four
 * methods and changing one line in `index.ts`. That door is open. What is not
 * here, and is not coming back without a decision, is a hosted provider that
 * bills per token.
 *
 * One rule constrains the surface itself: everything here produces something a
 * member asked for at the moment they asked for it. There is deliberately no
 * method for generating a reason to come back, no engagement scoring, and no
 * "what would keep this person online" signal. Adding one would mean adding it
 * to this interface, in public, on purpose.
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
