import type {
  ActivitySuggestion,
  ActivitySuggestionInput,
  Assistant,
  ConversationSummaryInput,
  StarterContext,
} from "@/server/modules/ai/provider";
import { slugifyInterest } from "@/lib/interests";

/**
 * The default assistant: no network, no API key, no cost.
 *
 * It is template-driven rather than generative, which makes it worse at prose
 * and better at three things that matter more for an MVP — it is instant, it is
 * free, and it can never say anything unpredictable to a member. Every output is
 * grounded in data the two people actually entered.
 */

/** Openers keyed by interest. Specific beats clever: these are things people answer. */
const INTEREST_OPENERS: Record<string, string[]> = {
  gaming: [
    "What's the game you've sunk the most hours into?",
    "What are you playing at the moment?",
  ],
  "strategy-games": [
    "Do you go wide or tall? I need to know what I'm dealing with.",
    "What's the last strategy game that kept you up past midnight?",
  ],
  warhammer: [
    "Which army are you painting right now?",
    "How long did your current army take to paint?",
  ],
  "board-games": [
    "What's the one board game you can always get people to play?",
    "Heavy euro or party game — where do you land?",
  ],
  "tabletop-games": ["What's your current campaign?"],
  "dungeons-and-dragons": ["Do you play or DM more often?"],
  esports: ["Which team are you following this season?"],
  programming: [
    "What are you building at the moment?",
    "What's the side project you keep meaning to finish?",
  ],
  ai: ["What's the last thing AI actually made easier for you?"],
  technology: ["What piece of tech has genuinely earned its place in your life?"],
  "pc-building": ["What's in your current build?"],
  photography: [
    "What do you shoot with, and what do you like pointing it at?",
    "Where's the best light in town?",
  ],
  hiking: [
    "What's the best walk within an hour of here?",
    "Long flat routes or short steep ones?",
  ],
  nature: ["Where do you go when you need to be outside?"],
  travel: ["What's the trip you keep recommending to people?"],
  cooking: ["What do you make when you can't be bothered but still want it good?"],
  food: ["What's the meal you'd take someone to on their first visit here?"],
  coffee: ["Where do you go for a decent coffee around here?"],
  "craft-beer": ["What's your go-to when you don't recognise anything on the menu?"],
  music: [
    "What have you had on repeat lately?",
    "What's the best show you've been to?",
  ],
  "live-music": ["Who's the best live act you've seen?"],
  movies: ["What's the last film that genuinely surprised you?"],
  anime: ["What should I watch next — and don't say the obvious one."],
  books: ["What's the book you push on everyone?"],
  fitness: ["What does a normal week of training look like for you?"],
  running: ["Are you training for something, or just running?"],
  climbing: ["Indoor or outdoor? And what grade are you working on?"],
  cycling: ["What's your favourite route around here?"],
  art: ["What are you working on at the moment?"],
  drawing: ["What do you draw most?"],
  writing: ["What are you writing?"],
  entrepreneurship: ["What are you building?"],
  startups: ["What's the problem you keep coming back to?"],
  cars: ["What's the car you'd actually buy if it were sensible?"],
  motorcycles: ["What are you riding?"],
  "3d-printing": ["What's the most useful thing you've printed?"],
  gardening: ["What's growing right now?"],
  pets: ["Okay, obligatory: what's the pet situation?"],
};

const COMPLEMENTARY_TEMPLATES = [
  (topic: string) => `You mentioned you're getting into ${topic} — how far along are you?`,
  (topic: string) => `How did you get started with ${topic}?`,
];

const FALLBACKS = [
  "What's been keeping you busy lately?",
  "What made you join Bunchy?",
  "What's something you'd like to do more of this year?",
];

export class LocalAssistant implements Assistant {
  readonly id = "local@1";

  async conversationStarters(context: StarterContext): Promise<string[]> {
    const starters: string[] = [];

    for (const interest of context.sharedInterests) {
      const options = INTEREST_OPENERS[slugifyInterest(interest)];
      if (options?.[0]) starters.push(options[0]);
      if (starters.length >= 2) break;
    }

    // Complementary interests carry the "they can show you" framing, which is
    // usually the easiest thing in the world to open with.
    for (const raw of context.complementaryInterests) {
      if (starters.length >= 3) break;
      const topic = raw.split("—")[0]?.trim();
      if (!topic) continue;
      const template = COMPLEMENTARY_TEMPLATES[starters.length % COMPLEMENTARY_TEMPLATES.length]!;
      starters.push(template(topic.toLowerCase()));
    }

    for (const fallback of FALLBACKS) {
      if (starters.length >= 3) break;
      starters.push(fallback);
    }

    return [...new Set(starters)].slice(0, 3);
  }

  async summarizeConversation(
    input: ConversationSummaryInput,
  ): Promise<string> {
    const { messages, circleName } = input;
    if (messages.length === 0) {
      return `Nothing new in ${circleName} yet.`;
    }

    const speakers = [...new Set(messages.map((m) => m.author))];
    const topics = extractTopics(messages.map((m) => m.body));

    const who =
      speakers.length === 1
        ? speakers[0]!
        : speakers.length === 2
          ? `${speakers[0]} and ${speakers[1]}`
          : `${speakers.slice(0, 2).join(", ")} and ${speakers.length - 2} others`;

    const what =
      topics.length > 0
        ? ` — mostly about ${topics.slice(0, 3).join(", ")}`
        : "";

    return `${messages.length} message${messages.length === 1 ? "" : "s"} from ${who}${what}.`;
  }

  async suggestActivity(
    input: ActivitySuggestionInput,
  ): Promise<ActivitySuggestion | null> {
    const topic = input.interests[0];
    if (!topic) return null;

    const slug = slugifyInterest(topic);
    const online = ONLINE_FIRST.has(slug);

    return {
      title: online ? `${topic} night` : `${topic} meetup`,
      description: online
        ? `A relaxed evening of ${topic.toLowerCase()} together. Pick a time that works for most people and share where you'll meet up online.`
        : `Get together around ${topic.toLowerCase()}${
            input.cityLabel ? ` somewhere in ${input.cityLabel}` : ""
          }. Somewhere easy to get to, nothing complicated.`,
      mode: online ? "ONLINE" : "OFFLINE",
      rationale: `${input.circleName} has been talking about ${topic.toLowerCase()}.`,
    };
  }
}

const ONLINE_FIRST = new Set([
  "gaming",
  "strategy-games",
  "rpgs",
  "shooters",
  "co-op-games",
  "esports",
  "programming",
  "ai",
  "technology",
  "open-source",
  "self-hosting",
  "cybersecurity",
]);

/** Cheap keyword extraction — the most repeated meaningful words. */
const STOP_WORDS = new Set([
  "the", "and", "for", "that", "this", "with", "you", "are", "but", "not",
  "have", "has", "was", "were", "would", "could", "should", "there", "their",
  "what", "when", "who", "how", "its", "it's", "i'm", "we're", "just", "like",
  "about", "from", "your", "yeah", "okay", "gonna", "really", "think", "know",
  "some", "all", "one", "get", "got", "can", "will", "want", "need", "let's",
]);

function extractTopics(bodies: string[]): string[] {
  const counts = new Map<string, number>();

  for (const body of bodies) {
    const words = body.toLowerCase().match(/[a-z']{4,}/g) ?? [];
    for (const word of new Set(words)) {
      if (STOP_WORDS.has(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);
}
