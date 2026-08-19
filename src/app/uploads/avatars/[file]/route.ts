import { readFile } from "node:fs/promises";
import { requireViewer } from "@/server/auth/current-user";
import { errorResponse } from "@/server/http/route";
import { notFound } from "@/server/errors";
import {
  avatarPath,
  contentTypeFor,
  isSafeAvatarFilename,
} from "@/server/modules/media/avatars";

/**
 * Serving uploaded avatars.
 *
 * Behind a session, like every other member-generated thing here. /safety
 * promises that signed-out visitors and search engines see the marketing pages
 * and nothing else, and a photograph of a member served from an open URL would
 * make that untrue, the URL is unguessable, but "unguessable" is not the same
 * promise as "not public".
 *
 * Filenames are validated against the exact pattern this app writes before they
 * are joined to a path, so `..%2f..%2fetc%2fpasswd` never becomes a read.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> },
) {
  try {
    await requireViewer();
    const { file } = await context.params;

    if (!isSafeAvatarFilename(file)) throw notFound("No such image.");

    let bytes: Buffer;
    try {
      bytes = await readFile(avatarPath(file));
    } catch {
      throw notFound("No such image.");
    }

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentTypeFor(file),
        // The filename changes on every upload, so a cached copy can never be
        // stale. Private, because the response is member content behind a
        // session and must not land in a shared cache.
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Length": String(bytes.byteLength),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
