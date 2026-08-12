import { z } from "zod";
import { handleAuthed, parseQuery } from "@/server/http/route";
import { db } from "@/server/db/client";
import { INTEREST_SEEDS } from "@/lib/interests";

const schema = z.object({
  q: z.string().trim().max(60).optional(),
});

/**
 * The interest catalog, merged with member-created tags.
 *
 * Custom interests only surface once a few people use them, so the picker stays
 * a useful shared vocabulary instead of a list of one-off typos.
 */
const CUSTOM_VISIBILITY_THRESHOLD = 3;

export async function GET(request: Request) {
  return handleAuthed(async () => {
    const { q } = parseQuery(request, schema);

    const custom = await db.interest.findMany({
      where: {
        isCustom: true,
        usageCount: { gte: CUSTOM_VISIBILITY_THRESHOLD },
        ...(q ? { label: { contains: q, mode: "insensitive" } } : {}),
      },
      select: { slug: true, label: true, category: true },
      orderBy: { usageCount: "desc" },
      take: 30,
    });

    const needle = q?.toLowerCase();
    const catalog = needle
      ? INTEREST_SEEDS.filter(
          (i) =>
            i.label.toLowerCase().includes(needle) ||
            i.category.toLowerCase().includes(needle),
        )
      : INTEREST_SEEDS;

    return { interests: [...catalog, ...custom] };
  });
}
