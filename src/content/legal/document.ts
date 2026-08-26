import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";

/**
 * A policy document, once per language.
 *
 * The rest of this app translates a phrase at a time, checked by the compiler:
 * a key that exists in English and not in Dutch does not build. These five
 * documents do not work that way, and the difference is deliberate.
 *
 * A privacy policy is not a screen with words on it. It is a single argument
 * running for two thousand words, where a clause has to be readable as Dutch
 * rather than as English rearranged, and where the sentence that carries a
 * legal obligation sometimes needs a different shape in each language to carry
 * the same obligation. Chopping that into a hundred numbered keys makes it
 * impossible for anybody, including a lawyer, to read the thing they are being
 * asked to approve.
 *
 * So each document is written whole, three times, and what is checked instead
 * is the shape: same clauses, same numbers, same ids, so that a link to
 * `#clause-7` lands on the same promise in every language. See
 * `document.test.tsx`.
 */
export interface LegalDocument {
  /** The <h1> and the browser tab. */
  title: string;
  /** The meta description, which is not the summary: shorter, and for search. */
  metaDescription: string;
  /** The standfirst under the title. */
  summary: string;
  /** The clauses. */
  Body: () => ReactNode;
}

export type LegalDocumentSet = Record<Locale, LegalDocument>;
