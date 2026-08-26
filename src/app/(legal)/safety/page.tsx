import type { Metadata } from "next";
import { LegalPage } from "@/components/legal";
import { LEGAL } from "@/lib/legal";
import { SAFETY } from "@/content/legal/safety";
import { currentLocale } from "@/server/i18n";

/**
 * The safety centre.
 *
 * Half of Bunchy happens online, where the worst case is blocking someone. The
 * other half puts a member in a room with a stranger, which is a risk a product
 * people only ever type into does not carry. Reports and blocks already existed;
 * what did not was any advice at the moment it matters, or a single page to send
 * someone to.
 *
 * The page covers the in-person half and says so, rather than implying that
 * meeting online is a lesser way to use this.
 *
 * The words live in `content/legal/safety`, once per language. See the note in
 * `content/legal/document.ts` for why these five documents are translated whole
 * rather than a phrase at a time like the rest of the app.
 */
export async function generateMetadata(): Promise<Metadata> {
  const doc = SAFETY[await currentLocale()];
  return { title: doc.title, description: doc.metaDescription };
}

export default async function SafetyPage() {
  const doc = SAFETY[await currentLocale()];

  return (
    <LegalPage
      path="/safety"
      title={doc.title}
      contact={LEGAL.supportContact}
      summary={doc.summary}
    >
      <doc.Body />
    </LegalPage>
  );
}
