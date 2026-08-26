import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight, Check, MessagesSquare } from "lucide-react";
import { brand } from "@/lib/brand";
import { BunchyLogo } from "@/components/logo";
import { person } from "@/lib/example-people";
import { BunchCluster } from "@/components/landing/bunch-cluster";
import { publicWaitlistCount } from "@/server/modules/waitlist/service";
import { currentLocale, getTranslations, localeHref } from "@/server/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

/**
 * The title and description in the reader's language.
 *
 * A function rather than a constant, because the language is a fact about the
 * request. This is also the page most likely to be pasted into a chat, and a
 * share preview that comes back in a language the sender was not reading is
 * the one place a translation error is visible to everybody at once.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("comingSoon.metaTitle"),
    description: t("comingSoon.metaDescription"),
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/**
 * The page the public sees while the site is held back.
 *
 * A real page rather than the static file it used to be. The coming-soon gate
 * is flipped deliberately while everything is running, unlike the maintenance
 * page which exists precisely for when the app is not, so this one can have a
 * working form, a server-rendered count, the app's own stylesheet and a CSP.
 * If the app does go down while the gate is up, Caddy still falls back to the
 * static maintenance page.
 *
 * The composition is pinned dark like the landing page rather than following
 * the reader's theme, for the same reason: it is a poster, not a room.
 */
