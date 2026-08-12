import { db } from "@/server/db/client";
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
 * Two things happen here that cannot happen in a pure function: the interest
 * catalogue is loaded, and a named place is geocoded. Both read local data — a
 * database table and a built-in gazetteer — so resolving a request costs a
 * couple of indexed queries and nothing else. There is no metered call on this
 * path, or on any path.
 *
 * An earlier version asked a hosted model for a second reading when the grammar
 * came up empty. That is gone: it billed per request for a question the grammar
 * answers correctly nearly all the time, and the failure mode it was meant to
 * cover — a sentence with no recognisable interest in it — is now handled by
 * saying so and offering the interest picker, which is both free and clearer.
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
}

export interface ResolveOptions {
  now?: Date;
  timezone?: string | null;
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

  const [interests, place] = await Promise.all([
    lookupInterests(intent.interestSlugs, catalogue),
    resolvePlace(intent.placeHint),
  ]);

  return { ...intent, interests, place };
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
