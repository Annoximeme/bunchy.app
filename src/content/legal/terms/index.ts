import type { LegalDocumentSet } from "@/content/legal/document";
import { termsEn } from "@/content/legal/terms/en";
import { termsNl } from "@/content/legal/terms/nl";
import { termsFr } from "@/content/legal/terms/fr";

export const TERMS: LegalDocumentSet = { en: termsEn, nl: termsNl, fr: termsFr };