export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ waitlist?: string }>;
}) {
  const { waitlist } = await searchParams;
  const waiting = await publicWaitlistCount();
  const t = await getTranslations();
  const locale = await currentLocale();
  const privacyHref = await localeHref("/privacy");

  return (
    <div
      className={`${display.className} relative min-h-dvh overflow-hidden bg-band-deep text-white`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(46rem 28rem at 8% -8%, rgba(255,92,108,0.22), transparent 62%), radial-gradient(42rem 26rem at 94% 4%, rgba(118,87,255,0.26), transparent 62%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-20">
        <header className="flex items-center justify-between gap-4 py-8">
          <BunchyLogo height={24} color="#FFFFFF" />
          {/* Top right, on the page more people will land on than any other,
              and before they have read a word: somebody who cannot read this
              should not have to scroll a poster to find the way out of it. */}
          <LanguageSwitcher className="text-white/70" compact />
        </header>

        <main id="main">
          {/*
            Two columns on a wide screen, and the order matters on a narrow one.
            The single column that phones get runs copy, then the form, then the
            cluster, so the thing this page exists to collect stays above the
            decoration rather than below 330px of floating avatars.
          */}
          <div className="grid items-center gap-12 lg:grid-cols-[1.04fr_1fr] lg:gap-10">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-mint-status/30 bg-mint-status/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-mint-status">
                <span className="size-1.5 rounded-full bg-mint-status" />
                {t("comingSoon.badge")}
              </span>

              <h1 className="mt-6 text-balance text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                {t("comingSoon.headlineBefore")}{" "}
                <span
                  style={{
                    background:
                      "linear-gradient(100deg, #FF5C6C 0%, #7657FF 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {t("comingSoon.headlineEmphasis")}
                </span>{" "}
                {t("comingSoon.headlineAfter")}
              </h1>

              <p className="mt-6 text-xl font-semibold leading-snug text-white/90">
                {t("comingSoon.lead")}
              </p>

              <p className="mt-3 text-lg leading-relaxed text-white/65">
                {t("comingSoon.body", { brand: brand.name })}{" "}
                <span className="font-semibold text-mint-status">
                  {t("comingSoon.online")}
                </span>
                ,{" "}
                <span className="font-semibold text-yellow-fun">
                  {t("comingSoon.nearby")}
                </span>
                {t("comingSoon.orBoth")}
              </p>

              {/* The point of the page. */}
              <section
                id="waitlist"
                className="mt-10 scroll-mt-8 rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-6 sm:p-8"
              >
                {waitlist === "joined" ? (
                  <div>
                    <p className="flex items-center gap-2.5 text-lg font-bold text-mint-status">
                      <Check size={20} aria-hidden />
                      {t("comingSoon.joinedTitle")}
                    </p>
                    <p className="mt-2 text-white/70">
                      {t("comingSoon.joinedBody")}
                    </p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold tracking-tight">
                      {t("comingSoon.formTitle")}
                    </h2>
                    <p className="mt-2 text-white/65">
                      {t("comingSoon.formBody")}
                    </p>

                    <form
                      action="/api/waitlist"
                      method="post"
                      className="mt-5 flex flex-col gap-3 sm:flex-row"
                    >
                      {/* The page knows what language it was read in; the
                          route that answers the post does not, so it is told
                          rather than left to guess from a cookie. */}
                      <input type="hidden" name="locale" value={locale} />
                      <label htmlFor="waitlist-email" className="sr-only">
                        {t("comingSoon.emailLabel")}
                      </label>
                      <input
                        id="waitlist-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        aria-describedby={
                          waitlist === "invalid"
                            ? "waitlist-error"
                            : "waitlist-note"
                        }
                        className="w-full flex-1 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3.5 text-base text-white placeholder:text-white/40 focus-visible:border-coral-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-primary"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-coral-primary px-7 py-3.5 text-base font-bold tracking-wide text-[var(--color-on-accent)] transition-transform duration-200 hover:scale-[1.03]"
                      >
                        {t("comingSoon.submit")}
                        <ArrowRight size={18} aria-hidden />
                      </button>
                    </form>

                    {waitlist === "invalid" && (
                      <p
                        id="waitlist-error"
                        role="alert"
                        className="mt-3 text-sm font-medium text-[#FF8A7D]"
                      >
                        {t("comingSoon.invalid")}
                      </p>
                    )}
                    {waitlist === "busy" && (
                      <p
                        role="alert"
                        className="mt-3 text-sm font-medium text-[#FF8A7D]"
                      >
                        {t("comingSoon.busy")}
                      </p>
                    )}
                    {waitlist === "error" && (
                      <p
                        role="alert"
                        className="mt-3 text-sm font-medium text-[#FF8A7D]"
                      >
                        {t("comingSoon.error")}
                      </p>
                    )}

                    {/*
                      The link is not decoration. This form is the only place
                      on the gated site that collects personal data, so the
                      notice describing what happens to it has to be reachable
                      from here, at the moment it is given. /privacy is let
                      through the gate in the Caddyfile for the same reason.
                    */}
                    <p id="waitlist-note" className="mt-4 text-sm text-white/50">
                      {t("comingSoon.noteBefore")}{" "}
                      <a
                        href={privacyHref}
                        className="font-medium text-white/70 underline underline-offset-2 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-primary"
                      >
                        {t("comingSoon.noteLink")}
                      </a>
                      .
                    </p>
                  </>
                )}

                {waiting !== null && (
                  <p className="mt-5 border-t border-white/10 pt-4 text-sm text-white/60">
                    {t("comingSoon.waiting", { count: waiting })}
                  </p>
                )}
              </section>
            </div>

            {/*
              The same composition the landing page opens with, so the two
              pages are recognisably one product rather than a poster and a
              placeholder. It carries its own "these aren't real people" line,
              which this page needs more than the landing page does.
            */}
            <div className="lg:pl-4">
              <BunchCluster />
            </div>
          </div>

          {/* What it actually is, in three beats. */}
          <section className="mt-16">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#9B85FF]">
              {t("comingSoon.howItWorks")}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <Beat
                n="01"
                tone="#FF5C6C"
                title={t("comingSoon.beatOneTitle")}
                body={t("comingSoon.beatOneBody")}
              />
              <Beat
                n="02"
                tone="#9B85FF"
                title={t("comingSoon.beatTwoTitle")}
                body={t("comingSoon.beatTwoBody")}
              />
              <Beat
                n="03"
                tone="#55D6BE"
                title={t("comingSoon.beatThreeTitle")}
                body={t("comingSoon.beatThreeBody")}
              />
            </div>
          </section>

          {/* The differentiator, stated as a refusal. */}
          <section className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-7">
              <h2 className="text-xl font-bold tracking-tight">
                {t("comingSoon.refusalTitle")}
              </h2>
              <ul className="mt-4 space-y-2.5 text-white/65">
                <Nope>{t("comingSoon.refusalFeed")}</Nope>
                <Nope>{t("comingSoon.refusalFollowers")}</Nope>
                <Nope>{t("comingSoon.refusalSwiping")}</Nope>
                <Nope>{t("comingSoon.refusalNotifications")}</Nope>
              </ul>
              <p className="mt-5 border-t border-white/10 pt-4 text-sm text-white/50">
                {t("comingSoon.refusalClosing")}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-7">
              <h2 className="text-xl font-bold tracking-tight">
                {t("comingSoon.onlineTitle")}
              </h2>
              <p className="mt-4 leading-relaxed text-white/65">
                {t("comingSoon.onlineBody", { brand: brand.name })}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  t("comingSoon.tagCoop"),
                  t("comingSoon.tagWatch"),
                  t("comingSoon.tagCowork"),
                  t("comingSoon.tagCoffee"),
                  t("comingSoon.tagBoardGames"),
                  t("comingSoon.tagHiking"),
                ].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5 text-sm text-white/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Who is behind it. The honest part. */}
          <section className="mt-16 flex flex-col items-start gap-6 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-7 sm:flex-row sm:items-center">
            <div className="flex -space-x-3">
              {["S", "M", "E", "T", "P"].map((initial) => (
                <span
                  key={initial}
                  className="flex size-11 items-center justify-center rounded-full text-sm font-bold ring-4 ring-band-deep"
                  style={{
                    background: person(initial).fill,
                    color: person(initial).ink,
                  }}
                >
                  {initial}
                </span>
              ))}
            </div>
            <p className="text-white/65">
              <span className="font-semibold text-white">
                {t("comingSoon.builtTitle")}
              </span>{" "}
              {t("comingSoon.builtBody")}
            </p>
          </section>

          {/*
            The form is at the top, and by here it is a screen or three behind
            the reader. A link back to it rather than a second form: two forms
            on one page means two fields carrying the same id, which is exactly
            the kind of thing that sends a screen reader to the wrong one.
            Nothing to offer someone who has already joined, so it is skipped.
          */}
          {waitlist !== "joined" && (
            <section className="mt-16 flex flex-col items-center gap-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
              <h2 className="max-w-lg text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                {t("brand.tagline")}
              </h2>
              <p className="max-w-md text-white/60">
                {t("comingSoon.closingBody")}
              </p>
              <a
                href="#waitlist"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-coral-primary px-7 py-3.5 text-base font-bold tracking-wide text-[var(--color-on-accent)] transition-transform duration-200 hover:scale-[1.03]"
              >
                {t("comingSoon.submit")}
                <ArrowRight size={18} aria-hidden />
              </a>
            </section>
          )}

          {/*
            The Discord, and this is the page that most needs it.

            Behind the gate there is nothing to do here: the waiting list takes
            an address and then the page is over, which is a strange thing to
            hand somebody who just decided they were interested. The Discord is
            the one place where the thing this product is about can actually
            happen before the product exists, so it is offered to everybody,
            including the people who already left an address. Those two are
            different promises: the list tells you when, the Discord is where
            people already are.

            A link, not an embedded widget. A widget is a third-party iframe
            and a set of requests the reader did not ask for, on a site whose
            About page promises no third-party anything.
          */}
          <section className="mt-6 flex flex-col items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
            <span
              aria-hidden
              className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/[0.06] text-white/70"
            >
              <MessagesSquare size={22} />
            </span>
            <h2 className="max-w-lg text-balance text-xl font-bold tracking-tight sm:text-2xl">
              {t("comingSoon.discordTitle")}
            </h2>
            <p className="max-w-md text-white/60">
              {t("comingSoon.discordBody", { brand: brand.name })}
            </p>
            <a
              href={brand.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-3.5 text-base font-bold tracking-wide transition-colors duration-200 hover:bg-white/[0.07]"
            >
              {t("comingSoon.discordCta")}
              <ArrowRight size={18} aria-hidden />
            </a>
          </section>
        </main>

        <footer className="mt-16 border-t border-white/10 pt-8 text-sm text-white/50">
          {brand.name}. {t("brand.tagline")}
        </footer>
      </div>
    </div>
  );
}

function Beat({
  n,
  tone,
  title,
  body,
}: {
  n: string;
  tone: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6">
      <span
        className="text-xs font-bold tabular-nums tracking-widest"
        style={{ color: tone }}
      >
        {n}
      </span>
      <h3 className="mt-3 text-lg font-bold tracking-tight">{title}</h3>
      <p className="mt-2 leading-relaxed text-white/65">{body}</p>
    </div>
  );
}

function Nope({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-white/30" />
      {children}
    </li>
  );
}
