import { getTranslations } from "@/server/i18n";

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
export async function AntiFeedDemo() {
  const t = await getTranslations();

  return (
    <div
      aria-hidden
      className="relative mx-auto w-[15.5rem] max-w-full select-none"
    >
      {/*
        The frame. A phone drawn in two rounded rectangles rather than an image:
        it costs no request, scales without going soft, and picks up the band
        colours so it belongs to whichever section it is dropped into.
      */}
      {/*
        Styled for the band it actually stands on. This was built with
        white-on-transparent borders and a heavy black shadow, which is what a
        dark stage wants; the Five Stages section is the cream reading ground,
        so the frame had no visible edge at all and the shadow was a smudge.
      */}
      <div className="rounded-[2.25rem] border border-line bg-surface p-2.5 shadow-pebble">
        {/* `band-deep`, the token, rather than the navy literal this shipped
            with. That hex predated the warm palette and was the one cold thing
            left on the page. */}
        <div className="relative aspect-[9/16] overflow-hidden rounded-[1.7rem] bg-band-deep">
          {/*
            No fake status bar.

            It held a 20:14 clock and three dots at `white/35`, which is
            decoration on top of decoration. It cost a real contrast violation
            once the frame was large enough for axe to measure, and it was the
            thing the message collided with when the frame was too small. The
            screen is the message.
          */}
          {/* Every beat is absolutely positioned in the same box so they
              cross-fade in place instead of reflowing the frame. */}
          <div className="absolute inset-0">
            {/* 1. The press. */}
            <div
              className="af-stage absolute inset-0 flex flex-col items-center justify-center gap-3 px-5"
              style={{ animationName: "af-button" }}
            >
              <p className="text-center text-[11px] leading-snug text-white/45">
                {t("antiFeed.free")}
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
                {t("antiFeed.findMe")}
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
                  {t("antiFeed.matchFound")}
                </p>
                <p className="mt-1.5 text-[13px] font-bold leading-tight text-white">
                  {t("antiFeed.thursdayCoffee")}
                </p>
                <div className="mt-2.5 flex items-center gap-1.5">
                  {["#FF5C6C", "#7657FF", "#55D6BE", "#FFC857"].map((fill) => (
                    <span
                      key={fill}
                      className="inline-block h-4 w-4 rounded-full ring-2 ring-[#0F1524]"
                      style={{ backgroundColor: fill }}
                    />
                  ))}
                  <span className="ml-0.5 text-[10px] text-white/50">
                    {t("antiFeed.going")}
                  </span>
                </div>
              </div>
            </div>

            {/*
              4. The point. The plan, settled, and permission to leave.

              This beat used to be one sentence in the middle of an otherwise
              empty screen. It is also the frame that stands still for anybody
              who asked for reduced motion, and as a still it read as an image
              that had failed to load rather than as an app with nothing left to
              show. The plan stays on screen, dimmed to say it is done, and the
              sentence sits under it where it belongs.
            */}
            <div
              data-final="true"
              className="af-stage absolute inset-0 flex flex-col justify-center gap-4 px-4"
              style={{ animationName: "af-done" }}
            >
              <div className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/[0.08]">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#55D6BE]">
                  {t("antiFeed.settled")}
                </p>
                <p className="mt-1.5 text-[13px] font-bold leading-tight text-white">
                  {t("antiFeed.thursdayCoffee")}
                </p>
                <div className="mt-2.5 flex items-center gap-1.5">
                  {["#FF5C6C", "#7657FF", "#55D6BE", "#FFC857"].map((fill) => (
                    <span
                      key={fill}
                      className="inline-block h-4 w-4 rounded-full ring-2 ring-[#0F1524]"
                      style={{ backgroundColor: fill }}
                    />
                  ))}
                  <span className="ml-0.5 text-[10px] text-white/50">
                    {t("antiFeed.going")}
                  </span>
                </div>
              </div>
              <p className="text-balance px-2 text-center text-[12px] font-medium leading-relaxed text-white/70">
                {t("antiFeed.allSet")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
