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

/** Normalizes free-text into a slug for member-created interests. */
export function slugifyInterest(input: string): string {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
