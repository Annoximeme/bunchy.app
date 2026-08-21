/**
 * The manifesto, shown rather than claimed.
 *
 * The page says several times that Bunchy is built to end. This is the only
 * place that demonstrates it: a phone that finds you a Thursday and then tells
 * you to put it down. Four beats on one shared timeline, ending on an empty
 * screen, which is the frame the whole product is arguing for.
 *
 * A server component with no state and no JavaScript. The sequence is CSS on a
 * six and a half second loop, so it runs before hydration, survives JavaScript
 * being off, and obeys the global reduced-motion rule rather than running its
 * own timers past it. `af-stage` and the keyframes live in globals.css next to
 * the rest of the product's motion.
 *
 * Marked `aria-hidden`. It is an illustration of something the surrounding
 * copy already states, and a screen reader walking four cross-fading frames of
 * a fake interface would get noise instead of the argument.
 */
export function AntiFeedDemo() {
  return (
    <div
      aria-hidden
      className="relative mx-auto w-full max-w-[248px] select-none"
    >
      {/*
        The frame. A phone drawn in two rounded rectangles rather than an image:
        it costs no request, scales without going soft, and picks up the band
        colours so it belongs to whichever section it is dropped into.
      */}
      <div className="rounded-[2.25rem] border border-white/15 bg-white/[0.04] p-2.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)]">
        <div className="relative aspect-[9/17] overflow-hidden rounded-[1.7rem] bg-[#0F1524]">
          {/* Status bar. Fixed, because a clock that ticked would be one more
              thing moving on a panel about stillness. */}
          <div className="flex items-center justify-between px-4 pt-3.5 text-[9px] font-medium text-white/35">
            <span>20:14</span>
            <span className="flex gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/30" />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/30" />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/20" />
            </span>
          </div>

          {/* Every beat is absolutely positioned in the same box so they
              cross-fade in place instead of reflowing the frame. */}
          <div className="absolute inset-x-0 bottom-0 top-9">
            {/* 1. The press. */}
            <div
              className="af-stage absolute inset-0 flex flex-col items-center justify-center gap-3 px-5"
              style={{ animationName: "af-button" }}
            >
              <p className="text-center text-[11px] leading-snug text-white/45">
                Free Thursday evening
              </p>
              <span
                className="af-stage rounded-full px-5 py-2.5 text-[12px] font-bold"
                style={{
                  animationName: "af-press",
                  backgroundColor: "var(--color-coral-primary)",
                  // The token, not the hex. Coral is too bright to carry white
                  // text, which is the whole reason every accent ships an
                  // `on-` pair, and the theme test enforces it.
                  color: "var(--color-on-accent)",
                }}
              >
                Find me a bunch
              </span>
            </div>

            {/* 2. The wait. Deliberately brief: a long spinner would be the
                product asking for attention, which is the thing it refuses. */}
            <div
              className="af-stage absolute inset-0 flex items-center justify-center"
              style={{ animationName: "af-spinner" }}
            >
              <span
                className="block h-6 w-6 rounded-full border-2 border-white/15"
                style={{
                  borderTopColor: "var(--color-coral-primary)",
                  animation: "af-spin 0.7s linear infinite",
                }}
              />
            </div>

            {/* 3. The match. One card, four people, a real day. */}
            <div
              className="af-stage absolute inset-0 flex flex-col justify-center px-4"
              style={{ animationName: "af-card" }}
            >
              <div className="rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#55D6BE]">
                  Match found
                </p>
                <p className="mt-1.5 text-[13px] font-bold leading-tight text-white">
                  Thursday Coffee
                </p>
                <div className="mt-2.5 flex items-center gap-1.5">
                  {["#FF5C6C", "#7657FF", "#55D6BE", "#FFC857"].map((fill) => (
                    <span
                      key={fill}
                      className="inline-block h-4 w-4 rounded-full ring-2 ring-[#0F1524]"
                      style={{ backgroundColor: fill }}
                    />
                  ))}
                  <span className="ml-0.5 text-[10px] text-white/50">4 going</span>
                </div>
              </div>
            </div>

            {/* 4. The point. An empty screen and permission to leave. */}
            <div
              data-final="true"
              className="af-stage absolute inset-0 flex items-center justify-center px-6"
              style={{ animationName: "af-done" }}
            >
              <p className="text-center text-[12px] font-medium leading-relaxed text-white/70">
                You&rsquo;re all set.
                <br />
                Close the app and go
                <br />
                enjoy your Thursday.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
