import { db } from "@/server/db/client";
import { assistant } from "@/server/modules/ai/index";
import { geocoder } from "@/server/modules/geo/gazetteer";
import { snapToGrid } from "@/server/modules/geo/precision";
import { parseIntent } from "@/server/modules/intent/parse";
import type {
  IntentCatalogue,
  IntentInterest,
  SocialIntent,
} from "@/server/modules/intent/types";

/**
 * The parser, wired to the world.
 *
 * Three things happen here that cannot happen in a pure function: the interest
 * catalogue is loaded, a named place is geocoded, and — only when the grammar
 * came up empty — an assistant is asked for a second reading.
 *
 * That last condition is the whole cost model. An LLM call per keystroke would
 * be slow and expensive for a question the grammar answers correctly most of the
 * time, so the model is a fallback for the sentences that defeated it rather
 * than the first thing tried. In practice that is "I want to do something fun
 * with people who get it", not "hiking Saturday".
 */

export interface ResolvedIntent extends SocialIntent {
  /** Catalogue rows for `interestSlugs`, in the same order. */
  interests: Array<{ interestId: string; slug: string; label: string }>;
  /** The resolved place, when one was named and recognised. */
  place: {
    cityLabel: string;
    regionLabel: string;
    countryCode: string;
    approxLat: number;
    approxLng: number;
  } | null;
  /** True when an assistant contributed. Surfaced so the reading can be doubted. */
  assisted: boolean;
}

export interface ResolveOptions {
  now?: Date;
  timezone?: string | null;
  /**
   * Whether an assistant may be consulted when the grammar finds nothing.
   * Off for background jobs, and off when the member has AI help switched off.
   */
  allowAssistant?: boolean;
}

export async function resolveIntent(
  text: string,
  options: ResolveOptions = {},
): Promise<ResolvedIntent> {
  const catalogue = await interestCatalogue();
  const intent = parseIntent(text, catalogue, {
    now: options.now,
    timezone: options.timezone,
  });

  let assisted = false;
  if (
    options.allowAssistant !== false &&
    intent.interestSlugs.length === 0 &&
    intent.goals.length === 0
  ) {
    assisted = await askAssistant(text, intent, catalogue);
  }

  const [interests, place] = await Promise.all([
    lookupInterests(intent.interestSlugs, catalogue),
    resolvePlace(intent.placeHint),
  ]);

  return { ...intent, interests, place, assisted };
}

/**
 * Lets an assistant have a go, and folds in only what survives validation.
 *
 * Mutates `intent` because the caller wants one object, not a merge dance — but
 * note what it can and cannot touch: interests (validated against the
 * catalogue) and the topic (a string, shown to the member, used to name a
 * bunch). Time, place, mode and group size stay with the grammar.
 */
async function askAssistant(
  text: string,
  intent: SocialIntent,
  catalogue: IntentCatalogue,
): Promise<boolean> {
  let reading;
  try {
    reading = await assistant().readIntent({
      text,
      catalogue: catalogue.interests.map((i) => ({ slug: i.slug, label: i.label })),
    });
  } catch (error) {
    // A provider outage must not break the product's primary action.
    console.error("intent: assistant reading failed", error);
    return false;
  }
  if (!reading) return false;

  const bySlug = new Map(catalogue.interests.map((i) => [i.slug, i] as const));
  const accepted = reading.interestSlugs.filter((slug) => bySlug.has(slug));
  if (accepted.length === 0 && !reading.topic) return false;

  intent.interestSlugs.push(...accepted);
  if (!intent.topic && reading.topic) intent.topic = reading.topic;

  // Said out loud, because a reading the member cannot see is a reading they
  // cannot correct.
  intent.notes.push(
    accepted.length > 0
      ? `Bunchy read this as ${accepted.map((s) => bySlug.get(s)!.label).join(", ")}.`
      : "Bunchy had a guess at what this is about.",
  );
  // Anything the assistant explained is no longer an unexplained leftover.
  intent.unrecognised = [];

  return true;
}

// --- The catalogue ----------------------------------------------------------

/**
 * Interests change rarely — a member adding a custom one is the only writer —
 * so the list is held in process for a few minutes rather than queried on every
 * keystroke. The cost is that a brand-new custom interest is not searchable for
 * up to five minutes, which is a fair trade against a query per parse.
 */
const CATALOGUE_TTL_MS = 5 * 60 * 1000;
/** Well past the seeded taxonomy, and a hard ceiling on the scan cost. */
const CATALOGUE_LIMIT = 2000;

let cached: { at: number; value: IntentCatalogue } | undefined;

/** Test seam, and the hook for invalidating after a custom interest is added. */
export function clearIntentCatalogue(): void {
  cached = undefined;
}

export async function interestCatalogue(): Promise<IntentCatalogue> {
  if (cached && Date.now() - cached.at < CATALOGUE_TTL_MS) return cached.value;

  const rows = await db.interest.findMany({
    where: { status: "APPROVED" },
    select: { id: true, slug: true, label: true, aliases: true },
    orderBy: { usageCount: "desc" },
    take: CATALOGUE_LIMIT,
  });

  const interests: IntentInterest[] = rows.map((row) => ({
    interestId: row.id,
    slug: row.slug,
    label: row.label,
    // From the database, not the seed constant: aliases are editable in the
    // admin area and merging one interest into another records the old name
    // here. Reading the constant instead would quietly ignore both.
    aliases: row.aliases,
  }));

  cached = { at: Date.now(), value: { interests } };
  return cached.value;
}

function lookupInterests(
  slugs: string[],
  catalogue: IntentCatalogue,
): Array<{ interestId: string; slug: string; label: string }> {
  const bySlug = new Map(catalogue.interests.map((i) => [i.slug, i] as const));
  return slugs.flatMap((slug) => {
    const found = bySlug.get(slug);
    return found
      ? [{ interestId: found.interestId, slug: found.slug, label: found.label }]
      : [];
  });
}

// --- Places -----------------------------------------------------------------

/**
 * A named place, snapped to the same coarse grid every stored location uses.
 *
 * Going through `snapToGrid` matters even though this coordinate came from a
 * gazetteer rather than a person: it keeps searching "near Ghent" and being
 * *in* Ghent on the same grid, so distances compare like with like.
 */
async function resolvePlace(hint: string | null): Promise<ResolvedIntent["place"]> {
  if (!hint) return null;

  try {
    const [match] = await geocoder().search(hint, 1);
    if (!match) return null;

    const { approxLat, approxLng } = snapToGrid(match.lat, match.lng);
    return {
      cityLabel: match.cityLabel,
      regionLabel: match.regionLabel,
      countryCode: match.countryCode,
      approxLat,
      approxLng,
    };
  } catch (error) {
    console.error("intent: place lookup failed", error);
    return null;
  }
}
