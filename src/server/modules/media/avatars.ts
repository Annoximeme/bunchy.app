import { randomBytes } from "node:crypto";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/server/db/client";
import { validationFailed } from "@/server/errors";

/**
 * Avatar uploads, on a disk that must not fill up.
 *
 * There is no object storage on this deployment and no budget for one, so
 * images live on a mounted volume next to the app. That makes "how big can this
 * get" a question with an answer rather than a bill, and the answer is enforced
 * in three places:
 *
 *   1. The browser downscales and re-encodes before uploading, so a 12MP phone
 *      photo arrives as ~50KB of WebP rather than 6MB of JPEG.
 *   2. This module refuses anything over MAX_BYTES, because a browser is not a
 *      trustworthy place to enforce a limit — a hand-written POST skips step 1
 *      entirely.
 *   3. One file per member, and the previous one is deleted on replace. Storage
 *      is therefore bounded by member count, not by how often people fiddle
 *      with their picture.
 *
 * At the 256KB ceiling, ten thousand members is 2.5GB worst case and closer to
 * 600MB in practice. The volume is on a 96GB disk.
 */

/** Generous for a 512px WebP (typically 30–80KB), tight enough to bound growth. */
export const MAX_BYTES = 256 * 1024;

/** Square, and no larger than any avatar is ever displayed. */
export const MAX_DIMENSION = 512;

const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? "./uploads";
const AVATAR_DIR = path.join(UPLOAD_ROOT, "avatars");

/** Public path prefix. Served by the route at src/app/uploads/avatars. */
const PUBLIC_PREFIX = "/uploads/avatars";

interface Format {
  ext: string;
  contentType: string;
  /** Leading bytes that prove the file really is what it claims. */
  matches: (bytes: Uint8Array) => boolean;
}

/**
 * Content sniffing, not header trust.
 *
 * A `Content-Type: image/webp` header costs an attacker nothing to write. What
 * matters is that the bytes are an image and not, say, an SVG — which is a
 * document that can carry script, and which is deliberately absent from this
 * list for that reason.
 */
const FORMATS: Format[] = [
  {
    ext: "webp",
    contentType: "image/webp",
    matches: (b) =>
      b.length > 12 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50, // WEBP
  },
  {
    ext: "jpg",
    contentType: "image/jpeg",
    matches: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: "png",
    contentType: "image/png",
    matches: (b) =>
      b.length > 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
];

export function detectFormat(bytes: Uint8Array): Format | null {
  return FORMATS.find((f) => f.matches(bytes)) ?? null;
}

/** Filenames this module produces, and nothing else. */
const FILENAME = /^[a-z0-9]+-[a-f0-9]{16}\.(webp|jpg|png)$/;

export function isSafeAvatarFilename(name: string): boolean {
  return FILENAME.test(name);
}

export function contentTypeFor(filename: string): string {
  const ext = filename.split(".").pop();
  return (
    FORMATS.find((f) => f.ext === ext)?.contentType ?? "application/octet-stream"
  );
}

export function avatarPath(filename: string): string {
  return path.join(AVATAR_DIR, filename);
}

/**
 * Writes the new avatar, points the profile at it, then removes the old file.
 *
 * That order matters: a crash between the write and the update leaves an orphan
 * file, which is wasted bytes. The other order would leave a profile pointing at
 * a file that no longer exists, which is a broken picture on someone's page.
 */
export async function saveAvatar(
  profileId: string,
  bytes: Uint8Array,
): Promise<string> {
  if (bytes.length === 0) throw validationFailed("That file is empty.");
  if (bytes.length > MAX_BYTES) {
    throw validationFailed(
      `That image is ${Math.round(bytes.length / 1024)}KB. The limit is ${MAX_BYTES / 1024}KB.`,
    );
  }

  const format = detectFormat(bytes);
  if (!format) {
    throw validationFailed("That doesn't look like a JPEG, PNG or WebP image.");
  }

  await mkdir(AVATAR_DIR, { recursive: true });

  // Random rather than derived from the profile id: the file is served from a
  // stable path, and a predictable name would let a cached copy of someone's
  // previous picture be fetched after they replaced it.
  const filename = `${profileId.toLowerCase().replace(/[^a-z0-9]/g, "")}-${randomBytes(8).toString("hex")}.${format.ext}`;
  await writeFile(avatarPath(filename), bytes, { mode: 0o644 });

  const previous = await db.profile.findUnique({
    where: { id: profileId },
    select: { avatarUrl: true },
  });

  await db.profile.update({
    where: { id: profileId },
    data: { avatarUrl: `${PUBLIC_PREFIX}/${filename}` },
  });

  await removeIfOurs(previous?.avatarUrl ?? null);

  return `${PUBLIC_PREFIX}/${filename}`;
}

export async function removeAvatar(profileId: string): Promise<void> {
  const previous = await db.profile.findUnique({
    where: { id: profileId },
    select: { avatarUrl: true },
  });

  await db.profile.update({
    where: { id: profileId },
    data: { avatarUrl: null },
  });

  await removeIfOurs(previous?.avatarUrl ?? null);
}

/**
 * Deletes a file only if the stored value is one we wrote. Members can still
 * have a remote URL from before uploads existed, and unlinking based on an
 * arbitrary stored string is how a path traversal turns into a deletion.
 */
async function removeIfOurs(storedUrl: string | null): Promise<void> {
  if (!storedUrl || !storedUrl.startsWith(`${PUBLIC_PREFIX}/`)) return;

  const filename = storedUrl.slice(PUBLIC_PREFIX.length + 1);
  if (!isSafeAvatarFilename(filename)) return;

  await unlink(avatarPath(filename)).catch(() => {
    // Already gone is the outcome we wanted.
  });
}

/** Operational visibility: what this directory is costing. */
export async function avatarStorageUsage(): Promise<{
  files: number;
  bytes: number;
}> {
  try {
    const names = await readdir(AVATAR_DIR, { withFileTypes: true });
    const { stat } = await import("node:fs/promises");
    let bytes = 0;
    let files = 0;
    for (const entry of names) {
      if (!entry.isFile()) continue;
      files += 1;
      bytes += (await stat(avatarPath(entry.name))).size;
    }
    return { files, bytes };
  } catch {
    return { files: 0, bytes: 0 };
  }
}
