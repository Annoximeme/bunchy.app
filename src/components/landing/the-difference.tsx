"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Everywhere else, and here, side by side.
 *
 * The page already argues this in prose. This is the version you can see
 * without reading: the same person's evening, rendered twice, once by a product
 * that needs their attention and once by one that does not.
 *
 * ## The left column is bad on purpose
 *
 * Sharp corners, a system font, hairline grey borders on every side, numbers
 * that count things nobody chose to count, and no room anywhere. Every one of
 * those is a rule the rest of this codebase enforces against itself, which is
 * why the sterile grey is a token of its own with a comment saying it must
 * never appear anywhere else. It is a quotation, not a style.
 *
 * The temptation is to make it a caricature. It is deliberately not: the
 * numbers are plausible, the layout is what a real feed looks like, and it is
 * recognisable rather than absurd. An unfair comparison persuades nobody who
 * has actually used the thing being compared.
 *
 * ## Motion
 *
 * The right column staggers in at 0.15s per child, which is slow enough to read
 * as a room filling rather than a list loading. `useReducedMotion` collapses
 * the whole thing to a static render rather than a fast one, because a
 * stagger played quickly is exactly the frantic feeling the section exists to
 * argue against.
 */

const STAGGER = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const CHILD = {
  hidden: { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

const BUNCH = [
  { fill: "#FF5C6C", initial: "M" },
  { fill: "#7657FF", initial: "J" },
  { fill: "#55D6BE", initial: "P" },
  { fill: "#FFC857", initial: "T" },
];

export function TheDifference() {
  const still = useReducedMotion();

  return (
    <section className="bg-canvas px-5 py-24 text-ink">
      <div className="mx-auto max-w-6xl">
        <p className="reveal text-sm font-bold tracking-widest text-accent-ink">
          THE DIFFERENCE
        </p>
        <h2 className="reveal mt-3 max-w-3xl text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          The same Saturday, on two different products.
        </h2>

        <div className="mt-14 grid grid-cols-1 items-start gap-8 md:grid-cols-2 md:gap-10">
          {/* --- Everywhere else -------------------------------------- */}
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-muted">
              Everywhere else
            </p>

            {/*
              Arial by name, not a font stack. The point is the absence of a
              typographic decision, and a stack with fallbacks is a decision.
            */}
            <div
              className="rounded-sm border border-gray-sterile bg-gray-sterile/40 p-3"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              <div className="flex items-center gap-2 rounded-none border border-gray-sterile bg-white p-2.5">
                <span className="size-9 rounded-none bg-gray-sterile" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-ink-text">
                    someone_you_met_once
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    1,284 followers · 312 following
                  </p>
                </div>
                <span className="rounded-none border border-gray-sterile px-2 py-1 text-[11px] font-bold text-ink-text">
                  Follow
                </span>
              </div>

              <div className="mt-1.5 border border-gray-sterile bg-white p-2.5">
                <div className="h-20 w-full bg-gray-sterile" />
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  17 likes · 4 comments · 2h
                </p>
              </div>

              <div className="mt-1.5 border border-gray-sterile bg-white p-2.5">
                <div className="h-20 w-full bg-gray-sterile" />
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  9 likes · 1 comment · 3h
                </p>
              </div>

              <div className="mt-1.5 border border-gray-sterile bg-white p-2.5">
                <div className="h-12 w-full bg-gray-sterile" />
              </div>
            </div>

            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              You scrolled for eleven minutes. You know what forty people did on
              Saturday. None of them know you were free.
            </p>
          </div>

          {/* --- On Bunchy -------------------------------------------- */}
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-accent-ink">
              On Bunchy
            </p>

            <motion.div
              className="rounded-squircle bg-surface p-8 shadow-pebble"
              variants={still ? undefined : STAGGER}
              initial={still ? undefined : "hidden"}
              // Plays once, when it comes into view, and never replays. A
              // section that re-animates every time it scrolls past is asking
              // for attention, which is the thing being argued against.
              whileInView={still ? undefined : "shown"}
              viewport={{ once: true, amount: 0.4 }}
            >
              <motion.div variants={still ? undefined : CHILD}>
                <span className="inline-flex items-center gap-2 rounded-full bg-mint-soft px-3.5 py-1.5 text-sm font-semibold text-mint-ink">
                  <span aria-hidden>🥾</span> Hiking
                </span>
              </motion.div>

              <motion.p
                variants={still ? undefined : CHILD}
                className="mt-6 text-2xl font-extrabold leading-snug tracking-tight text-ink-text"
              >
                We&rsquo;re going Saturday.
              </motion.p>

              {/*
                The cluster. Negative spacing so they overlap, and a thick ring
                in the surface colour so each one cuts a clean hole in the one
                behind rather than muddying into it.
              */}
              <motion.div
                variants={still ? undefined : CHILD}
                className="mt-7 flex items-center"
              >
                <div className="flex -space-x-3">
                  {BUNCH.map((person) => (
                    <span
                      key={person.initial}
                      aria-hidden
                      className="inline-flex size-11 items-center justify-center rounded-2xl font-bold ring-4 ring-surface"
                      style={{
                        backgroundColor: person.fill,
                        color: "var(--color-on-accent)",
                      }}
                    >
                      {person.initial}
                    </span>
                  ))}
                </div>
                <span className="ml-4 text-[15px] font-medium text-muted">
                  4 going
                </span>
              </motion.div>

              <motion.p
                variants={still ? undefined : CHILD}
                className="mt-7 text-[15px] leading-relaxed text-ink-soft"
              >
                That is the whole screen. There is nothing under it.
              </motion.p>
            </motion.div>

            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              You said you were free. Four people who like walking said the same
              thing. Saturday exists now.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
