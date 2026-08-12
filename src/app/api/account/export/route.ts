import { requireViewer } from "@/server/auth/current-user";
import { errorResponse } from "@/server/http/route";
import { exportAccount } from "@/server/modules/account/export";

/**
 * Download everything Bunchy holds about you.
 *
 * Returned as a file rather than a JSON body so the browser saves it, and
 * without pagination or a background job — at member scale the whole account
 * fits in one response, and "we'll email you a link within 30 days" is the
 * shape data export takes when a product would rather you didn't bother.
 */
export async function GET() {
  try {
    const viewer = await requireViewer();
    const data = await exportAccount(viewer.userId);
    const stamp = new Date().toISOString().slice(0, 10);

    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="bunchy-${data.profile?.username ?? "account"}-${stamp}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
