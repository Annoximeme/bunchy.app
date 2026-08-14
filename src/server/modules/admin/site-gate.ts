import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { validationFailed } from "@/server/errors";
import { recordModerationEvent } from "@/server/modules/admin/audit";
import type { StaffViewer } from "@/server/modules/admin/guard";
import { env } from "@/server/env";

/**
 * The switch that takes the public site down.
 *
 * State is two marker files in a directory mounted into both this container and
 * Caddy's. Caddy tests for them on every request, so a change here takes effect
 * on the next request with no restart and no deploy.
 *
 * Files rather than a database row, deliberately. The same switch has to work
 * when the app is not running — that is half of what it is for — and a gate
 * whose state lives in Postgres cannot be read by the proxy that has to serve
 * the page when Postgres is unreachable. It also means `./maintenance.sh` on
 * the host and this dashboard are the same mechanism rather than two that
 * disagree.
 *
 * The corresponding cost is that this module knows a path Caddy also knows.
 * That coupling is real; it is written down in docker-compose.yml at both
 * mounts, and it is cheaper than two sources of truth for "is the site up".
 */

const FLAG_DIR = process.env.GATE_FLAG_DIR ?? "/srv/flags";

export type GateMode = "OFF" | "SOON" | "MAINTENANCE";

const FILES: Record<Exclude<GateMode, "OFF">, string> = {
  SOON: "SOON",
  MAINTENANCE: "ON",
};

export function readGate(): GateMode {
  if (existsSync(path.join(FLAG_DIR, FILES.SOON))) return "SOON";
  if (existsSync(path.join(FLAG_DIR, FILES.MAINTENANCE))) return "MAINTENANCE";
  return "OFF";
}

/**
 * Whether an admin can be let back in after flipping the switch.
 *
 * Caddy recognises exactly one bypass — a cookie carrying `PREVIEW_TOKEN` — so
 * without that token configured, turning the gate on locks out the person who
 * turned it on, and every other admin, from the dashboard containing the
 * off switch. Recovery would mean SSH.
 *
 * So a missing token is not a degraded mode, it is a refusal.
 */
export function previewToken(): string | null {
  const token = env().PREVIEW_TOKEN;
  return token && token.length > 0 ? token : null;
}

export interface GateChange {
  mode: GateMode;
  /** The cookie value to hand back, so the actor keeps their own access. */
  token: string | null;
}

export async function setGate(
  actor: StaffViewer,
  mode: GateMode,
): Promise<GateChange> {
  const previous = readGate();
  const token = previewToken();

  if (mode !== "OFF" && !token) {
    throw validationFailed(
      "PREVIEW_TOKEN is not configured, so turning the site off would lock " +
        "you out of this page with no way back in except SSH. Set it in .env " +
        "and redeploy first.",
    );
  }

  await mkdir(FLAG_DIR, { recursive: true });

  // Clear both first so the two flags can never be set at once — Caddy checks
  // SOON before ON, so a stale ON underneath would silently become the state
  // the moment SOON was lifted.
  await rm(path.join(FLAG_DIR, FILES.SOON), { force: true });
  await rm(path.join(FLAG_DIR, FILES.MAINTENANCE), { force: true });

  if (mode !== "OFF") {
    await writeFile(path.join(FLAG_DIR, FILES[mode]), "", { mode: 0o664 });
  }

  await recordModerationEvent({
    actor,
    action: "SITE_GATE_CHANGED",
    targetType: "SITE",
    targetId: "public",
    reason: `Public site: ${previous} → ${mode}`,
    metadata: { from: previous, to: mode },
  });

  return { mode, token };
}
