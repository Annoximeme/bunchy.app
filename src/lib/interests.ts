/**
 * The starting interest taxonomy.
 *
 * Shared by the seed script, onboarding and Discover so the same slugs mean the
 * same thing everywhere. Members can always add their own; those arrive with
 * `isCustom: true` and are folded into the same table, which keeps matching and
 * search uniform rather than special-casing "official" tags.
 */

export interface InterestSeed {
  slug: string;
  label: string;
  category: string;
}

export const INTEREST_CATEGORIES = [
  "Gaming & Play",
  "Technology",
  "Screen",
  "Music",
  "Movement",
  "Outdoors",
  "Making",
  "Food & Drink",
  "Ideas",
  "Work & Building",
  "Machines",
  "Style & Culture",
] as const;

export type InterestCategory = (typeof INTEREST_CATEGORIES)[number];

const RAW: Record<InterestCategory, Array<[slug: string, label: string]>> = {
  "Gaming & Play": [
    ["gaming", "Gaming"],
    ["strategy-games", "Strategy games"],
    ["rpgs", "RPGs"],
    ["shooters", "Shooters"],
    ["co-op-games", "Co-op games"],
    ["retro-gaming", "Retro gaming"],
    ["esports", "Esports"],
    ["board-games", "Board games"],
    ["tabletop-games", "Tabletop games"],
    ["warhammer", "Warhammer"],
    ["dungeons-and-dragons", "Dungeons & Dragons"],
    ["puzzles", "Puzzles"],
  ],
  Technology: [
    ["technology", "Technology"],
    ["programming", "Programming"],
    ["ai", "AI"],
    ["open-source", "Open source"],
    ["cybersecurity", "Cybersecurity"],
    ["pc-building", "PC building"],
    ["3d-printing", "3D printing"],
    ["home-automation", "Home automation"],
    ["self-hosting", "Self-hosting"],
  ],
  Screen: [
    ["movies", "Movies"],
    ["tv", "TV"],
    ["anime", "Anime"],
    ["documentaries", "Documentaries"],
    ["sci-fi", "Sci-fi"],
    ["horror", "Horror"],
  ],
  Music: [
    ["music", "Music"],
    ["live-music", "Live music"],
    ["music-production", "Music production"],
    ["vinyl", "Vinyl"],
    ["festivals", "Festivals"],
    ["playing-an-instrument", "Playing an instrument"],
  ],
  Movement: [
    ["fitness", "Fitness"],
    ["running", "Running"],
    ["cycling", "Cycling"],
    ["climbing", "Climbing"],
    ["football", "Football"],
    ["basketball", "Basketball"],
    ["martial-arts", "Martial arts"],
    ["swimming", "Swimming"],
    ["yoga", "Yoga"],
    ["padel", "Padel"],
  ],
  Outdoors: [
    ["hiking", "Hiking"],
    ["nature", "Nature"],
    ["camping", "Camping"],
    ["travel", "Travel"],
    ["city-walks", "City walks"],
    ["gardening", "Gardening"],
    ["birdwatching", "Birdwatching"],
  ],
  Making: [
    ["photography", "Photography"],
    ["art", "Art"],
    ["drawing", "Drawing"],
    ["design", "Design"],
    ["writing", "Writing"],
    ["crafts", "Crafts"],
    ["woodworking", "Woodworking"],
    ["filmmaking", "Filmmaking"],
  ],
  "Food & Drink": [
    ["food", "Food"],
    ["cooking", "Cooking"],
    ["baking", "Baking"],
    ["coffee", "Coffee"],
    ["craft-beer", "Craft beer"],
    ["wine", "Wine"],
    ["restaurants", "Trying restaurants"],
  ],
  Ideas: [
    ["books", "Books"],
    ["philosophy", "Philosophy"],
    ["history", "History"],
    ["science", "Science"],
    ["languages", "Languages"],
    ["podcasts", "Podcasts"],
    ["psychology", "Psychology"],
  ],
  "Work & Building": [
    ["business", "Business"],
    ["entrepreneurship", "Entrepreneurship"],
    ["startups", "Startups"],
    ["investing", "Investing"],
    ["marketing", "Marketing"],
    ["freelancing", "Freelancing"],
    ["side-projects", "Side projects"],
  ],
  Machines: [
    ["cars", "Cars"],
    ["motorcycles", "Motorcycles"],
    ["diy", "DIY"],
    ["electronics", "Electronics"],
  ],
  "Style & Culture": [
    ["fashion", "Fashion"],
    ["sneakers", "Sneakers"],
    ["thrifting", "Thrifting"],
    ["museums", "Museums"],
    ["volunteering", "Volunteering"],
    ["pets", "Pets"],
  ],
};

