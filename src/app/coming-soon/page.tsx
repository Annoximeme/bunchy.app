import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight, Check } from "lucide-react";
import { brand } from "@/lib/brand";
import { BunchyLogo } from "@/components/logo";
import { person } from "@/lib/example-people";
import { publicWaitlistCount } from "@/server/modules/waitlist/service";

export const metadata: Metadata = {
  title: "Coming soon",
  description:
    "Bunchy helps you find people who are into the same things as you, and actually do something together. Online, nearby, or both.",
  robots: { index: false, follow: false },
};

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

  return (
    <div
      className={`${display.className} relative min-h-dvh overflow-hidden bg-navy-base text-white`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(46rem 28rem at 8% -8%, rgba(255,92,108,0.22), transparent 62%), radial-gradient(42rem 26rem at 94% 4%, rgba(118,87,255,0.26), transparent 62%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-5xl px-5 pb-20">
        <header className="py-8">
          <BunchyLogo height={24} color="#FFFFFF" />
        </header>

        <main id="main">
          <span className="inline-flex items-center gap-2 rounded-full border border-mint-status/30 bg-mint-status/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-mint-status">
            <span className="size-1.5 rounded-full bg-mint-status" />
            Opening soon
          </span>

          <h1 className="mt-6 max-w-3xl text-balance text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Making friends as an adult is{" "}
            <span
              style={{
                background: "linear-gradient(100deg, #FF5C6C 0%, #7657FF 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              absurdly hard.
            </span>{" "}
            It shouldn&rsquo;t be.
          </h1>

          <p className="mt-6 max-w-xl text-xl font-semibold leading-snug text-white/90">
            Tell us what you want to do. We&rsquo;ll find your people.
          </p>

          <p className="mt-3 max-w-xl text-lg leading-relaxed text-white/65">
            Gaming tonight. A film on Saturday. Coffee next week. {brand.name}{" "}
            finds four or five people who are into the same things and free when
            you are, then helps you make an actual plan.{" "}
            <span className="font-semibold text-mint-status">Online</span>,{" "}
            <span className="font-semibold text-yellow-fun">nearby</span>, or
            both.
          </p>

          {/* The point of the page. */}
          <section className="mt-10 max-w-xl rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-6 sm:p-8">
            {waitlist === "joined" ? (
              <div>
                <p className="flex items-center gap-2.5 text-lg font-bold text-mint-status">
                  <Check size={20} aria-hidden />
                  You&rsquo;re on the list.
                </p>
                <p className="mt-2 text-white/70">
                  We&rsquo;ll write to you once, on the day it opens. Nothing
                  before that, nothing after it unless you join.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold tracking-tight">
                  Want to know when it opens?
                </h2>
                <p className="mt-2 text-white/65">
                  Leave your email and we&rsquo;ll tell you. One message, on
                  launch day.
                </p>

                <form
                  action="/api/waitlist"
                  method="post"
                  className="mt-5 flex flex-col gap-3 sm:flex-row"
                >
                  <label htmlFor="waitlist-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="waitlist-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-describedby={
                      waitlist === "invalid" ? "waitlist-error" : "waitlist-note"
                    }
                    className="w-full flex-1 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3.5 text-base text-white placeholder:text-white/40 focus-visible:border-coral-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-primary"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-coral-primary px-7 py-3.5 text-base font-bold tracking-wide text-[#172033] transition-transform duration-200 hover:scale-[1.03]"
                  >
                    Keep me posted
                    <ArrowRight size={18} aria-hidden />
                  </button>
                </form>

                {waitlist === "invalid" && (
                  <p
                    id="waitlist-error"
                    role="alert"
                    className="mt-3 text-sm font-medium text-[#FF8A7D]"
                  >
                    That address didn&rsquo;t look right. Have another go?
                  </p>
                )}
                {waitlist === "busy" && (
                  <p
                    role="alert"
                    className="mt-3 text-sm font-medium text-[#FF8A7D]"
                  >
                    That&rsquo;s a lot of tries from one place. Give it an hour.
                  </p>
                )}
                {waitlist === "error" && (
                  <p
                    role="alert"
                    className="mt-3 text-sm font-medium text-[#FF8A7D]"
                  >
                    Something broke on our end. Not your fault. Try again in a
                    minute?
                  </p>
                )}

                <p id="waitlist-note" className="mt-4 text-sm text-white/50">
                  Your email, and nothing else. No name, no tracking, no
                  newsletter. Unsubscribing is replying once.
                </p>
              </>
            )}

            {waiting !== null && (
              <p className="mt-5 border-t border-white/10 pt-4 text-sm text-white/60">
                <span className="font-semibold text-white">{waiting}</span>{" "}
                people are waiting.
              </p>
            )}
          </section>

          {/* What it actually is, in three beats. */}
          <section className="mt-16">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#9B85FF]">
              How it works
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              <Beat
                n="01"
                tone="#FF5C6C"
                title="Say what you're up for"
                body="Gaming, a film, food, a walk. What you're into, and when you're actually free."
              />
              <Beat
                n="02"
                tone="#9B85FF"
                title="Meet your bunch"
                body="Four or five people with real overlap. Small enough that everybody speaks."
              />
              <Beat
                n="03"
                tone="#55D6BE"
                title="Do the thing"
                body="A voice channel on Thursday, a table on Saturday. Both count."
              />
            </div>
          </section>

          {/* The differentiator, stated as a refusal. */}
          <section className="mt-16 grid gap-5 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-7">
              <h2 className="text-xl font-bold tracking-tight">
                What you won&rsquo;t find
              </h2>
              <ul className="mt-4 space-y-2.5 text-white/65">
                <Nope>A feed to scroll</Nope>
                <Nope>Follower counts</Nope>
                <Nope>Swiping, or anything that ranks people by looks</Nope>
                <Nope>Notifications designed to pull you back</Nope>
              </ul>
              <p className="mt-5 border-t border-white/10 pt-4 text-sm text-white/50">
                A good session ends with you closing the tab, because you have
                somebody to talk to.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-7">
              <h2 className="text-xl font-bold tracking-tight">
                Online counts too
              </h2>
              <p className="mt-4 leading-relaxed text-white/65">
                {brand.name} isn&rsquo;t trying to get you off your screen, and
                it isn&rsquo;t trying to keep you on it. A bunch that plays every
                Thursday for two years and never meets is the product working
                exactly as intended.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "Co-op nights",
                  "Watch parties",
                  "Co-working",
                  "Coffee",
                  "Board games",
                  "Hiking",
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
                  className="flex size-11 items-center justify-center rounded-full text-sm font-bold ring-4 ring-navy-base"
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
                Built by one person, in the open.
              </span>{" "}
              No investors to answer to, nobody asking for engagement metrics.
              That&rsquo;s why there&rsquo;s no feed: nothing here needs your
              attention for its own sake. The faces above are examples, not
              members, because there aren&rsquo;t any yet.
            </p>
          </section>
        </main>

        <footer className="mt-16 border-t border-white/10 pt-8 text-sm text-white/50">
          {brand.name}. {brand.tagline}
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
