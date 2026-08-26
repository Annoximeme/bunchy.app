import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { PhrasePath } from "@/lib/i18n/translate";

/**
 * A reference to a phrase, in a shape React refuses to render.
 *
 * The problem this solves happened, in production, on three pages at once. A
 * list defined at module scope cannot hold words, because the language is not
 * known until a request arrives, so it holds the path to the words instead. And
 * a path is a string, so `{link.label}` compiles perfectly and puts
 * "siteLinks.about" in front of a reader where the word About belongs. The
 * fallback cannot save that: `t()` is never called, so nothing knows anything
 * went wrong.
 *
 * Wrapping it in an object makes the mistake impossible rather than unlikely.
 * React will not render an object as a child, TypeScript says so at build time,
 * and the only way to get the word out is to ask for it: `{t(link.label)}`.
 *
 * The cost is one function call per entry in a static list, which is a fair
 * price for a class of bug that reaches readers silently.
 */
export interface PhraseRef {
  readonly path: PhrasePath<Dictionary>;
}

export function phrase(path: PhrasePath<Dictionary>): PhraseRef {
  return { path };
}
