import { errorResponse } from "@/server/http/route";
import { requireStaff } from "@/server/modules/admin/guard";
import { findAsset } from "@/server/modules/brand/assets";
import { notFound } from "@/server/errors";

/**
 * Logo downloads.
 *
 * Behind the staff guard, like the rest of /admin — not because a logo is a
 * secret, but because "where do I get the logo" is a staff question until there
 * is a press page, and a public asset endpoint is a thing to keep working
 * forever. Moving these to a public /brand page later is a copy of this route
 * with the guard removed.
 *
 * Raw Response rather than `handle`, which serialises to JSON.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ asset: string }> },
) {
  try {
    await requireStaff();
    const { asset: slug } = await context.params;

    const asset = findAsset(slug);
    // The slug is matched against a fixed list rather than used to build a
    // path, so there is nothing here to traverse out of.
    if (!asset) throw notFound("No such asset.");

    return new Response(asset.build(), {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${asset.slug}"`,
        // Generated from code that ships with the app, so it changes exactly
        // when a deploy changes it.
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
