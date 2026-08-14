"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Gamepad2, Coffee, Users } from "lucide-react";

/**
 * The hero visual: people converging into a bunch.
 *
 * Everything here floats on its own loop at its own speed, because a cluster
 * where every element moves in lockstep reads as a carousel rather than as a
 * group of separate people. The drift is a few pixels — enough to feel alive
 * behind the copy, small enough that it never competes with it.
 *
 * `useReducedMotion` is honoured throughout: with it set, the composition still
 * renders in exactly the same arrangement, simply still. An animation that
 * carries meaning has to survive being switched off.
 */

const AVATARS = [
  { initial: "S", colour: "#FF5C6C", top: "6%", left: "44%", delay: 0 },
  { initial: "M", colour: "#7657FF", top: "22%", left: "72%", delay: 0.6 },
  { initial: "E", colour: "#55D6BE", top: "58%", left: "78%", delay: 1.2 },
  { initial: "T", colour: "#FFC857", top: "76%", left: "48%", delay: 0.3 },
  { initial: "P", colour: "#FF5C6C", top: "60%", left: "16%", delay: 0.9 },
  { initial: "W", colour: "#7657FF", top: "20%", left: "12%", delay: 1.5 },
];

export function BunchCluster() {
  const still = useReducedMotion();

  const float = (delay: number, distance = 10) =>
    still
      ? {}
      : {
          animate: { y: [0, -distance, 0] },
          transition: {
            duration: 5 + delay,
            repeat: Infinity,
            ease: "easeInOut" as const,
            delay,
          },
        };

  return (
    <div className="w-full">
    <div className="relative mx-auto h-[330px] w-full max-w-[520px] sm:h-[520px]">
      {/* The pull of the centre, drawn rather than implied. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(closest-side, rgba(118,87,255,0.22), transparent 72%)",
        }}
      />

      {/* Centre node */}
      <motion.div
        {...float(0.2, 6)}
        className="absolute left-1/2 top-1/2 flex size-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm font-bold tracking-[0.2em] text-white"
        style={{
          background:
            "linear-gradient(135deg, #FF5C6C 0%, #7657FF 100%)",
          boxShadow: "0 20px 60px -20px rgba(118,87,255,0.9)",
        }}
      >
        BUNCHY
      </motion.div>

      {AVATARS.map((person) => (
        <motion.div
          key={person.initial}
          {...float(person.delay)}
          className="absolute flex size-14 items-center justify-center rounded-full text-lg font-bold text-white ring-4 sm:size-16"
          style={{
            top: person.top,
            left: person.left,
            background: person.colour,
            // The ring is the page behind them, so the bubbles overlap cleanly
            // wherever they drift over one another.
            ["--tw-ring-color" as string]: "#0A0E1A",
          }}
        >
          {person.initial}
        </motion.div>
      ))}

      {/* Floating activity cards */}
      <motion.div
        {...float(0.4, 12)}
        className="hidden sm:flex absolute -left-4 top-[34%] items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-sm sm:-left-10"
      >
        <span className="flex size-9 items-center justify-center rounded-2xl bg-yellow-fun/20 text-yellow-fun">
          <Gamepad2 size={18} aria-hidden />
        </span>
        <span className="text-sm text-white/85">
          Gaming tonight
          <span className="block text-xs text-white/50">4 nearby</span>
        </span>
        <span className="rounded-full bg-coral-primary/20 px-2.5 py-1 text-xs font-semibold text-coral-primary">
          92%
        </span>
      </motion.div>

      <motion.div
        {...float(1.1, 12)}
        className="hidden sm:flex absolute -right-2 top-[6%] items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-sm sm:-right-8"
      >
        <span className="flex size-9 items-center justify-center rounded-2xl bg-mint-status/20 text-mint-status">
          <Coffee size={18} aria-hidden />
        </span>
        <span className="text-sm text-white/85">
          Coffee Saturday
          <span className="block text-xs text-white/50">3 free</span>
        </span>
        <span className="size-2.5 rounded-full bg-mint-status shadow-[0_0_12px_var(--color-mint-status)]" />
      </motion.div>

      <motion.div
        {...float(0.8, 12)}
        className="hidden sm:flex absolute -right-2 bottom-[8%] items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur-sm sm:-right-6"
      >
        <span className="flex size-9 items-center justify-center rounded-2xl bg-purple-ai/20 text-purple-ai">
          <Users size={18} aria-hidden />
        </span>
        <span className="text-sm text-white/85">
          Co-op Night
          <span className="block text-xs text-white/50">6 going</span>
        </span>
      </motion.div>
    </div>

      {/*
        On a phone there is no room for cards to float around the cluster — they
        land on top of the people. Same three plans, stacked underneath, where
        they can be read.
      */}
      <div className="mt-6 flex flex-col gap-2.5 sm:hidden">
        <MobilePlan
          icon={<Gamepad2 size={16} aria-hidden />}
          tone="#FFC857"
          title="Gaming tonight"
          detail="4 nearby"
          trailing={
            <span className="rounded-full bg-coral-primary/20 px-2.5 py-1 text-xs font-semibold text-coral-primary">
              92%
            </span>
          }
        />
        <MobilePlan
          icon={<Coffee size={16} aria-hidden />}
          tone="#55D6BE"
          title="Coffee Saturday"
          detail="3 free"
          trailing={
            <span className="size-2.5 rounded-full bg-mint-status shadow-[0_0_12px_var(--color-mint-status)]" />
          }
        />
        <MobilePlan
          icon={<Users size={16} aria-hidden />}
          tone="#7657FF"
          title="Co-op Night"
          detail="6 going"
        />
      </div>
    </div>
  );
}

function MobilePlan({
  icon,
  tone,
  title,
  detail,
  trailing,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  detail: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.05] px-4 py-3">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: `${tone}22`, color: tone }}
      >
        {icon}
      </span>
      <span className="flex-1 text-sm text-white/85">
        {title}
        <span className="block text-xs text-white/50">{detail}</span>
      </span>
      {trailing}
    </div>
  );
}