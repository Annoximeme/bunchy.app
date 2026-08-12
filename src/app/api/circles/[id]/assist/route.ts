import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import { db } from "@/server/db/client";
import { forbidden } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import { assistant } from "@/server/modules/ai";

const schema = z.object({ task: z.enum(["summary", "activity_idea"]) });

/**
 * Bunchy AI, scoped to one circle.
 *
 * Both tasks are pull-only: a member asks, and gets an answer about their own
 * circle. Nothing here runs on a schedule or arrives unrequested.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await context.params;
    const { task } = await parseJson(request, schema);

    await consume("aiAssist", viewer.profileId);

    const membership = await db.circleMembership.findUnique({
      where: { circleId_profileId: { circleId: id, profileId: viewer.profileId } },
      select: { status: true },
    });
    if (membership?.status !== "ACTIVE") {
      throw forbidden("You're not a member of this circle.");
    }

    const circle = await db.circle.findUniqueOrThrow({
      where: { id },
      select: {
        name: true,
        cityLabel: true,
        interests: { select: { interest: { select: { label: true } } } },
      },
    });

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = await db.circleMessage.findMany({
      where: {
        circleId: id,
        kind: "TEXT",
        deletedAt: null,
        createdAt: { gte: since },
      },
      select: {
        body: true,
        createdAt: true,
        author: { select: { displayName: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    if (task === "summary") {
      const summary = await assistant().summarizeConversation({
        circleName: circle.name,
        messages: recent.map((m) => ({
          author: m.author?.displayName ?? "Someone",
          body: m.body,
          createdAt: m.createdAt,
        })),
      });
      return { summary };
    }

    const suggestion = await assistant().suggestActivity({
      circleName: circle.name,
      interests: circle.interests.map((i) => i.interest.label),
      cityLabel: circle.cityLabel,
      recentMessages: recent.map((m) => m.body),
    });

    return { suggestion };
  });
}
