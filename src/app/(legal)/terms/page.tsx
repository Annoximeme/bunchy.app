import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";
import { LEGAL } from "@/lib/legal";
import { TERMS } from "@/content/legal/terms";
import { currentLocale } from "@/server/i18n";

/**
 * The terms.
 *
 * The words live in `content/legal/terms`, once per language. The conduct,
 * moderation and account-deletion clauses describe mechanisms that exist in the
 * code; the liability, governing-law and dispute sections are the ones most in
 * need of a practitioner's review before launch, in all three.
 */
export async function generateMetadata(): Promise<Metadata> {
  const doc = TERMS[await currentLocale()];
  return { title: doc.title, description: doc.metaDescription };
}

export default async function TermsPage() {
  const doc = TERMS[await currentLocale()];

  return (
    <LegalPage
      path="/terms"
      title={doc.title}
      contact={LEGAL.supportContact}
      summary={doc.summary}
    >
      <doc.Body />
    </LegalPage>
  );
}
