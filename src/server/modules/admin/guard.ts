import { notFound } from "@/server/errors";
import { requireViewer, type Viewer } from "@/server/auth/current-user";
import { isStaffRole, type StaffRole } from "@/server/modules/admin/policy";

/**
 * Request-bound authorization for the staff surface.
 *
 * The permission *model* lives in `policy.ts` as pure functions; this file only
 * binds it to the current session. Two rules:
 *
 * 1. **Every admin entry point calls one of these.** Authorization is never
 *    inferred from the URL being under `/admin`, and never from the client
 *    having rendered a link. The services below the routes re-check too, so the
 *    boundary is the *domain*, not the transport.
 *
 * 2. **Failure looks like "not found", not "forbidden".** A 403 confirms the
 *    admin area exists and that the path is real, which is free reconnaissance.
 *    A member who is not staff gets what they would get for any missing URL.
 */

export interface StaffViewer extends Viewer {
  role: StaffRole;
}

/** Moderator or admin. The report queue and content actions. */
export async function requireStaff(): Promise<StaffViewer> {
  const viewer = await requireViewer();
  if (!isStaffRole(viewer.role)) throw notFound();
  return viewer as StaffViewer;
}

/** Admin only. Anything touching accounts, roles or platform-wide settings. */
export async function requireAdmin(): Promise<StaffViewer> {
  const viewer = await requireViewer();
  if (viewer.role !== "ADMIN") throw notFound();
  return viewer as StaffViewer;
}

/** Non-throwing checks, for deciding whether to render the staff nav entry. */
export function isStaff(viewer: Viewer | null): boolean {
  return viewer !== null && isStaffRole(viewer.role);
}

export function isAdmin(viewer: Viewer | null): boolean {
  return viewer?.role === "ADMIN";
}

export { refusalToActOn } from "@/server/modules/admin/policy";
