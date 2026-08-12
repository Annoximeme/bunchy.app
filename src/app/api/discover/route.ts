import { handleAuthed } from "@/server/http/route";
import { recommendPeople } from "@/server/modules/matching/engine";
import { recommendCircles } from "@/server/modules/matching/circles";
import { recommendActivities } from "@/server/modules/matching/activities";

/**
 * Everything Discover needs, in one round trip.
 *
 * Note there is no `page` or `cursor` parameter. Discover answers "who should I
 * meet?" and "what should I do?" with a finite, considered set — an endpoint
 * that could always return more is the beginning of an infinite feed.
 */
export async function GET() {
  return handleAuthed(async (viewer) => {
    const [people, circles, activities] = await Promise.all([
      recommendPeople(viewer.profileId, { limit: 8 }),
      recommendCircles(viewer.profileId, 6),
      recommendActivities(viewer.profileId, 6),
    ]);

    return { people, circles, activities };
  });
}
