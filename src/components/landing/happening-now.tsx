import { landingPulse } from "@/server/modules/discovery/landing-pulse";
import { brand } from "@/lib/brand";
import { getTranslations } from "@/server/i18n";

/**
 * "What's happening right now?"
 *
 * Two states, and which one renders is decided by the database rather than by
 * a flag someone has to remember to flip. Once there is real activity above the
 * privacy floor, this board describes it; until then it shows what the board
 * will look like, said plainly.
 *
 * The examples are labelled twice, once in the section's own subheading and
 * once per card, because this is the exact place a pre-launch product is
 * tempted to imply traction it does not have. The brand rules forbid that, and
 * a number on a landing page is read as a claim whether or not it was meant as
 * one.
 */
export async function HappeningNow() {
  const pulse = await landingPulse();
  const t = await getTranslations();

  return (
    <section className="px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <p className="reveal text-sm font-bold tracking-widest text-mint-status">
          {t("happeningNow.eyebrow")}
        </p>

        {pulse ? (
          <>
            <h2 className="reveal mt-3 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t("happeningNow.diary", { count: pulse.peopleGoing })}
            </h2>
            <div className="reveal mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Count n={pulse.online} label={t("happeningNow.online")} tone="#55D6BE" />
              <Count
                n={pulse.inPerson}
                label={t("happeningNow.inPerson")}
                tone="#FFC857"
              />
              <Count
                n={pulse.peopleGoing}
                label={t("happeningNow.peopleGoing")}
                tone="#FF5C6C"
              />
            </div>
          </>
        ) : (
          <>
            <h2 className="reveal mt-3 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t("happeningNow.title")}
            </h2>
            <p className="reveal mt-4 max-w-2xl text-white/60">
              {t("happeningNow.body", { brand: brand.name })}
            </p>

            <ul className="reveal mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Example
                icon="🎮"
                line={t("happeningNow.lineGaming")}
                mode="online"
                modeLabel={t("happeningNow.online")}
                when={t("happeningNow.whenTonight")}
              />
              <Example
                icon="🎬"
                line={t("happeningNow.lineWatch")}
                mode="online"
                modeLabel={t("happeningNow.online")}
                when={t("happeningNow.whenEvening")}
              />
              <Example
                icon="💻"
                line={t("happeningNow.lineCowork")}
                mode="online"
                modeLabel={t("happeningNow.online")}
                when={t("happeningNow.whenNow")}
              />
              <Example
                icon="☕"
                line={t("happeningNow.lineCoffee")}
                mode="in person"
                modeLabel={t("happeningNow.inPerson")}
                when={t("happeningNow.whenSaturday")}
              />
              <Example
                icon="🥾"
                line={t("happeningNow.lineHiking")}
                mode="in person"
                modeLabel={t("happeningNow.inPerson")}
                when={t("happeningNow.whenSunday")}
              />
              <Example
                icon="🎲"
                line={t("happeningNow.lineBoardGames")}
                mode="either"
                modeLabel={t("happeningNow.either")}
                when={t("happeningNow.whenThisWeek")}
              />
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function Count({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6">
      <p
        className="text-4xl font-extrabold tabular-nums"
        style={{ color: tone }}
      >
        {n}
      </p>
      <p className="mt-1 text-sm text-white/55">{label}</p>
    </div>
  );
}

/** Mint is online, yellow is in person, purple is either. */
const TONES: Record<string, string> = {
  online: "#55D6BE",
  "in person": "#FFC857",
  either: "#9B85FF",
};

async function Example({
  icon,
  line,
  mode,
  modeLabel,
  when,
}: {
  icon: string;
  line: string;
  /** The English key, which picks the colour and never reaches the page. */
  mode: "online" | "in person" | "either";
  /** The same thing in the reader's language, which does. */
  modeLabel: string;
  when: string;
}) {
  const tone = TONES[mode] ?? "#9B85FF";
  const t = await getTranslations();
  return (
    <li className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <span className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-bold tracking-widest text-white/55">
          {t("happeningNow.example")}
        </span>
      </div>
      <p className="mt-4 font-semibold text-white/90">{line}</p>
      <p className="mt-3 flex items-center gap-2 text-xs font-semibold tracking-wide">
        <span
          className="inline-flex items-center gap-1.5"
          style={{ color: tone }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: tone }}
          />
          {modeLabel.toUpperCase()}
        </span>
        <span className="text-white/55">·</span>
        <span className="text-white/50">{when}</span>
      </p>
    </li>
  );
}
