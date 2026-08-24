import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { consume } from "@/server/ratelimit";
import { surpriseMe } from "@/server/modules/matching/serendipity";
import { getProfileByUsername } from "@/server/modules/profile/service";
import { db } from "@/server/db/client";

const schema = z.object({
  /** Profiles already seen this session, so "another" moves on. */
  exclude: z.array(z.string()).max(20).default([]),
});

/**
 * One unexpected match.
 *
 * POST rather than GET because it takes the list of people already shown, and
 * because a URL that returns a different person on every load is a URL that
 * cannot be shared or cached honestly.
 *
 * Rate limited on the AI rule: it scores the whole candidate pool, and a button
 * labelled "another one" is exactly the kind of thing somebody holds down.
 */
export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    await consume("assistant", viewer.profileId);
    const { exclude } = await parseJson(request, schema);

    const match = await surpriseMe(viewer.profileId, { exclude });
    if (!match) return { match: null };

    // The scorer works in profile ids; the card needs a person. Loaded through
    // the ordinary serializer so privacy settings (exact age, location) are
    // applied exactly as they are everywhere else.
    const row = await db.profile.findUnique({
      where: { id: match.profileId },
      select: { username: true },
    });
    if (!row) return { match: null };

    const person = await getProfileByUsername(row.username, viewer.profileId);

    return {
      match: {
        ...match,
        person: {
          username: person.username,
          displayName: person.displayName,
          avatarUrl: person.avatarUrl,
          age: person.age,
          ageBand: person.ageBand,
          locationLabel: person.locationLabel,
          bio: person.bio,
          goals: person.goals,
        },
      },
    };
  });
}
