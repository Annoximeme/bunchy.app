import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import {
  assertAvailabilityEnabled,
  availabilityClusters,
  clearAvailability,
  myAvailability,
  setAvailability,
} from "@/server/modules/availability/service";
import { consume } from "@/server/ratelimit";

/**
 * Who's Up.
 *
 * The schema accepts a *preferred* lifetime, not an expiry: a number of hours
 * from a fixed list, which the service clamps to at most twice the kind's own
 * default. A client that could name an absolute expiry would eventually name one
 * a year out and turn a transient signal into a permanent availability record.
 */

const schema = z.object({
  kind: z.enum([
    "FREE_NOW",
    "FREE_TONIGHT",
    "FREE_THIS_WEEKEND",
    "LOOKING_FOR_SOMETHING",
    "LOOKING_FOR_PEOPLE",
    "UP_FOR_GAMING",
    "UP_FOR_ACTIVITIES",
    "OPEN_TO_MEETING",
  ]),
  note: z.string().trim().max(140).nullable().optional(),
  interestIds: z.array(z.string()).max(8).optional(),
  mode: z.enum(["ONLINE", "OFFLINE"]).nullable().optional(),
});

export async function GET() {
  return handleAuthed(async (viewer) => ({
    status: await myAvailability(viewer.profileId),
    clusters: await availabilityClusters(viewer.profileId),
  }));
}

export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    // Cheap to set and it replaces one row, but it is still member-visible
    // content — the note is free text that other people read.
    await consume("message", viewer.profileId);
    await assertAvailabilityEnabled(viewer.profileId);

    const input = await parseJson(request, schema);
    return { status: await setAvailability(viewer.profileId, input) };
  });
}

export async function DELETE() {
  return handleAuthed(async (viewer) => {
    await clearAvailability(viewer.profileId);
    return { ok: true };
  });
}
