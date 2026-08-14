import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/current-user";
import { onboardingPath } from "@/server/modules/profile/service";
import { SignUpForm } from "@/components/auth-forms";
import { resolveIntent } from "@/lib/up-for";

export const metadata: Metadata = { title: "Join" };

/**
 * Sign-up, optionally carrying an intent from the landing page.
 *
 * "What are you up for?" submits `want`, `where` and `when` here. Showing them
 * back is what makes that form a real step rather than a decorated link — the
 * choice visibly survives the click.
 *
 * The labels come from `resolveIntent`, which looks each value up in a fixed
 * table and returns null for anything unrecognised. Nothing from the query
 * string is ever rendered directly: `?want=<script>` resolves to nothing and
 * the banner simply does not appear.
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  if (viewer) redirect(onboardingPath(viewer.onboardingStage));

  const params = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const intent = resolveIntent({
    want: one(params.want),
    where: one(params.where),
    when: one(params.when),
  });

  return (
    <>
      {intent && (
        <div className="mx-auto mb-6 max-w-md rounded-2xl border border-line bg-surface-sunken p-4">
          <p className="text-xs font-semibold tracking-widest text-muted">
            WHAT YOU&rsquo;RE LOOKING FOR
          </p>
          <p className="mt-2 font-semibold text-ink">
            {intent.want.label} · {intent.where.label} · {intent.when.label}
          </p>
          <p className="mt-1.5 text-sm text-muted">
            We&rsquo;ll pick this up once you&rsquo;re in — you can change it any
            time.
          </p>
        </div>
      )}
      <SignUpForm />
    </>
  );
}
