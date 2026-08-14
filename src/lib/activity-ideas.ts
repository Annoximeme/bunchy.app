/**
 * Things a bunch could actually do.
 *
 * A catalogue of *kinds* of evening, not a directory of places. Bunchy holds no
 * venue data — the gazetteer knows cities, not bowling alleys — so this file
 * deliberately contains no venue names, no addresses, no opening hours and no
 * prices. Inventing any of those would send somebody to a bar that does not
 * exist, which is the one failure a product about meeting up cannot recover
 * from.
 *
 * `cost` is a band used for filtering against a budget the member set. It is
 * not a quote and the UI never renders it as one.
 *
 * When real venue data arrives — an OpenStreetMap adapter, or venues named by
 * members after they have actually been — it attaches to these ideas rather
 * than replacing them, because the idea is what survives a venue closing down.
 */

export type Mood = "chill" | "social" | "adventurous" | "competitive" | "random";

export type CostBand = "free" | "low" | "medium" | "high";

export type IdeaCategory =
  | "food"
  | "gaming"
  | "sports"
  | "outdoors"
  | "entertainment"
  | "culture"
  | "nightlife"
  | "creative"
  | "online";

export interface ActivityIdea {
  slug: string;
  title: string;
  /** One line, written to be read aloud to a group chat. */
  blurb: string;
  category: IdeaCategory;
  moods: Mood[];
  cost: CostBand;
  /** Hours, roughly. Used to fit the time somebody said they had. */
  hours: number;
  mode: "ONLINE" | "OFFLINE";
  /** Below this it is not really a group thing. */
  minPeople: number;
  /** Interest slugs this leans on, for weighting against a profile. */
  interests: string[];
}

