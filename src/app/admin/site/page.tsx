import type { Metadata } from "next";
import { requireAdmin } from "@/server/modules/admin/guard";
import { previewToken, readGate } from "@/server/modules/admin/site-gate";
import { AdminHeader, Panel } from "@/components/admin/primitives";
import { SiteGateControl } from "@/components/admin/site-gate-control";

export const metadata: Metadata = { title: "Public site" };
export const dynamic = "force-dynamic";

/**
 * The one page in the dashboard that can turn the product off.
 *
 * Admin-only. Every other control here acts on a single account, bunch or
 * message; this one acts on everyone at once, and a moderator recruited to work
 * the report queue has no reason to hold it.
 *
 * The switch is the same pair of flag files `./maintenance.sh` writes, so the
 * dashboard and the shell agree by construction rather than by convention.
 */
export default async function AdminSitePage() {
  await requireAdmin();
  const mode = readGate();
  const tokenConfigured = previewToken() !== null;

  return (
    <>
      <AdminHeader
        title="Public site"
        subtitle="Whether people who are not signed in can reach Bunchy at all."
      />

      <Panel
        title="Visibility"
        note="Takes effect on the next request. No deploy, no restart. The app keeps running behind the gate, which is why you keep your own access."
      >
        <SiteGateControl current={mode} tokenConfigured={tokenConfigured} />
      </Panel>

      <Panel title="What the public sees" className="mt-6">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-ink">Public</dt>
            <dd className="mt-1 text-muted">
              The site, as normal. HTTP 200.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Coming soon</dt>
            <dd className="mt-1 text-muted">
              The coming-soon page, HTTP 503 with a one-day retry. Keeps an
              unlaunched site out of search results.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Maintenance</dt>
            <dd className="mt-1 text-muted">
              The maintenance page, HTTP 503 with a ten-minute retry. It says
              &ldquo;back in a few minutes&rdquo;, so it should be true.
            </dd>
          </div>
        </dl>
        <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
          Both pages are also served automatically, by the proxy, whenever the
          app itself is unreachable, during a deploy, for instance. That does
          not depend on this switch.
        </p>
      </Panel>
    </>
  );
}
