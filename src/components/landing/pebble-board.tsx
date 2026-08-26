"use client";

import { useTranslate } from "@/components/link";
import { phrase, type PhraseRef } from "@/lib/i18n/phrase";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The board, as objects rather than rows.
 *
 * Bunchy has no photographs of people, by choice, so the abstract UI is the
 * whole visual experience and has to carry the warmth on its own. These are
 * built to read as physical things resting on the page: soft ambient shadow
 * instead of a border, a large radius, and enough internal padding that nothing
 * is pressed against an edge.
 *
 * ## Why no border
 *
 * Boundaries come from the shadow and the space around them. A 1px grey rule
 * is the cheapest way to say "this is a separate thing" and it is also what
 * makes a page look like a settings screen. The shadow costs more and says the
 * same thing warmly.
 *
 * ## The lift
 *
 * `y: -3` over 0.3s, ease-out, no spring. A spring overshoots and settles,
 * which reads as a toy; this reads as picking up a thick piece of cardstock,
 * which is the whole brief. `useReducedMotion` removes the movement and keeps
 * the shadow change, so the affordance survives without the travel.
 */

interface Idea {
  emoji: string;
  /**
   * Phrase paths, not words. This list is module scope and the language is a
   * fact about the request, so the words are looked up at render.
   */
  tag: PhraseRef;
  title: PhraseRef;
  when: PhraseRef;
  going: number;
  fills: string[];
}

const IDEAS: Idea[] = [
  {
    emoji: "🎮",
    tag: phrase("pebbles.gamingTag"),
    title: phrase("pebbles.gamingTitle"),
    when: phrase("pebbles.gamingWhen"),
    going: 4,
    fills: ["#FF5C6C", "#7657FF", "#55D6BE", "#FFC857"],
  },
  {
    emoji: "☕",
    tag: phrase("pebbles.coffeeTag"),
    title: phrase("pebbles.coffeeTitle"),
    when: phrase("pebbles.coffeeWhen"),
    going: 3,
    fills: ["#55D6BE", "#FF5C6C", "#9B85FF"],
  },
  {
    emoji: "🥾",
    tag: phrase("pebbles.walkingTag"),
    title: phrase("pebbles.walkingTitle"),
    when: phrase("pebbles.walkingWhen"),
    going: 5,
    fills: ["#FFC857", "#7657FF", "#55D6BE", "#FF5C6C", "#9B85FF"],
  },
];

export function PebbleBoard() {
  const t = useTranslate();
  const still = useReducedMotion();

  return (
    /*
      `reveal-stagger`, not a framer-motion `whileInView`.

      The motion version set the children to opacity 0 and raised them when an
      IntersectionObserver fired. That makes the content conditional on
      JavaScript: before hydration, with scripting off, or any time the observer
      does not fire, three cards are in the DOM and invisible. A screenshot pass
      caught exactly that, a 400px hole where the board should be.

      globals.css says this out loud already, and the hero was moved off
      framer-motion for the same reason. The CSS version cannot hide anything:
      where the scroll timeline is unsupported the rule does not exist and the
      cards are simply there.

      The hover lift stays on framer-motion. It only ever adds, so it has no
      state in which it can remove something from the page.
    */
    <ul className="reveal-stagger grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {IDEAS.map((idea) => (
        <li key={idea.title.path}>
          <motion.article
            className="h-full rounded-squircle bg-surface p-8 shadow-pebble"
            whileHover={
              still
                ? undefined
                : {
                    y: -3,
                    boxShadow: "var(--shadow-pebble-lift)",
                    transition: { duration: 0.3, ease: "easeOut" },
                  }
            }
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-canvas px-3.5 py-1.5 text-sm font-semibold text-ink-soft">
              <span aria-hidden className="text-base">
                {idea.emoji}
              </span>
              {t(idea.tag)}
            </span>

            <h3 className="mt-6 text-balance text-lg font-bold leading-snug tracking-tight text-ink-text">
              {t(idea.title)}
            </h3>
            <p className="mt-2 text-[15px] text-muted">{t(idea.when)}</p>

            <div className="mt-7 flex items-center">
              <div className="flex -space-x-3">
                {idea.fills.map((fill, i) => (
                  <span
                    key={fill + i}
                    aria-hidden
                    className="inline-block size-9 rounded-2xl ring-4 ring-surface"
                    style={{ backgroundColor: fill }}
                  />
                ))}
              </div>
              <span className="ml-4 text-sm font-medium text-muted">
                {t("counts.going", { count: idea.going })}
              </span>
            </div>
          </motion.article>
        </li>
      ))}
    </ul>
  );
}
