import { z } from "zod";
import { handleAuthed, parseQuery } from "@/server/http/route";
import { geocoder } from "@/server/modules/geo/gazetteer";

const schema = z.object({ q: z.string().trim().max(80).default("") });

/**
 * City lookup for onboarding and bunch creation.
 *
 * Returns populated places only — there is no endpoint anywhere in this product
 * that resolves a street address, by design.
 */
export async function GET(request: Request) {
  return handleAuthed(async () => {
    const { q } = parseQuery(request, schema);
    const places = await geocoder().search(q, 8);
    return {
      places: places.map((p) => ({
        cityLabel: p.cityLabel,
        regionLabel: p.regionLabel,
        countryCode: p.countryCode,
      })),
    };
  });
}
