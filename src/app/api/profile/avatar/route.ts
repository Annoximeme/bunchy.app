import { errorResponse, handleAuthed } from "@/server/http/route";
import { requireViewer } from "@/server/auth/current-user";
import { validationFailed } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import { MAX_BYTES, removeAvatar, saveAvatar } from "@/server/modules/media/avatars";

/**
 * Avatar upload.
 *
 * Takes the image bytes as the request body rather than multipart form data:
 * there is exactly one field, and multipart would mean parsing a format built
 * for many.
 */
export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    // Ten a day is far more than anyone needs and still stops a loop from
    // filling the volume one 256KB write at a time.
    await consume("avatarUpload", viewer.profileId);

    // Checked before reading, so an oversized upload is refused at the header
    // rather than after it has been buffered into memory.
    const declared = Number(request.headers.get("content-length") ?? "0");
    if (declared > MAX_BYTES) {
      throw validationFailed(
        `That image is ${Math.round(declared / 1024)}KB. The limit is ${MAX_BYTES / 1024}KB.`,
      );
    }

    const bytes = new Uint8Array(await request.arrayBuffer());
    const url = await saveAvatar(viewer.profileId, bytes);

    return Response.json({ ok: true, avatarUrl: url });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Removing your picture. Falls back to the generated initials avatar. */
export async function DELETE() {
  return handleAuthed(async (viewer) => {
    await removeAvatar(viewer.profileId);
    return { ok: true };
  });
}