export const INTEREST_SEEDS: InterestSeed[] = INTEREST_CATEGORIES.flatMap(
  (category) =>
    RAW[category].map(([slug, label]) => ({ slug, label, category })),
);

export const INTEREST_BY_SLUG = new Map(
  INTEREST_SEEDS.map((i) => [i.slug, i] as const),
);

/**
 * Other things people call these.
 *
 * Nobody types "Dungeons & Dragons" into a search box, and "I want to play 40k
 * tonight" has to reach Warhammer or the feature is a keyword-matcher wearing a
 * natural-language costume. Game titles are here for the same reason: they are
 * the words members actually use, and each one maps to an interest that already
 * exists rather than creating a new tag per game.
 *
 * Deliberately not exhaustive. An unknown title is handled by the parser's
 * "play <something>" rule and reported as unrecognised, which is honest,
 * inventing an interest to hold it would not be.
 */
export const INTEREST_ALIASES: Readonly<Record<string, readonly string[]>> = {
  warhammer: ["40k", "warhammer 40k", "age of sigmar", "kill team"],
  "dungeons-and-dragons": ["d&d", "dnd", "dungeons and dragons"],
  "board-games": ["boardgames", "board game", "catan", "wingspan"],
  "tabletop-games": ["tabletop", "ttrpg", "miniatures"],
  shooters: ["fps", "helldivers", "valorant", "counter-strike", "cs2", "call of duty", "apex"],
  "co-op-games": ["co-op", "coop", "deep rock", "it takes two"],
  "strategy-games": ["4x", "rts", "civ", "civilization", "total war", "starcraft"],
  rpgs: ["rpg", "jrpg", "baldur's gate", "elden ring"],
  gaming: ["video games", "videogames", "console", "playstation", "xbox", "steam deck"],
  esports: ["competitive gaming", "ranked"],
  "retro-gaming": ["retro games", "emulation", "snes"],
  anime: ["manga", "seasonal anime"],
  movies: ["film", "films", "cinema"],
  tv: ["tv shows", "series", "box set"],
  "craft-beer": ["beer", "brewery", "pub", "pints"],
  restaurants: ["dinner", "eating out", "food out"],
  coffee: ["cafe", "espresso", "flat white"],
  wine: ["wine bar", "natural wine"],
  hiking: ["hike", "walking", "rambling", "trail", "trails"],
  "city-walks": ["city walk", "wander", "stroll"],
  running: ["run", "5k", "10k", "parkrun", "marathon"],
  cycling: ["bike", "biking", "cycle", "gravel", "mtb"],
  climbing: ["bouldering", "climb", "crag"],
  fitness: ["gym", "lifting", "weights", "workout"],
  football: ["soccer", "five-a-side", "footy"],
  "martial-arts": ["bjj", "jiu jitsu", "judo", "muay thai", "boxing"],
  padel: ["padel tennis"],
  photography: ["photographer", "photo", "photos", "photowalk", "camera"],
  programming: ["coding", "code", "dev", "software"],
  ai: ["machine learning", "llms", "ml"],
  "pc-building": ["pc build", "custom pc"],
  "3d-printing": ["3d printer", "3d print"],
  "live-music": ["gig", "gigs", "concert", "concerts"],
  festivals: ["festival"],
  "playing-an-instrument": ["guitar", "piano", "drums", "bass"],
  "music-production": ["producing", "ableton", "fl studio"],
  books: ["reading", "book club", "novels"],
  "side-projects": ["side project", "building something"],
  museums: ["museum", "gallery", "exhibition"],
  pets: ["dog", "dogs", "cat", "cats", "dog walk"],
  cooking: ["cook", "meal", "recipes"],
  baking: ["bake", "sourdough"],
  camping: ["camp", "wild camping"],
  swimming: ["swim", "open water"],
  yoga: ["pilates"],
  drawing: ["sketching", "sketch"],
  writing: ["journaling"],
  languages: ["language exchange", "practice dutch", "practice french"],
};

/**
 * Interests whose natural home is online.
 *
 * Used to guess a mode when the member did not say one, and only to guess: the
 * caller records it as an assumption rather than a fact, because plenty of
 * people play these in the same room. Warhammer is pointedly absent; it is a
 * game you play at a table.
 */
export const ONLINE_FIRST_INTERESTS: ReadonlySet<string> = new Set([
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

/** Normalizes free-text into a slug for member-created interests. */
export function slugifyInterest(input: string): string {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
