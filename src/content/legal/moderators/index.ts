import type { LegalDocumentSet } from "@/content/legal/document";
import { moderatorsEn } from "@/content/legal/moderators/en";
import { moderatorsNl } from "@/content/legal/moderators/nl";
import { moderatorsFr } from "@/content/legal/moderators/fr";

export const MODERATORS: LegalDocumentSet = {
  en: moderatorsEn,
  nl: moderatorsNl,
  fr: moderatorsFr,
};
