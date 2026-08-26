import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";

/**
 * The About essay, once per language.
 *
 * Same reasoning as the policy documents (see `content/legal/document.ts`),
 * with one thing added. This is the only page on the site written in the first
 * person of the person who built it, and an argument in somebody's own voice
 * does not survive being cut into keys and reassembled. Each language is the
 * same argument made properly, which occasionally means a different sentence
 * doing the same work.
 *
 * The one prop is the call to action's destination, which depends on whether
 * the reader is signed in and is therefore a fact about the request rather
 * than about the essay.
 */
export interface AboutDocument {
  title: string;
  metaDescription: string;
  Body: (props: { startHref: string }) => ReactNode;
}

export type AboutDocumentSet = Record<Locale, AboutDocument>;
