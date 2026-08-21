import { handleAuthed } from "@/server/http/route";
import {
  endSeries,
  joinSeries,
  leaveSeries,
} from "@/server/modules/activities/series";

/**
 * Holding a standing arrangement, stepping out of one, and ending one.
 *
 * Three verbs on one resource rather than three routes, because they are the
 * same noun and HTTP already has the vocabulary: POST takes it on, DELETE steps
 * out of it, and PATCH ends it outright.
 *
 * The split between DELETE and PATCH is the important one and it is not
 * cosmetic. Leaving is something any member does to their own membership.
 * Ending is something only the organiser does to everybody's, and it is not a
 * deletion at all: the series is marked ended and every occurrence it produced
 * stays, because a bunch that met every Thursday for a year did that and the
 * record should say so. Putting both behind DELETE would have made the
 * dangerous one look like the safe one.
 */

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await params;
    await joinSeries(id, viewer.profileId);
    return { ok: true };
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await params;
    // Deliberately leaves any occurrence already joined alone. Somebody
    // stepping out of the arrangement may still be coming this Thursday, and
    // cancelling that for them would be the product deciding what they meant.
    await leaveSeries(id, viewer.profileId);
    return { ok: true };
  });
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleAuthed(async (viewer) => {
    const { id } = await params;
    // Refuses anybody who is not the organiser. The guard is in the service so
    // it holds however this is reached.
    await endSeries(id, viewer.profileId);
    return { ok: true };
  });
}
