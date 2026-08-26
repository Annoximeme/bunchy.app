import type { Locale } from "@/lib/i18n/config";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";

/**
 * Looking a phrase up, and putting values into it.
 *
 * Small on purpose. An i18n library brings a message syntax, a compiler and a
 * runtime, and what this app needs is a nested object of strings, a dot path
 * and `{name}`. The two things a library would genuinely buy, compile-time
 * proof that no key is missing and no placeholder is wrong, are bought here
 * instead by typing the other catalogues against the English one and by a test
 * that reads the placeholders out of both.
 *
 * ## Plurals
 *
 * A phrase that counts something is written as an object of forms rather than
 * a string, `{ one, other }`, and the count picks one. Only two forms, because
 * all three languages here agree on having exactly two, and inventing the
 * Slavic cases for languages that do not have them would be five branches
 * nobody ever exercises. A fourth language with more forms is the moment to
 * widen this, and the type below is what will fail on that day.
 */

export interface Plural {
  one: string;
  other: string;
}

export type Phrase = string | Plural;

export interface Catalogue {
  readonly [key: string]: Phrase | Catalogue;
}

/** Every dot path in a catalogue that leads to an actual phrase. */
export type PhrasePath<T> = {
  [K in keyof T & string]: T[K] extends Plural
    ? K
    : T[K] extends string
      ? K
      : T[K] extends object
        ? `${K}.${PhrasePath<T[K]>}`
        : never;
}[keyof T & string];

export type Values = Record<string, string | number>;

function lookup(catalogue: Catalogue, path: string): Phrase | undefined {
  let current: Phrase | Catalogue | undefined = catalogue;
  for (const step of path.split(".")) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Catalogue)[step];
  }
  return typeof current === "string" ||
    (typeof current === "object" && current !== null && "other" in current)
    ? (current as Phrase)
    : undefined;
}

/**
 * Fills `{placeholders}` in, and leaves unknown ones visibly alone.
 *
 * A missing value renders as `{name}` rather than as "undefined" or as
 * nothing. It is meant to be noticed: an empty space in a sentence reads as a
 * design decision, and the literal brace reads as the bug it is.
 */
function interpolate(template: string, values: Values | undefined): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}

function choose(phrase: Phrase, values: Values | undefined): string {
  if (typeof phrase === "string") return phrase;
  const count = values?.count;
  return Number(count) === 1 ? phrase.one : phrase.other;
}

/**
 * Either a dot path or a `phrase()` reference, which are the same thing in two
 * shapes: the plain path where it is written inline and read immediately, the
 * wrapped one where it has to sit in a list until a request arrives. See
 * `phrase.ts` for why the second exists.
 */
export type PhraseKey<T> = PhrasePath<T> | { readonly path: PhrasePath<T> };

export type Translate<T> = (key: PhraseKey<T>, values?: Values) => string;

/**
 * Builds the `t` used everywhere else.
 *
 * The fallback chain is the point: a phrase missing from Dutch falls back to
 * English rather than to a blank or to the key itself. A half-translated page
 * in two languages is readable; a page with holes in it is not, and the way a
 * translation gets finished is by shipping and being seen, not by being held
 * back until it is complete.
 */
export function createTranslator<T extends Catalogue>(
  locale: Locale,
  catalogues: Record<Locale, T>,
): Translate<T> {
  const chosen = catalogues[locale];
  const fallback = catalogues[DEFAULT_LOCALE];

  return (key, values) => {
    const path = typeof key === "string" ? key : key.path;
    const phrase = lookup(chosen, path) ?? lookup(fallback, path);
    if (phrase === undefined) {
      // Not thrown. A missing key is a copy bug, and taking the page down over
      // one is a worse outcome than showing the path to whoever is looking.
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Missing phrase: ${path}`);
      }
      return path;
    }
    return interpolate(choose(phrase, values), values);
  };
}
