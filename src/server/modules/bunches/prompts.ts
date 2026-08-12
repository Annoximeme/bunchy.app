/**
 * Icebreaker questions and bunch challenges.
 *
 * A written bank rather than anything generative, and that is the safety
 * mechanism rather than a limitation. §11 asks for questions that are fun,
 * safe, inclusive and non-invasive; the reliable way to get that is for a
 * person to have written every one of them and for the set to be reviewable in
 * a single file. Nothing here can produce a question nobody has read.
 *
 * What the whole bank avoids, deliberately:
 *
 * - Anything about relationships, family, money, health, religion, politics or
 *   where somebody lives. These are strangers meeting through a hobby.
 * - "Two truths and a lie" and its relatives, which reward performance and
 *   quietly exclude anyone who does not want to disclose things.
 * - Anything with a right answer, which turns a conversation into a quiz.
 * - Anything requiring a photo, a purchase or leaving the house alone.
 *
 * Interest-keyed questions come first when they match, because "what's the game
 * you've sunk the most hours into" gets an answer from a gaming bunch and "what
 * would you like to try this year" gets a shrug.
 */

export interface Prompt {
  /** Stable key. Stored so a question is never asked twice in one bunch. */
  key: string;
  text: string;
  /** Interest slugs this suits. Empty means it suits anyone. */
  interests?: readonly string[];
}

export const ICEBREAKERS: readonly Prompt[] = [
  // --- Keyed to what the bunch is actually about -----------------------------
  { key: "game-hours", text: "What's the game you've sunk the most hours into, and do you regret it?", interests: ["gaming", "strategy-games", "rpgs", "shooters", "co-op-games", "esports", "retro-gaming"] },
  { key: "game-forever", text: "What game could you play forever without getting bored?", interests: ["gaming", "board-games", "tabletop-games", "strategy-games"] },
  { key: "board-reliable", text: "Which board game can you always get people to agree to?", interests: ["board-games", "tabletop-games", "puzzles"] },
  { key: "army-painting", text: "What are you painting at the moment, and how long has it been on the shelf?", interests: ["warhammer", "tabletop-games"] },
  { key: "campaign", text: "Best thing that's ever happened in a campaign you were in?", interests: ["dungeons-and-dragons", "tabletop-games", "rpgs"] },
  { key: "walk-nearby", text: "What's the best walk within an hour of here that people don't know about?", interests: ["hiking", "nature", "city-walks", "camping"] },
  { key: "outside-when", text: "Where do you go when you need to be outside for a bit?", interests: ["hiking", "nature", "camping", "birdwatching", "cycling"] },
  { key: "photo-subject", text: "What do you find yourself pointing a camera at most often?", interests: ["photography", "art", "drawing", "filmmaking"] },
  { key: "on-repeat", text: "What have you had on repeat lately, embarrassing or otherwise?", interests: ["music", "live-music", "vinyl", "festivals", "music-production"] },
  { key: "best-gig", text: "Best live thing you've ever been to?", interests: ["live-music", "festivals", "music"] },
  { key: "surprising-film", text: "What's the last film or series that genuinely surprised you?", interests: ["movies", "tv", "anime", "documentaries", "sci-fi", "horror"] },
  { key: "watch-next", text: "What should everyone here watch next — and not the obvious one?", interests: ["anime", "movies", "tv", "sci-fi"] },
  { key: "cant-be-bothered", text: "What do you cook when you can't be bothered but still want it to be good?", interests: ["cooking", "baking", "food", "restaurants"] },
  { key: "first-visit", text: "Where would you take someone on their first day in this city?", interests: ["restaurants", "coffee", "craft-beer", "city-walks", "museums", "food"] },
  { key: "training-week", text: "What does a normal week of training look like for you at the moment?", interests: ["fitness", "running", "climbing", "cycling", "swimming", "martial-arts"] },
  { key: "current-build", text: "What are you building or working on right now?", interests: ["programming", "pc-building", "3d-printing", "side-projects", "electronics", "diy", "woodworking", "crafts"] },
  { key: "unfinished", text: "What's the side project you keep meaning to finish?", interests: ["programming", "side-projects", "crafts", "writing", "art"] },
  { key: "push-book", text: "What's the book you push on everyone?", interests: ["books", "philosophy", "history", "science"] },
  { key: "pet-situation", text: "Obligatory: what's the pet situation?", interests: ["pets"] },

  // --- Work for any bunch ----------------------------------------------------
  { key: "try-this-year", text: "What's something you'd like to try this year but haven't got round to?" },
  { key: "controversial-food", text: "What's your most controversial food opinion?" },
  { key: "good-weekend", text: "What does a genuinely good weekend look like for you?" },
  { key: "hobby-would-try", text: "What hobby would you take up if time and money weren't the problem?" },
  { key: "small-good-thing", text: "What's a small thing that reliably makes your week better?" },
  { key: "how-you-recharge", text: "After a long week, do you want people around or absolutely not?" },
  { key: "best-recent", text: "What's the best thing you've done in the last month?" },
  { key: "overrated", text: "What's something everyone loves that you just don't get?" },
  { key: "learned-late", text: "What's something you learned embarrassingly late?" },
  { key: "advice-ignored", text: "What's the best advice you've been given and completely ignored?" },
  { key: "one-place", text: "One place you'd go back to tomorrow?" },
  { key: "not-a-morning", text: "Be honest: mornings or nights?" },
];

