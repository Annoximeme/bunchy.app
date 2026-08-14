"use client";

import { useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Sparkles, RotateCcw } from "lucide-react";

/**
 * The signature moment: one person, a search, a bunch.
 *
 * Three states, driven by a click rather than by scroll position. Scroll-driven
 * would play it once, unseen, while somebody was still reading the sentence
 * above it — and this is the one thing on the page worth replaying, so it has a
 * button that says so.
 *
 * With reduced motion the same three states exist and simply cut between each
 * other. The point survives without the travel.
 */

const MATCHES = [
  { initial: "M", colour: "#7657FF", x: -104, y: -58, tag: "Gaming" },
  { initial: "E", colour: "#55D6BE", x: 104, y: -58, tag: "Hiking" },
  { initial: "T", colour: "#FFC857", x: -104, y: 58, tag: "Food" },
  { initial: "P", colour: "#FF5C6C", x: 104, y: 58, tag: "Films" },
];

type Stage = "alone" | "searching" | "found";

export function BunchMoment() {
  const [stage, setStage] = useState<Stage>("alone");
  const still = useReducedMotion();

  function run() {
    if (stage === "found") {
      setStage("alone");
      return;
    }
    setStage("searching");
    window.setTimeout(() => setStage("found"), still ? 350 : 1400);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-[300px] w-full max-w-lg items-center justify-center sm:h-[340px]">
        {/* Discovery rings */}
        <AnimatePresence>
          {stage === "searching" &&
            !still &&
            [0, 1, 2].map((ring) => (
              <motion.span
                key={ring}
                aria-hidden
                initial={{ scale: 0.35, opacity: 0.7 }}
                animate={{ scale: 2.4, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.4,
                  delay: ring * 0.25,
                  ease: "easeOut",
                }}
                className="absolute size-40 rounded-full border-2 border-purple-ai"
              />
            ))}
        </AnimatePresence>

        {/* The matches, which exist only once they have been found */}
        {MATCHES.map((match, i) => (
          <motion.div
            key={match.initial}
            initial={false}
            animate={
              stage === "found"
                ? { x: match.x, y: match.y, opacity: 1, scale: 1 }
                : { x: 0, y: 0, opacity: 0, scale: 0.4 }
            }
            transition={
              still
                ? { duration: 0 }
                : { type: "spring", stiffness: 120, damping: 14, delay: i * 0.08 }
            }
            className="absolute flex flex-col items-center gap-2"
          >
            <span
              className="flex size-16 items-center justify-center rounded-full text-lg font-bold text-white ring-4 ring-navy-base"
              style={{ background: match.colour }}
            >
              {match.initial}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/75">
              {match.tag}
            </span>
          </motion.div>
        ))}

        {/* You */}
        <motion.div
          animate={
            still ? {} : { scale: stage === "searching" ? 1.06 : 1 }
          }
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="relative z-10 flex flex-col items-center gap-2"
        >
          <span
            className="flex size-20 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #FF5C6C, #7657FF)",
              boxShadow: "0 18px 50px -18px rgba(255,92,108,0.9)",
            }}
          >
            You
          </span>
          <span className="text-xs font-medium tracking-wide text-white/60">
            {stage === "alone" && "on your own"}
            {stage === "searching" && "finding your people…"}
            {stage === "found" && "Bunch found"}
          </span>
        </motion.div>
      </div>

      <button
        type="button"
        onClick={run}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-purple-ai/50 bg-purple-ai/15 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-ai/25"
      >
        {stage === "found" ? (
          <>
            <RotateCcw size={16} aria-hidden />
            Again
          </>
        ) : (
          <>
            <Sparkles size={16} aria-hidden />
            Find a bunch
          </>
        )}
      </button>
    </div>
  );
}
