import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/server/auth/current-user";
import { supporterEnabled } from "@/server/env";
import { mySupport, PLANS } from "@/server/modules/supporter/service";
import { PageHeader, PageShell } from "@/components/page-header";
import { LinkButton } from "@/components/ui";
import { SupporterPitch } from "@/components/supporter/pitch";

export const metadata: Metadata = { title: "Support Bunchy" };
export const dynamic = "force-dynamic";

/**
 * The tip jar.
 *
 * Three things about this page are load-bearing, and all three are constraints
 * rather than decisions somebody makes per-render:
 *
 * **Nothing functional is behind it.** The perks are a badge, a ring and a
 * choice of app icon. /about promises that a tier making the matching better
 * for people who pay would break the only thing this product is for, so there
 * is no list of features here to be tempted into growing.
 *
 * **The money is spent in the order published.** /about says paying the
 * volunteers comes first — before features, before marketing, before anyone
 * takes a salary. The three cards say the same thing in the same order, which
 * is not the order a pitch would choose.
 *
 * **Cancelling is one click and it is said out loud.** No countdown, no
 * founder's-rate, no "only this week".
 */
export default async function SupporterPage() {
  const viewer = await requireViewer();
  const [support, open] = await Promise.all([
    mySupport(viewer.userId),
    Promise.resolve(supporterEnabled()),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Keep Bunchy free, honest, and alive."
        subtitle="No ads. No selling your data. No venture capital. Bunchy is funded directly by the people who use it. If you find value here, consider chipping in."
      />

      {support?.current ? (
        <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-7">
          <p className="text-lg font-bold tracking-tight">
            You are already keeping this running. Thank you.
          </p>
          <p className="mt-2 max-w-[60ch] leading-relaxed text-ink-soft">
            {support.cancelAtPeriodEnd
              ? "Your support is set to stop at the end of the period you have paid for, and everything stays exactly as it is until then."
              : "Nothing else changes, which is rather the point. The badge and the ring are yours while it runs."}
          </p>
          <div className="mt-6">
            <LinkButton href="/settings/supporter">Manage billing</LinkButton>
          </div>
        </section>
      ) : (
        <SupporterPitch open={open} plans={PLANS} />
      )}

      <p className="mt-10 text-sm text-muted">
        The full reasoning about money is on{" "}
        <Link href="/about" className="text-accent-ink underline underline-offset-2">
          the About page
        </Link>
        , including what will never happen.
      </p>
    </PageShell>
  );
}
