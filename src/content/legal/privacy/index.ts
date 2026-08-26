import type { LegalDocumentSet } from "@/content/legal/document";
import { privacyEn } from "@/content/legal/privacy/en";
import { privacyNl } from "@/content/legal/privacy/nl";
import { privacyFr } from "@/content/legal/privacy/fr";

export const PRIVACY: LegalDocumentSet = {
  en: privacyEn,
  nl: privacyNl,
  fr: privacyFr,
};
