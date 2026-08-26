import type { Locale } from "@/lib/i18n/config";
import { en, type Dictionary } from "@/lib/i18n/dictionaries/en";
import { nl } from "@/lib/i18n/dictionaries/nl";
import { fr } from "@/lib/i18n/dictionaries/fr";

/**
 * Every language in one object, imported statically.
 *
 * Not loaded on demand. Dynamic imports would keep two catalogues out of the
 * bundle, and buy an await on the render path of every page in exchange, for a
 * few kilobytes of text that compresses well. When the catalogue grows to the
 * point where that trade flips, the shape to split on is the namespace rather
 * than the language: nobody needs the onboarding phrasebook on the messages
 * screen in any language.
 */
export const DICTIONARIES: Record<Locale, Dictionary> = { en, nl, fr };

export type { Dictionary };
