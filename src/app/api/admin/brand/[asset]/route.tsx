import { ImageResponse } from "next/og";
import { errorResponse } from "@/server/http/route";
import { requireStaff } from "@/server/modules/admin/guard";
import { findAsset } from "@/server/modules/brand/assets";
import { notFound } from "@/server/errors";

/**
 * Logo downloads, as PNG or SVG.
 *
 * The PNGs are rasterised here from the same generated vector, rather than
 * being binary files in the repository. Same reason the vectors are generated:
 * an exported PNG sitting in git is a logo that agrees with the code until
 * somebody changes one of them, and it is always the file that loses.
 *
 * Behind the staff guard like the rest of /admin. Making these public later is
 * this route with the guard removed.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ asset: string }> },
) {
  try {
    await requireStaff();
    const { asset: slug } = await context.params;

    const asset = findAsset(slug);
    // Matched against a fixed list rather than used to build a path, so there
    // is nothing here to traverse out of.
    if (!asset) throw notFound("No such asset.");

    if (asset.format === "svg") {
      return new Response(asset.svg(), {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${asset.slug}"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    // Satori draws the vector from a data URI. `contain` rather than `cover`,
    // so a ratio mistake shows as letterboxing instead of a silently cropped
    // logo, and the ratios are derived from the viewBoxes precisely so it
    // never letterboxes.
    const encoded = Buffer.from(asset.svg(), "utf8").toString("base64");

    // Pixels derived from the height, not a percentage. A CSS percentage
    // padding resolves against the *width* on every side, so on a 1600×452
    // cover an "8%" inset ate 128px off a 452px height and the logo came out
    // letterboxed in the middle of a mostly empty canvas.
    const padding = asset.background
      ? Math.round((asset.height ?? 0) * 0.08)
      : 0;

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding,
            // Undefined leaves the PNG's alpha channel intact, which is what
            // makes the transparent variants useful over a photograph.
            background: asset.background ?? "transparent",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/svg+xml;base64,${encoded}`}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
      ),
      {
        width: asset.width,
        height: asset.height,
        headers: {
          "Content-Disposition": `attachment; filename="${asset.slug}"`,
          "Cache-Control": "private, max-age=300",
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