export interface Challenge {
  key: string;
  title: string;
  /** One line of what to actually do. */
  description: string;
}

/**
 * Challenges.
 *
 * Every one of these is finished in a single sitting by talking to each other.
 * Nothing here requires a streak, a daily return, a purchase, or anyone to be
 * the first — §12 asks for interaction rather than addiction, and a challenge
 * that only works if everyone shows up every day is the addictive kind wearing
 * a friendly hat.
 */
export const CHALLENGES: readonly Challenge[] = [
  {
    key: "three-in-common",
    title: "Find three things everyone has in common",
    description: "Not the obvious one that got you all here. Three surprising ones.",
  },
  {
    key: "one-song-each",
    title: "Everyone recommends one song",
    description: "One each, no explanation required — though an explanation is usually the fun part.",
  },
  {
    key: "pick-a-film",
    title: "Choose a film together",
    description: "One everyone would actually sit through. Harder than it sounds.",
  },
  {
    key: "plan-a-bunchup",
    title: "Plan something to do together",
    description: "Any time, anywhere, however small. Getting a date in the diary is the whole challenge.",
  },
  {
    key: "favourite-game",
    title: "Everyone shares the game they'd defend to the death",
    description: "And one they secretly think is overrated.",
  },
  {
    key: "group-playlist",
    title: "Build a playlist together",
    description: "Two tracks each. No vetoes.",
  },
  {
    key: "best-nearby",
    title: "Everyone names the best thing within walking distance of them",
    description: "A café, a view, a bench. Somewhere you'd actually take someone.",
  },
  {
    key: "teach-something",
    title: "Everyone teaches the group one small thing",
    description: "A trick, a shortcut, a fact. Two sentences maximum.",
  },
];

/**
 * The next question worth asking a bunch.
 *
 * Interest-matched questions come first, then general ones, and anything
 * already asked is skipped entirely. Returns null when the bank is exhausted,
 * which is honest — a bunch that has answered thirty questions does not need a
 * thirty-first, it needs to go and do something.
 */
export function nextIcebreaker(
  interestSlugs: readonly string[],
  askedKeys: readonly string[],
  /** Injected so the choice is deterministic in tests. */
  pick: (count: number) => number = (count) => Math.floor(Math.random() * count),
): Prompt | null {
  const asked = new Set(askedKeys);
  const wanted = new Set(interestSlugs);

  const unused = ICEBREAKERS.filter((prompt) => !asked.has(prompt.key));
  if (unused.length === 0) return null;

  // Three tiers, in order. The middle one matters: without it, a bunch about
  // yoga — which has no keyed question — would fall through to the whole bank
  // and get asked which army it is painting. A question aimed at somebody
  // else's hobby is worse than a general one.
  const matching = unused.filter((prompt) =>
    prompt.interests?.some((slug) => wanted.has(slug)),
  );
  const general = unused.filter((prompt) => !prompt.interests?.length);
  const pool = matching.length > 0 ? matching : general.length > 0 ? general : unused;

  return pool[Math.min(pool.length - 1, Math.max(0, pick(pool.length)))] ?? null;
}

export function findChallenge(key: string): Challenge | undefined {
  return CHALLENGES.find((challenge) => challenge.key === key);
}
