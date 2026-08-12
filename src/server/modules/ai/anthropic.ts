import type {
  ActivitySuggestion,
  ActivitySuggestionInput,
  Assistant,
  ConversationSummaryInput,
  IntentReading,
  IntentReadingInput,
  StarterContext,
} from "@/server/modules/ai/provider";
import { LocalAssistant } from "@/server/modules/ai/local";
import { env } from "@/server/env";

/**
 * Anthropic-backed assistant.
 *
 * Written against the Messages API directly rather than pulling in an SDK — the
 * surface we need is three calls wide. Every method falls back to
 * `LocalAssistant` when the API is unavailable or returns something unusable, so
 * a provider outage degrades the copy rather than breaking the page.
 *
 * Note the prompts: this model is asked to write openers and summaries. It is
 * never asked to decide who someone should meet. Ranking stays in the matching
 * engine where it is deterministic, testable and explainable.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 8000;

export class AnthropicAssistant implements Assistant {
  readonly id: string;
  private readonly fallback = new LocalAssistant();

  constructor(private readonly apiKey: string, private readonly model: string) {
    this.id = `anthropic:${model}`;
  }

  private async complete(
    system: string,
    prompt: string,
    maxTokens = 400,
  ): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.error(
          `Anthropic request failed: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const payload = (await response.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };

      const text = payload.content
        ?.filter((block) => block.type === "text")
        .map((block) => block.text ?? "")
        .join("")
        .trim();

      return text && text.length > 0 ? text : null;
    } catch (error) {
      console.error("Anthropic request errored:", error);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async conversationStarters(context: StarterContext): Promise<string[]> {
    const text = await this.complete(
      [
        "You write opening messages for people who just connected on Bunchy, a platform for making genuine friendships.",
        "Write questions a real person would actually answer: specific, warm, never flirtatious, never interview-like.",
        "Return exactly three, one per line, no numbering, no preamble.",
      ].join(" "),
      [
        `${context.viewerName} just connected with ${context.otherName}.`,
        context.sharedInterests.length > 0
          ? `They both like: ${context.sharedInterests.join(", ")}.`
          : "",
        context.complementaryInterests.length > 0
          ? `Complementary interests: ${context.complementaryInterests.join(", ")}.`
          : "",
        context.otherGoals.length > 0
          ? `${context.otherName} is looking for: ${context.otherGoals.join(", ")}.`
          : "",
        `Write three openers ${context.viewerName} could send.`,
      ]
        .filter(Boolean)
        .join("\n"),
    );

    if (!text) return this.fallback.conversationStarters(context);

    const lines = text
      .split("\n")
      .map((line) => line.replace(/^[\s\-*\d.)]+/, "").trim())
      .filter((line) => line.length > 0)
      .slice(0, 3);

    return lines.length > 0
      ? lines
      : this.fallback.conversationStarters(context);
  }

  async summarizeConversation(
    input: ConversationSummaryInput,
  ): Promise<string> {
    if (input.messages.length === 0) {
      return this.fallback.summarizeConversation(input);
    }

    const transcript = input.messages
      .slice(-60)
      .map((m) => `${m.author}: ${m.body}`)
      .join("\n");

    const text = await this.complete(
      "You summarize group chats for someone catching up. Two sentences maximum, plain and factual, no hype, no invented details.",
      `Bunch: ${input.bunchName}\n\n${transcript}\n\nSummarize what happened.`,
      200,
    );

    return text ?? this.fallback.summarizeConversation(input);
  }

  async suggestActivity(
    input: ActivitySuggestionInput,
  ): Promise<ActivitySuggestion | null> {
    const text = await this.complete(
      [
        "You propose small, low-effort activities a group of 5-12 friends could realistically do together.",
        'Reply with JSON only: {"title","description","mode","rationale"} where mode is "ONLINE" or "OFFLINE".',
      ].join(" "),
      [
        `Bunch: ${input.bunchName}`,
        `Shared interests: ${input.interests.join(", ") || "unknown"}`,
        input.cityLabel ? `Location: ${input.cityLabel}` : "No shared location.",
        input.recentMessages.length > 0
          ? `Recent chat:\n${input.recentMessages.slice(-20).join("\n")}`
          : "",
        "Suggest one activity.",
      ]
        .filter(Boolean)
        .join("\n"),
      400,
    );

    if (!text) return this.fallback.suggestActivity(input);

    try {
      const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
      const parsed = JSON.parse(json) as Partial<ActivitySuggestion>;
      if (!parsed.title || !parsed.description) {
        return this.fallback.suggestActivity(input);
      }
      return {
        title: String(parsed.title).slice(0, 120),
        description: String(parsed.description).slice(0, 1000),
        mode: parsed.mode === "ONLINE" ? "ONLINE" : "OFFLINE",
        rationale: String(parsed.rationale ?? "").slice(0, 300),
      };
    } catch {
      return this.fallback.suggestActivity(input);
    }
  }

  /**
   * A second reading of a sentence the grammar could not place.
   *
   * The catalogue goes into the prompt and the reply is intersected with it on
   * the way out, so the worst a confused or adversarial completion can do is
   * return nothing. Note what is not asked for: no time, no place, no group
   * size. Those already have a tested grammar, and handing them to a model
   * would trade a deterministic answer for a plausible one.
   */
  async readIntent(input: IntentReadingInput): Promise<IntentReading | null> {
    if (input.catalogue.length === 0) return null;

    const text = await this.complete(
      [
        "You map a short request onto a fixed list of interest tags for Bunchy, a platform for meeting compatible people.",
        "You may only use slugs from the list given. If nothing fits, return an empty list — do not invent a tag.",
        'Reply with JSON only: {"interestSlugs": string[], "topic": string|null}.',
        "`topic` is a short name for the thing itself, taken from the user's own words, or null.",
      ].join(" "),
      [
        `Request: ${input.text.slice(0, 300)}`,
        "",
        "Allowed tags (slug = label):",
        input.catalogue.map((i) => `${i.slug} = ${i.label}`).join("\n"),
      ].join("\n"),
      300,
    );
    if (!text) return null;

    try {
      const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
      const parsed = JSON.parse(json) as {
        interestSlugs?: unknown;
        topic?: unknown;
      };

      // The gate. Anything the catalogue does not contain never leaves here.
      const allowed = new Set(input.catalogue.map((i) => i.slug));
      const slugs = Array.isArray(parsed.interestSlugs)
        ? parsed.interestSlugs
            .filter((s): s is string => typeof s === "string")
            .filter((s) => allowed.has(s))
            .slice(0, 6)
        : [];

      const topic =
        typeof parsed.topic === "string" && parsed.topic.trim().length > 0
          ? parsed.topic.trim().slice(0, 60)
          : null;

      return slugs.length === 0 && topic === null ? null : { interestSlugs: slugs, topic };
    } catch {
      return null;
    }
  }
}

export function createAnthropicAssistant(): Assistant | null {
  const key = env().ANTHROPIC_API_KEY;
  if (!key) return null;
  return new AnthropicAssistant(key, env().ANTHROPIC_MODEL);
}
