"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, RotateCcw, CalendarCheck } from "lucide-react";

/**
 * The signature moment: one person, a search, a bunch, a plan.
 *
 * Four states, driven by a click rather than by scroll position. Scroll-driven
 * would play it once, unseen, while somebody was still reading the sentence
 * above it — and this is the one thing on the page worth replaying, so it has a
 * button that says so.
 *
 * The fourth state is the point. Three states stop at "here are some compatible
 * people", which is what every other product on this shelf already claims. The
 * plan is the thing Bunchy is actually for, so the animation has to reach it.
 *
 * No animation library: these are CSS transitions on `translate`, `scale` and
 * `opacity`. The global `prefers-reduced-motion` rule in globals.css already
 * collapses every transition and animation to nothing, so with motion reduced
 * the four states simply cut between each other and the point survives without
 * the travel. The stage timings shorten to match, read from `matchMedia` at
 * click time rather than at render, so there is nothing for hydration to
 * disagree about.
 */

const MATCHES = [
  { initial: "M", colour: "#7657FF", x: -104, y: -58, tag: "Gaming" },
  { initial: "E", colour: "#55D6BE", x: 104, y: -58, tag: "Hiking" },
  { initial: "T", colour: "#FFC857", x: -104, y: 58, tag: "Food" },
  { initial: "P", colour: "#FF5C6C", x: 104, y: 58, tag: "Films" },
];

type Stage = "alone" | "searching" | "found" | "plan";

const CAPTIONS: Record<Stage, string> = {
  alone: "on your own",
  searching: "finding your people…",
  found: "Bunch found",
  plan: "Thursday, 8pm",
};

export function BunchMoment() {
  const [stage, setStage] = useState<Stage>("alone");
  const timers = useRef<number[]>([]);

  // A replay while one is already running would otherwise leave the old timers
  // to advance the new run past where it should be.
  function clearTimers() {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }

  useEffect(() => clearTimers, []);

  function run() {
    clearTimers();

    if (stage === "plan") {
      setStage("alone");
      return;
    }

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStage("searching");
    timers.current.push(
      window.setTimeout(() => setStage("found"), still ? 200 : 1400),
      window.setTimeout(() => setStage("plan"), still ? 400 : 2900),
    );
  }

  const spread = stage === "found" || stage === "plan";

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-[300px] w-full max-w-lg items-center justify-center sm:h-[340px]">
        {/*
          At rest the stage holds one circle and a lot of dark. This ring is the
          only thing saying the section is waiting for a press rather than
          broken — it stops the moment anything else starts happening.
        */}
        {stage === "alone" && (
          <span
            aria-hidden
            className="idle-pulse absolute size-32 rounded-full border-2 border-purple-ai"
          />
        )}

        {/* Discovery rings, only while the search is running. */}
        {stage === "searching" &&
          [0, 1, 2].map((ring) => (
            <span
              key={ring}
              aria-hidden
              className="ping-ring absolute size-40 rounded-full border-2 border-purple-ai"
              style={{ ["--ping-delay" as string]: `${ring * 0.25}s` }}
            />
          ))}

        {/* The matches, which exist only once they have been found. */}
        {MATCHES.map((match, i) => (
          <div
            key={match.initial}
            className="absolute flex flex-col items-center gap-2 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              translate: spread ? `${match.x}px ${match.y}px` : "0 0",
              scale: spread ? "1" : "0.4",
              opacity: spread ? 1 : 0,
              transitionDelay: `${i * 80}ms`,
            }}
          >
            <span
              className="flex size-16 items-center justify-center rounded-full text-lg font-bold text-white ring-4 ring-band-deep"
              style={{ background: match.colour }}
            >
              {match.initial}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/75">
              {match.tag}
            </span>
          </div>
        ))}

        {/* You */}
        <div
          className="relative z-10 flex flex-col items-center gap-2 transition-transform duration-500 ease-in-out"
          style={{ scale: stage === "searching" ? "1.06" : "1" }}
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
            {CAPTIONS[stage]}
          </span>
        </div>

        {/*
          The plan. Sits under the cluster rather than inside it, because it is
          the outcome of the group rather than another member of it.
        */}
        <div
          aria-hidden={stage !== "plan"}
          className="absolute bottom-0 flex items-center gap-3 rounded-3xl border border-mint-status/30 bg-mint-status/10 px-5 py-3 backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            translate: stage === "plan" ? "0 0" : "0 14px",
            opacity: stage === "plan" ? 1 : 0,
          }}
        >
          <span className="flex size-9 items-center justify-center rounded-2xl bg-mint-status/20 text-mint-status">
            <CalendarCheck size={18} aria-hidden />
          </span>
          <span className="text-sm font-semibold text-white">
            Board games at Tom&rsquo;s
            <span className="block text-xs font-medium text-white/60">
              5 going · Thursday
            </span>
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={run}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-purple-ai/50 bg-purple-ai/15 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-ai/25"
      >
        {stage === "plan" ? (
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

      {/* The four beats, for anyone who cannot see the animation at all. */}
      <p className="sr-only" role="status">
        {stage === "alone" && "One person, on their own."}
        {stage === "searching" && "Bunchy is finding compatible people nearby."}
        {stage === "found" &&
          "Four compatible people found: gaming, hiking, food and films."}
        {stage === "plan" &&
          "The bunch made a plan: board games at Tom's, five going, Thursday."}
      </p>
    </div>
  );
}
