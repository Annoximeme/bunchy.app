import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/current-user";
import { onboardingPath } from "@/server/modules/profile/service";
import { SignUpForm } from "@/components/auth-forms";
import { resolveIntent } from "@/lib/up-for";
import { getTranslations, localeHref } from "@/server/i18n";

export const metadata: Metadata = { title: "Join" };

/**
 * Sign-up, optionally carrying an intent from the landing page.
 *
 * "What are you up for?" submits `want`, `where` and `when` here. Showing them
 * back is what makes that form a real step rather than a decorated link, the
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
  if (viewer) redirect(await localeHref(onboardingPath(viewer.onboardingStage)));

  const params = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const t = await getTranslations();
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
            {t("onboarding.goalsTitle").toUpperCase()}
          </p>
          <p className="mt-2 font-semibold text-ink">
            {t(intent.want.label)} · {t(intent.where.label)} · {t(intent.when.label)}
          </p>
          <p className="mt-1.5 text-sm text-muted">
            {t("signup.intentNote")}
          </p>
        </div>
      )}
      <SignUpForm />
    </>
  );
}
