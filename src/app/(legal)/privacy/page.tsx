import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";
import { LEGAL } from "@/lib/legal";
import { PRIVACY } from "@/content/legal/privacy";
import { currentLocale } from "@/server/i18n";

/**
 * The privacy policy.
 *
 * The words live in `content/legal/privacy`, once per language, and every
 * factual claim in them was written from the schema and the services rather
 * than from a template. If the code changes, all three are wrong until they
 * change too.
 */
export async function generateMetadata(): Promise<Metadata> {
  const doc = PRIVACY[await currentLocale()];
  return { title: doc.title, description: doc.metaDescription };
}

export default async function PrivacyPage() {
  const doc = PRIVACY[await currentLocale()];

  return (
    <LegalPage
      path="/privacy"
      title={doc.title}
      contact={LEGAL.privacyContact}
      summary={doc.summary}
    >
      <doc.Body />
    </LegalPage>
  );
}
