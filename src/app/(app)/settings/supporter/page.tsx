import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/server/auth/current-user";
import { mySupport } from "@/server/modules/supporter/service";
import { PageHeader, PageShell } from "@/components/page-header";
import { LinkButton } from "@/components/ui";
import { ManageBillingButton } from "@/components/supporter/manage-billing";

export const metadata: Metadata = { title: "Support" };
export const dynamic = "force-dynamic";

/**
 * Billing, and the way out of it.
 *
 * The guardrail this page exists for: cancelling must be as easy to find as
 * paying was. So "Manage billing" is the first control, it goes straight to
 * Stripe's portal where cancelling takes one click, and there is no retention
 * step, no "are you sure", and nothing to email.
 */
export default async function SupporterSettingsPage() {
  const viewer = await requireViewer();
  const support = await mySupport(viewer.userId);

  return (
    <PageShell>
      <PageHeader title="Support" subtitle="What you are paying, and how to stop." />

      {support ? (
        <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-7">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted">Status</dt>
              <dd className="mt-1 font-semibold">
                {support.cancelAtPeriodEnd
                  ? "Ending at the end of this period"
                  : support.status === "ACTIVE"
                    ? "Active"
                    : support.status === "PAST_DUE"
                      ? "Payment failed, Stripe is retrying"
                      : "Ended"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">
                {support.cancelAtPeriodEnd ? "Cosmetics last until" : "Renews"}
              </dt>
              <dd className="mt-1 font-semibold">
                {support.currentPeriodEnd
                  ? support.currentPeriodEnd.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Not set"}
              </dd>
            </div>
          </dl>

          <div className="mt-7">
            <ManageBillingButton />
          </div>

          <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-ink-soft">
            That opens Stripe&rsquo;s billing portal, where you can change your
            card or cancel in one click. Cancelling takes effect at the end of
            the period you have already paid for, and there is nothing to email
            and nobody to ask.
          </p>
        </section>
      ) : (
        <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-7">
          <p className="font-semibold">You are not supporting Bunchy.</p>
          <p className="mt-2 max-w-[60ch] leading-relaxed text-ink-soft">
            Which is completely fine. The whole app works the same either way.
          </p>
          <div className="mt-6">
            <LinkButton href="/supporter">Read the pitch</LinkButton>
          </div>
        </section>
      )}

      <p className="mt-8 text-sm text-muted">
        Everything else about your account is on{" "}
        <Link href="/profile" className="text-accent-ink underline underline-offset-2">
          your profile
        </Link>
        .
      </p>
    </PageShell>
  );
}
