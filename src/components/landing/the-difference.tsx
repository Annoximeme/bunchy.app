import { brand } from "@/lib/brand";
import { getTranslations } from "@/server/i18n";

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
 * The right column reveals its parts one after another as the section scrolls
 * in, which reads as a room filling rather than a list loading. It is CSS on a
 * scroll timeline, so it cannot leave anything hidden: where the timeline is
 * unsupported, or the reader has asked for less motion, the rule does not
 * exist and every part is simply there.
 *
 * A server component. It had been a client one only to hold the animation.
 */

const BUNCH = [
  { fill: "#FF5C6C", initial: "M" },
  { fill: "#7657FF", initial: "J" },
  { fill: "#55D6BE", initial: "P" },
  { fill: "#FFC857", initial: "T" },
];

export async function TheDifference() {
  const t = await getTranslations();
  return (
    <section className="bg-canvas px-5 py-24 text-ink">
      <div className="mx-auto max-w-6xl">
        <p className="reveal text-sm font-bold tracking-widest text-accent-ink">
          {t("difference.eyebrow")}
        </p>
        <h2 className="reveal mt-3 max-w-3xl text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {t("difference.title")}
        </h2>

        <div className="mt-14 grid grid-cols-1 items-start gap-8 md:grid-cols-2 md:gap-10">
          {/* --- Everywhere else -------------------------------------- */}
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-muted">
              {t("difference.elsewhere")}
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
                  <p className="text-[13px] font-bold text-neutral-900">
                    {t("difference.handle")}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {t("difference.stats")}
                  </p>
                </div>
                <span className="rounded-none border border-gray-sterile px-2 py-1 text-[11px] font-bold text-neutral-900">
                  {t("difference.follow")}
                </span>
              </div>

              <div className="mt-1.5 border border-gray-sterile bg-white p-2.5">
                <div className="h-20 w-full bg-gray-sterile" />
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  {t("difference.postOne")}
                </p>
              </div>

              <div className="mt-1.5 border border-gray-sterile bg-white p-2.5">
                <div className="h-20 w-full bg-gray-sterile" />
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  {t("difference.postTwo")}
                </p>
              </div>

              <div className="mt-1.5 border border-gray-sterile bg-white p-2.5">
                <div className="h-12 w-full bg-gray-sterile" />
              </div>
            </div>

            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              {t("difference.elsewhereClosing")}
            </p>
          </div>

          {/* --- On Bunchy -------------------------------------------- */}
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-accent-ink">
              {t("difference.here", { brand: brand.name })}
            </p>

            {/*
              `reveal-stagger` rather than a framer-motion whileInView. The
              motion version left this card at opacity 0 until an observer
              fired, so the one thing this section exists to show was missing
              from a screenshot pass and from any render without JavaScript.
              The CSS version has no state in which it hides anything.
            */}
            <div className="reveal-stagger rounded-squircle bg-surface p-8 shadow-pebble">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-mint-soft px-3.5 py-1.5 text-sm font-semibold text-mint-ink">
                  <span aria-hidden>🥾</span> {t("difference.hiking")}
                </span>
              </div>

              <p className="mt-6 text-2xl font-extrabold leading-snug tracking-tight text-ink-text"
              >
                {t("difference.goingSaturday")}
              </p>

              {/*
                The cluster. Negative spacing so they overlap, and a thick ring
                in the surface colour so each one cuts a clean hole in the one
                behind rather than muddying into it.
              */}
              <div className="mt-7 flex items-center">
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
                  {t("difference.going")}
                </span>
              </div>

              <p className="mt-7 text-[15px] leading-relaxed text-ink-soft">
                {t("difference.wholeScreen")}
              </p>
            </div>

            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              {t("difference.hereClosing")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
