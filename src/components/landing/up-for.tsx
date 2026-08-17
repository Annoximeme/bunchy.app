import { ArrowRight } from "lucide-react";
import { ACTIVITIES, PLACES, TIMES } from "@/lib/up-for";

/**
 * "What are you up for?" — the product, starting on the landing page.
 *
 * This is a plain GET form, not a JavaScript widget. The radios submit to
 * /signup, which reads them back and shows the person what they asked for, so
 * the choice survives the click instead of being a landing-page toy. That makes
 * it real without inventing any functionality: nothing here queries or claims
 * anything, it just carries an intent forward.
 *
 * Consequences worth keeping: it works with JavaScript off, the chips are real
 * radios so arrow keys and screen readers behave correctly with no ARIA of our
 * own, and the whole section ships zero client JS. Selected state is CSS
 * (`peer-checked:`), which is why there is no `"use client"` here.
 *
 * "Either" is the default on purpose. The brief this was built to is explicit
 * that online is not a lesser outcome, and a form that defaults to "in person"
 * would quietly say the opposite before anyone has read a word.
 */

export function UpFor() {
  return (
    <form
      action="/signup"
      method="get"
      className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-9"
    >
      <fieldset>
        <legend className="text-xs font-bold tracking-widest text-white/55">
          WHAT ARE YOU UP FOR?
        </legend>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {ACTIVITIES.map((a, i) => (
            <Chip
              key={a.value}
              name="want"
              value={a.value}
              label={a.label}
              defaultChecked={i === 0}
              tone="#FF5C6C"
            />
          ))}
        </div>
      </fieldset>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <fieldset>
          <legend className="text-xs font-bold tracking-widest text-white/55">
            WHERE
          </legend>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {PLACES.map((p) => (
              <Chip
                key={p.value}
                name="where"
                value={p.value}
                label={p.label}
                defaultChecked={p.value === "either"}
                tone="#55D6BE"
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-bold tracking-widest text-white/55">
            WHEN
          </legend>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {TIMES.map((t) => (
              <Chip
                key={t.value}
                name="when"
                value={t.value}
                label={t.label}
                defaultChecked={t.value === "tonight"}
                tone="#FFC857"
              />
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-9 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-coral-primary px-7 py-3.5 text-base font-bold tracking-wide text-[var(--color-on-accent)] transition-transform duration-200 hover:scale-[1.03]"
        >
          Find my bunch
          <ArrowRight size={18} aria-hidden />
        </button>
        <p className="text-sm text-white/55">
          Takes you to sign-up with this already filled in.
        </p>
      </div>
    </form>
  );
}

/**
 * A real radio, drawn as a chip.
 *
 * The input stays in the accessibility tree (`sr-only`, never `hidden`), so the
 * group is arrow-key navigable and announces itself correctly. `peer-checked:`
 * and `peer-focus-visible:` do the appearance, which is why this needs no state
 * and no client bundle.
 */
function Chip({
  name,
  value,
  label,
  defaultChecked,
  tone,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
  tone: string;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span
        // Selection has to survive a glance across twelve chips, so it changes
        // three things at once — fill, border and weight. An 18% tint alone
        // read as "slightly different", which is not the same as "chosen".
        className="inline-flex select-none items-center rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/70 transition-colors duration-150 hover:border-white/25 hover:text-white peer-checked:border-[var(--tone)] peer-checked:bg-[color-mix(in_srgb,var(--tone)_32%,transparent)] peer-checked:font-semibold peer-checked:text-white peer-checked:shadow-[0_0_0_1px_var(--tone)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--tone)]"
        style={{ ["--tone" as string]: tone }}
      >
        {label}
      </span>
    </label>
  );
}
