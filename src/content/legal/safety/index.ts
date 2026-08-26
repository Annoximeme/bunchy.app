import type { LegalDocumentSet } from "@/content/legal/document";
import { safetyEn } from "@/content/legal/safety/en";
import { safetyNl } from "@/content/legal/safety/nl";
import { safetyFr } from "@/content/legal/safety/fr";

export const SAFETY: LegalDocumentSet = { en: safetyEn, nl: safetyNl, fr: safetyFr };
