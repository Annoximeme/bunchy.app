"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { errorMessage } from "@/lib/api";

/**
 * Picking a profile picture.
 *
 * The compression happens here, in the browser, before a byte crosses the
 * network. A phone camera produces 4–8MB; this uploads roughly 40KB of it. That
 * is not only about disk — it is the difference between an upload that works on
 * a train and one that times out.
 *
 * The server enforces the same limit again and does not trust any of this. A
 * client-side check is a courtesy to honest users, never a control.
 */

/** Matches MAX_DIMENSION on the server. Twice any size we ever display. */
const MAX_DIMENSION = 512;

/** Visually indistinguishable from 1.0 at this size, roughly a third the bytes. */
const QUALITY = 0.85;

async function compress(file: File): Promise<Blob> {
  // `imageOrientation` applies the EXIF rotation. Without it, half of all phone
  // portraits arrive sideways — the tag is dropped by the re-encode, so the
  // rotation has to be baked in here.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not process that image.");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    // WebP is ~30% smaller than JPEG at the same quality and is supported
    // everywhere that matters; the callback receives PNG if it is not, which is
    // larger but still correct, and the size cap catches it either way.
    canvas.toBlob(resolve, "image/webp", QUALITY);
  });

  if (!blob) throw new Error("Your browser could not process that image.");
  return blob;
}

export function AvatarUpload({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function onPick(file: File) {
    setPending(true);
    setError(null);
    try {
      const blob = await compress(file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? "That upload didn't work.");
      }

      const { avatarUrl: next } = await response.json();
      setPreview(next);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setPending(true);
    setError(null);
    try {
      await fetch("/api/profile/avatar", { method: "DELETE" });
      setPreview(null);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  const shown = preview ?? avatarUrl;

  /*
    A narrow column, sized to the avatar and nothing wider.

    This sits in the profile header next to the name, where the plain <Avatar>
    used to be. An earlier version put the buttons and an explanatory paragraph
    in a row beside the picture, which pushed the name block sideways and wrapped
    it — the control has to occupy the same footprint as the image it replaces.
    The explanation moved to the button's tooltip: it matters once, while you are
    deciding to click, and never again.
  */
  return (
    <div className="flex w-fit shrink-0 flex-col items-center gap-1.5">
      <Avatar name={displayName} src={shown} size="xl" />

      <div className="flex items-center gap-1.5 text-xs">
        <button
          type="button"
          disabled={pending}
          onClick={() => input.current?.click()}
          title={`JPEG, PNG or WebP. Resized to ${MAX_DIMENSION}px and compressed on your device before it is sent. A phone photo ends up around 40KB.`}
          className="font-medium text-accent-ink transition-opacity hover:underline disabled:opacity-55"
        >
          {pending ? "Working…" : shown ? "Change" : "Upload"}
        </button>
        {shown && !pending && (
          <>
            <span aria-hidden className="text-muted">
              ·
            </span>
            <button
              type="button"
              onClick={remove}
              className="text-muted transition-colors hover:text-ink"
            >
              Remove
            </button>
          </>
        )}
      </div>

      {error && (
        <p className="max-w-40 text-center text-xs text-danger">{error}</p>
      )}

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onPick(file);
        }}
      />
    </div>
  );
}