export const ACTIVITY_IDEAS: readonly ActivityIdea[] = [
  // --- Free -----------------------------------------------------------------
  {
    slug: "walk-and-talk",
    title: "A walk with no destination",
    blurb: "Meet somewhere central, pick a direction, stop when someone gets hungry.",
    category: "outdoors",
    moods: ["chill", "social"],
    cost: "free",
    hours: 2,
    mode: "OFFLINE",
    minPeople: 2,
    interests: ["hiking", "walking", "nature"],
  },
  {
    slug: "park-picnic",
    title: "Picnic, everyone brings one thing",
    blurb: "Nobody cooks, nobody pays for everyone, and it works from two people up.",
    category: "food",
    moods: ["chill", "social"],
    cost: "low",
    hours: 3,
    mode: "OFFLINE",
    minPeople: 3,
    interests: ["food", "cooking", "nature"],
  },
  {
    slug: "free-museum-evening",
    title: "Late opening at a museum",
    blurb: "Most cities have one evening a week that costs little or nothing, check what yours is.",
    category: "culture",
    moods: ["chill", "social"],
    cost: "low",
    hours: 2,
    mode: "OFFLINE",
    minPeople: 2,
    interests: ["art", "history", "museums"],
  },
  {
    slug: "photo-walk",
    title: "Photo walk, one theme",
    blurb: "Pick a theme, red things, doors, reflections. And compare at the end.",
    category: "creative",
    moods: ["chill", "adventurous"],
    cost: "free",
    hours: 2,
    mode: "OFFLINE",
    minPeople: 2,
    interests: ["photography", "art", "walking"],
  },

  // --- Gaming ---------------------------------------------------------------
  {
    slug: "board-game-night",
    title: "Board games somewhere with a table",
    blurb: "A café, someone's kitchen, a games bar. Bring two games, play one.",
    category: "gaming",
    moods: ["social", "competitive"],
    cost: "low",
    hours: 3,
    mode: "OFFLINE",
    minPeople: 3,
    interests: ["board-games", "gaming", "strategy"],
  },
  {
    slug: "co-op-night",
    title: "Co-op night online",
    blurb: "One game, one voice channel, a start time everyone actually agreed to.",
    category: "gaming",
    moods: ["chill", "social", "competitive"],
    cost: "free",
    hours: 3,
    mode: "ONLINE",
    minPeople: 2,
    interests: ["gaming", "video-games", "esports"],
  },
  {
    slug: "arcade",
    title: "Arcade, everyone puts in the same amount",
    blurb: "Agree the budget before you walk in and it stays fun.",
    category: "gaming",
    moods: ["competitive", "social"],
    cost: "medium",
    hours: 2,
    mode: "OFFLINE",
    minPeople: 2,
    interests: ["gaming", "arcade"],
  },
  {
    slug: "tabletop-campaign",
    title: "Start a short tabletop campaign",
    blurb: "Three sessions, not thirty. Easier to commit to and easier to finish.",
    category: "gaming",
    moods: ["social", "adventurous"],
    cost: "low",
    hours: 4,
    mode: "OFFLINE",
    minPeople: 3,
    interests: ["tabletop", "dnd", "board-games"],
  },

  // --- Sport ----------------------------------------------------------------
  {
    slug: "pickup-football",
    title: "Pickup football",
    blurb: "A pitch, a ball, whoever turns up. Numbers sort themselves out.",
    category: "sports",
    moods: ["competitive", "social"],
    cost: "free",
    hours: 2,
    mode: "OFFLINE",
    minPeople: 6,
    interests: ["football", "sports", "fitness"],
  },
  {
    slug: "bouldering",
    title: "Bouldering session",
    blurb: "Works for complete beginners, and nobody has to talk between climbs.",
    category: "sports",
    moods: ["adventurous", "competitive"],
    cost: "medium",
    hours: 2,
    mode: "OFFLINE",
    minPeople: 2,
    interests: ["climbing", "bouldering", "fitness"],
  },
  {
    slug: "morning-run",
    title: "A run at a pace nobody is proud of",
    blurb: "Slowest person sets the pace. That is the whole rule.",
    category: "sports",
    moods: ["chill", "competitive"],
    cost: "free",
    hours: 1,
    mode: "OFFLINE",
    minPeople: 2,
    interests: ["running", "fitness", "sports"],
  },
  {
    slug: "swim",
    title: "Swim, then something warm",
    blurb: "Pool or open water depending on the season and how brave everyone is.",
    category: "sports",
    moods: ["chill", "adventurous"],
    cost: "low",
    hours: 2,
    mode: "OFFLINE",
    minPeople: 2,
    interests: ["swimming", "fitness", "nature"],
  },

  // --- Food and night -------------------------------------------------------
  {
    slug: "cook-together",
    title: "Cook one thing together",
    blurb: "Split the shopping list before you meet and it costs less than eating out.",
    category: "food",
    moods: ["chill", "social"],
    cost: "low",
    hours: 3,
    mode: "OFFLINE",
    minPeople: 3,
    interests: ["cooking", "food", "baking"],
  },
  {
    slug: "cuisine-nobody-has-tried",
    title: "A cuisine none of you has tried",
    blurb: "Everyone orders one dish and it goes in the middle of the table.",
    category: "food",
    moods: ["adventurous", "social"],
    cost: "medium",
    hours: 2,
    mode: "OFFLINE",
    minPeople: 3,
    interests: ["food", "travel"],
  },
  {
    slug: "quiz-night",
    title: "Pub quiz",
    blurb: "A team of four is plenty, and losing badly is part of it.",
    category: "nightlife",
    moods: ["competitive", "social"],
    cost: "low",
    hours: 3,
    mode: "OFFLINE",
    minPeople: 3,
    interests: ["trivia", "pub", "board-games"],
  },
  {
    slug: "live-music",
    title: "Whatever is on locally tonight",
    blurb: "Small venues, cheap tickets, nobody has to know the band.",
    category: "nightlife",
    moods: ["adventurous", "social"],
    cost: "medium",
    hours: 3,
    mode: "OFFLINE",
    minPeople: 2,
    interests: ["music", "concerts", "nightlife"],
  },

  // --- Culture and making ---------------------------------------------------
  {
    slug: "cinema-then-argue",
    title: "Cinema, then argue about it",
    blurb: "The argument afterwards is the social part. Budget for one drink.",
    category: "entertainment",
    moods: ["chill", "social"],
    cost: "medium",
    hours: 3,
    mode: "OFFLINE",
    minPeople: 2,
    interests: ["films", "cinema", "tv"],
  },
  {
    slug: "sketch-crawl",
    title: "Sketch crawl",
    blurb: "Three places, twenty minutes each, no talent required.",
    category: "creative",
    moods: ["chill", "adventurous"],
    cost: "free",
    hours: 3,
    mode: "OFFLINE",
    minPeople: 2,
    interests: ["art", "drawing", "photography"],
  },
  {
    slug: "repair-cafe",
    title: "Fix something between you",
    blurb: "A bike, a jacket, a keyboard. Ridiculous fun and free.",
    category: "creative",
    moods: ["chill", "random"],
    cost: "free",
    hours: 2,
    mode: "OFFLINE",
    minPeople: 2,
    interests: ["diy", "making", "tech"],
  },
  {
    slug: "watch-along",
    title: "Watch-along, same start time",
    blurb: "Everyone presses play at once and the chat stays open.",
    category: "online",
    moods: ["chill", "social"],
    cost: "free",
    hours: 2,
    mode: "ONLINE",
    minPeople: 2,
    interests: ["films", "tv", "anime"],
  },
  {
    slug: "study-session",
    title: "Body-doubling session",
    blurb: "Cameras on, own work, one break in the middle. Absurdly effective.",
    category: "online",
    moods: ["chill"],
    cost: "free",
    hours: 2,
    mode: "ONLINE",
    minPeople: 2,
    interests: ["studying", "productivity", "tech"],
  },
  {
    slug: "day-trip",
    title: "Train somewhere none of you has been",
    blurb: "Pick the destination by how long the train is, not what is there.",
    category: "outdoors",
    moods: ["adventurous", "random"],
    cost: "medium",
    hours: 8,
    mode: "OFFLINE",
    minPeople: 2,
    interests: ["travel", "hiking", "photography"],
  },
] as const;

/** Budget bands, in the currency the member is thinking in. */
export const COST_LABELS: Record<CostBand, string> = {
  free: "Free",
  low: "Cheap",
  medium: "Mid-range",
  high: "A splurge",
};

/** Which bands fit a budget ceiling. Ceiling of 0 means free only. */
export function bandsWithin(ceiling: number): CostBand[] {
  if (ceiling <= 0) return ["free"];
  if (ceiling <= 10) return ["free", "low"];
  if (ceiling <= 25) return ["free", "low", "medium"];
  return ["free", "low", "medium", "high"];
}
