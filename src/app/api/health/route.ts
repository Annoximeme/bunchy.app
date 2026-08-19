import { NextResponse } from "next/server";
import { db } from "@/server/db/client";

/**
 * Liveness and readiness, in one.
 *
 * The container healthcheck and any uptime monitor hit this. It does a real
 * query rather than returning a constant, because a Next process that is
 * answering HTTP while its database connection is gone is exactly the state
 * worth restarting, and a health check that cannot detect that is decoration.
 *
 * Deliberately says nothing else. No version, no uptime, no table counts, no
 * environment: this is an unauthenticated endpoint on the public internet, and
 * everything it reveals is reconnaissance for somebody.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
