"use client";

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
  tag: string;
  title: string;
  when: string;
  going: number;
  fills: string[];
}

const IDEAS: Idea[] = [
  {
    emoji: "🎮",
    tag: "Gaming",
    title: "Co-op night, someone else picks",
    when: "Thursday, 20:00",
    going: 4,
    fills: ["#FF5C6C", "#7657FF", "#55D6BE", "#FFC857"],
  },
  {
    emoji: "☕",
    tag: "Coffee",
    title: "Saturday morning, nothing planned after",
    when: "Saturday, 10:30",
    going: 3,
    fills: ["#55D6BE", "#FF5C6C", "#9B85FF"],
  },
  {
    emoji: "🥾",
    tag: "Walking",
    title: "Slow one, we stop for chips",
    when: "Sunday, 11:00",
    going: 5,
    fills: ["#FFC857", "#7657FF", "#55D6BE", "#FF5C6C", "#9B85FF"],
  },
];

const STAGGER = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const CHILD = {
  hidden: { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

export function PebbleBoard() {
  const still = useReducedMotion();

  return (
    <motion.ul
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      variants={still ? undefined : STAGGER}
      initial={still ? undefined : "hidden"}
      whileInView={still ? undefined : "shown"}
      viewport={{ once: true, amount: 0.25 }}
    >
      {IDEAS.map((idea) => (
        <motion.li key={idea.title} variants={still ? undefined : CHILD}>
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
              {idea.tag}
            </span>

            <h3 className="mt-6 text-balance text-lg font-bold leading-snug tracking-tight text-ink-text">
              {idea.title}
            </h3>
            <p className="mt-2 text-[15px] text-muted">{idea.when}</p>

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
                {idea.going} going
              </span>
            </div>
          </motion.article>
        </motion.li>
      ))}
    </motion.ul>
  );
}
