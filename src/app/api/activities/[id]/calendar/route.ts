import { requireViewer } from "@/server/auth/current-user";
import { errorResponse } from "@/server/http/route";
import { env } from "@/server/env";
import {
  calendarFilename,
  toICalendar,
} from "@/server/modules/activities/calendar";
import { getActivity } from "@/server/modules/activities/service";

/**
 * The activity as a .ics download.
 *
 * Not wrapped in `handleAuthed` like every other route here, because that
 * serialises its return value to JSON and this has to be a calendar file with
 * its own content type. The error path still goes through `errorResponse`, so a
 * missing activity is a 404 in the same shape as everywhere else.
 *
 * Authorisation is `getActivity`'s, unchanged: it throws for an activity the
 * viewer cannot see, and blanks the meeting link for anyone who has not
 * actually joined.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const viewer = await requireViewer();
    const { id } = await context.params;
    const activity = await getActivity(id, viewer.profileId);

    return new Response(toICalendar(activity, { origin: env().APP_URL }), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${calendarFilename(activity)}"`,
        // Contains a meeting link for people who joined. Nothing between here
        // and the browser should keep a copy.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
