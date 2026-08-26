import type { Metadata } from "next";
import { Link } from "@/components/link";
import { LEGAL } from "@/lib/legal";
import { Clause, LegalPage } from "@/components/legal";
import { getViewer } from "@/server/auth/current-user";
import { myApplication } from "@/server/modules/admin/moderator-applications";
import { ModeratorApplicationForm } from "@/components/moderator-application";
import { MODERATORS } from "@/content/legal/moderators";
import { currentLocale, getFormats, getTranslations } from "@/server/i18n";

export const dynamic = "force-dynamic";

/**
 * Recruiting volunteer moderators.
 *
 * The six clauses of prose live in `content/legal/moderators`, once per
 * language. The seventh is here because it is not prose: it is a form, and what
 * it says depends on whether the reader is signed in and whether they have
 * already applied.
 */
export async function generateMetadata(): Promise<Metadata> {
  const doc = MODERATORS[await currentLocale()];
  return { title: doc.title, description: doc.metaDescription };
}

export default async function ModeratorsPage() {
  const viewer = await getViewer();
  const existing = viewer ? await myApplication(viewer.profileId) : null;
  const doc = MODERATORS[await currentLocale()];
  const t = await getTranslations();
  const { dayLabel } = await getFormats();

  return (
    <LegalPage
      path="/moderators"
      title={doc.title}
      contact={LEGAL.supportContact}
      summary={doc.summary}
    >
      <doc.Body />

      <Clause n={7} title={t("moderators.applyTitle")}>
        {existing ? (
          <p>
            {t("moderators.applied", {
              date: dayLabel(existing.createdAt),
              status: existing.status.toLowerCase(),
              contact: LEGAL.supportContact,
            })}
          </p>
        ) : viewer ? (
          <>
            <p>{t("moderators.threeQuestions")}</p>
            <ModeratorApplicationForm />
          </>
        ) : (
          <>
            <p>{t("moderators.needAccount")}</p>
            {/*
              These two are buttons that happen to be links, and they sit
              inside the legal prose wrapper, whose `[&_a]:…` rules style every
              descendant link as body-copy link, coral ink, underlined. A
              descendant selector out-specifies the element's own classes, so
              the primary button was rendering coral text on a coral fill at
              1.7:1, which is very nearly invisible. The `!` is the narrow fix:
              these two opt out of the prose treatment they are nested inside.
            */}
            <p className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-[var(--color-on-accent)]! no-underline!"
              >
                {t("moderators.createAccount")}
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink-soft! no-underline! hover:bg-surface-sunken"
              >
                {t("moderators.signIn")}
              </Link>
            </p>
          </>
        )}
      </Clause>
    </LegalPage>
  );
}
