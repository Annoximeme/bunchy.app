import { Link } from "@/components/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AntiFeedDemo } from "@/components/landing/anti-feed-demo";
import { WaysInTabs } from "@/components/landing/ways-in-tabs";
import { ModerationBanner } from "@/components/landing/moderation-banner";
import { TheDifference } from "@/components/landing/the-difference";
import { PebbleBoard } from "@/components/landing/pebble-board";
import { redirect } from "next/navigation";
import { env } from "@/server/env";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight, Heart, MessageCircle, Sparkles } from "lucide-react";
import { getViewer } from "@/server/auth/current-user";
import { onboardingPath } from "@/server/modules/profile/service";
import { brand } from "@/lib/brand";
import { person } from "@/lib/example-people";
import { BunchyLogo, BunchyMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SITE_LINKS } from "@/components/site-links";
import { BunchCluster } from "@/components/landing/bunch-cluster";
import { BunchMoment } from "@/components/landing/bunch-moment";
import { UpFor } from "@/components/landing/up-for";
import { HappeningNow } from "@/components/landing/happening-now";
import { currentLocale, getTranslations, localeHref } from "@/server/i18n";
import { LOCALE_TAGS, type Locale } from "@/lib/i18n/config";

/**
 * The landing page.
 *
 * A fixed composition rather than a themed one: navy where the product is being
 * shown off, cream where it is being explained, whatever the reader's theme
 * says. Every colour here is written literally for that reason, the tokens
 * flip, and a page that inverts halfway down is not a composition.
 *
 * The font is self-hosted through next/font. Google's CDN is blocked by this
 * app's CSP, and rightly: a font request is a request that carries a referrer
 * to somebody else's server on every single page load.
 */
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/**
 * Structured data, restricted to what is actually true.
 *
 * `WebSite` and `WebApplication` and nothing else. Not `Organization`: Bunchy
 * is run by one person and is explicitly not a company (see lib/legal.ts), and
 * claiming a corporate identity in machine-readable form to win a knowledge
 * panel is exactly the kind of thing that is both dishonest and, when noticed,
 * a manual action.
 *
 * No `aggregateRating` and no `review` either. Those are the two properties
 * most worth faking and the two Google penalises hardest for self-serving
 * markup, and there is nothing to report, because nobody has used this yet.
 *
 * The price is a real claim the page already makes out loud, so it is safe to
 * make it here as well.
 */
function structuredData(origin: string, locale: Locale, description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: `${origin}/`,
        name: brand.name,
        description,
        inLanguage: LOCALE_TAGS[locale],
      },
      {
        "@type": "WebApplication",
        "@id": `${origin}/#app`,
        name: brand.name,
        url: `${origin}/`,
        description,
        applicationCategory: "SocialNetworkingApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript for some features.",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
        },
      },
    ],
  };
}

/**
 * Whether this visit is somebody deliberately asking for the landing page.
 *
 * A signed-in member arriving at `/` is almost always a stray tap on a logo or
 * a bookmark, and sending them to the product rather than the pitch is right.
 * But the redirect was unconditional, which meant that once you had an account
 * the landing page became unreachable: you could not re-read what you signed up
 * for, and the person who builds this could not look at his own front page
 * without signing out.
 *
 * Same failure the site links already had, where signing in put About, Safety
 * and the volunteer page behind a door with no handle. The fix is the same
 * shape. An explicit request is honoured; a stray one is not.
 */
function wantsTheLandingPage(params: { home?: string }): boolean {
  return params.home !== undefined;
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ home?: string }>;
}) {
  const viewer = await getViewer();
  const params = await searchParams;
  if (viewer && !wantsTheLandingPage(params)) {
    redirect(await localeHref(onboardingPath(viewer.onboardingStage)));
  }

  // Carries the CSP nonce: this app runs a nonce-based policy with no
  // `unsafe-inline`, and an unnonced inline script is refused outright.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const locale = await currentLocale();
  const t = await getTranslations();
  const jsonLd = structuredData(
    env().APP_URL.replace(/\/$/, ""),
    locale,
    t("brand.subtitle"),
  );

  return (
    <div className={`${display.className} min-h-dvh bg-band-deep text-white`}>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 1: Navigation */}
      <header className="absolute inset-x-0 top-0 z-40">
        {/*
          Four things do not fit across a phone, and this row was proof of it:
          at 390px the language pills sat on top of the wordmark, "Sign in"
          broke across two lines, and the join button ran 31px off the side of
          the screen and took the whole page's horizontal scroll with it. In
          Dutch, where the same button reads "Word lid van Bunchy", it was
          worse. So the phone gets three of the four.

          Signing in is the one that goes. It is the action a returning member
          takes, they know where it is, and it is still in the footer of this
          page and on the sign-up card itself. The language switcher stays,
          because the visitor who needs it most cannot read the header, and the
          button that ends the page stays because it is the point of the page.
        */}
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-5">
          <BunchyLogo height={24} color="#FFFFFF" />
          <nav className="flex items-center gap-1 sm:gap-2">
            {/* Before the two calls to action rather than in the footer. The
                one visitor who needs it most is the one who has not read the
                headline yet. */}
            <LanguageSwitcher className="text-white/70 sm:mr-1" compact />
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:text-white sm:inline-block"
            >
              {t("landing.signIn")}
            </Link>
            <Link
              href="/signup"
              className="whitespace-nowrap rounded-full bg-coral-primary px-4 py-2.5 text-sm font-semibold text-[var(--color-on-accent)] transition-transform duration-200 hover:scale-[1.03] sm:px-5"
            >
              <span className="sm:hidden">{t("landing.joinShort")}</span>
              <span className="hidden sm:inline">
                {t("landing.join", { brand: brand.name })}
              </span>
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* 2: Hero */}
        <section className="relative overflow-hidden pb-20 pt-28 md:pt-36">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(48rem 30rem at 8% -8%, rgba(255,92,108,0.20), transparent 62%), radial-gradient(44rem 28rem at 96% 8%, rgba(118,87,255,0.26), transparent 62%)",
            }}
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1.02fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-mint-status/30 bg-mint-status/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-mint-status">
                <span className="size-1.5 rounded-full bg-mint-status" />
                {t("landing.badge")}
              </span>

              <h1 className="mt-6 text-balance text-[2.75rem] font-extrabold leading-[1.03] tracking-tight sm:text-6xl">
                {t("landing.headlineBefore")}{" "}
                <span
                  style={{
                    background:
                      "linear-gradient(100deg, #FF5C6C 0%, #7657FF 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {t("landing.headlineEmphasis")}
                </span>{" "}
                {t("landing.headlineAfter")}
              </h1>

              <p className="mt-6 max-w-lg text-xl font-semibold leading-snug text-white/90">
                {t("landing.lead")}
              </p>

              <p className="mt-3 max-w-lg text-lg leading-relaxed text-white/65">
                {t("landing.body", { brand: brand.name })}{" "}
                <span className="font-semibold text-mint-status">
                  {t("landing.online")}
                </span>
                ,{" "}
                <span className="font-semibold text-yellow-fun">
                  {t("landing.nearby")}
                </span>
                {t("landing.orBoth")}
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-coral-primary px-8 py-4 text-base font-bold tracking-wide text-[var(--color-on-accent)] shadow-[0_18px_40px_-18px_#FF5C6C] transition-transform duration-200 hover:scale-[1.04]"
                >
                  {t("landing.findMyBunch")}
                  <ArrowRight size={18} aria-hidden />
                </Link>
                <Link
                  href="/signup?start=surprise"
                  className="inline-flex items-center gap-2 rounded-full border border-purple-glow bg-transparent px-6 py-4 text-base font-semibold text-white transition-all duration-200 hover:bg-purple-glow/15 hover:shadow-[0_0_40px_-8px_#7657FF]"
                >
                  <Sparkles size={18} aria-hidden />
                  {t("landing.surpriseMe")}
                </Link>
              </div>

              <p className="mt-5 text-sm text-white/50">
                {t("landing.alreadyKnow")}{" "}
                <Link
                  href="/signup"
                  className="font-medium text-white/80 underline underline-offset-4 hover:text-white"
                >
                  {t("landing.exploreBunches")}
                </Link>
              </p>
            </div>

            <BunchCluster />
          </div>
        </section>

        {/* 2b, The product, starting here */}
        <section className="px-5 pb-4">
          <div className="reveal mx-auto max-w-6xl">
            <UpFor />
          </div>
        </section>

        {/* 2c, What's happening */}
        <HappeningNow />

        {/* 3: The contrast, in daylight */}
        <section className="bg-band-soft px-5 py-24 text-ink">
          <div className="mx-auto max-w-6xl">
            <p className="reveal text-sm font-bold tracking-widest text-accent-ink">
              {t("landing.problemEyebrow")}
            </p>
            <h2 className="reveal mt-3 max-w-3xl text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {t("landing.problemTitle")}
            </h2>

            {/*
              The two sides are deliberately not the same kind of object.
              Everywhere else is a rectangle: bordered, flat, tidy, a count in a
              box. Bunchy is a cluster with no box around it at all. The section
              used to draw both as the same rounded card, which meant the
              argument was carried entirely by the words inside them and the
              picture said the two things were equivalent.

              `items-center` rather than `items-stretch` for the same reason,
              matching the cluster's height to the card would put it back in an
              invisible box.
            */}
            <div className="reveal mt-14 grid grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-10">
              {/* Everywhere else. Sterile on purpose. */}
              <div className="rounded-2xl border border-line bg-band-warm p-8">
                <p className="text-xs font-semibold tracking-widest text-muted">
                  {t("landing.everywhereElse")}
                </p>
                <div className="mt-6 space-y-3">
                  <p className="text-3xl font-bold text-muted">
                    {t("landing.followers")}
                  </p>
                  <p className="flex items-center gap-2 text-muted">
                    <Heart size={18} aria-hidden />
                    {t("landing.likes")}
                  </p>
                  <p className="flex items-center gap-2 text-muted">
                    <MessageCircle size={18} aria-hidden />
                    {t("landing.comments")}
                  </p>
                </div>
                <p className="mt-8 border-t border-line pt-5 text-muted">
                  {t("landing.stillNobody")}
                </p>
              </div>

              {/* Here. No card, no border, no box. */}
              <div className="relative px-2 py-4">
                {/* Organic ground. Three soft blobs at low opacity doing the job
                    a card border used to do, holding the group together,
                    without drawing a container around people. */}
                {/* `z-0` and not `-z-10`: a negative index puts these behind the
                    section's own background, which is where they spent their
                    first draft, invisible. */}
                {/*
                  Faint, and centred on the avatars rather than on the words.
                  The first version ran these at 20–28% and put a coral one
                  under the eyebrow and the activity pills: an axe pass came
                  back with two contrast failures, because #CE2F45 and #8a5e00
                  are measured against cream and had no headroom left once cream
                  had been tinted pink. The token block upstairs already says
                  this, the ambient washes are 0.07 on light "because the same
                  gesture at the same strength would read as a stain on cream".
                */}
                <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
                  <div
                    className="float absolute left-2 top-6 size-56 rounded-full bg-coral-primary/12 blur-3xl"
                    style={{
                      ["--float-distance" as string]: "16px",
                      ["--float-duration" as string]: "9s",
                    }}
                  />
                  <div
                    className="float absolute left-40 top-2 size-52 rounded-full bg-purple-glow/10 blur-3xl"
                    style={{
                      ["--float-distance" as string]: "12px",
                      ["--float-duration" as string]: "11s",
                      ["--float-delay" as string]: "1.2s",
                    }}
                  />
                  <div
                    className="float absolute left-24 top-24 size-48 rounded-full bg-mint-status/12 blur-3xl"
                    style={{
                      ["--float-distance" as string]: "14px",
                      ["--float-duration" as string]: "10s",
                      ["--float-delay" as string]: "0.6s",
                    }}
                  />
                </div>

                <p className="relative z-10 text-xs font-semibold tracking-widest text-accent-ink">
                  {t("landing.onBunchy", { brand: brand.name.toUpperCase() })}
                </p>

                {/* Bigger than the old avatars and overlapping harder. Each one
                    floats on its own clock so the group reads as four people
                    rather than one graphic. */}
                <div className="relative z-10 mt-6 flex -space-x-5">
                  {CONTRAST_BUNCH.map((a, i) => (
                    <span
                      key={a.i}
                      className="float flex size-20 items-center justify-center rounded-full text-xl font-bold text-white ring-4 ring-band-soft"
                      style={{
                        background: a.c,
                        ["--float-distance" as string]: "7px",
                        ["--float-duration" as string]: `${4.4 + i * 0.5}s`,
                        ["--float-delay" as string]: `${i * 0.35}s`,
                        zIndex: CONTRAST_BUNCH.length - i,
                      }}
                    >
                      {a.i}
                    </span>
                  ))}
                </div>

                {/* Attached to the group rather than listed under it. */}
                <div className="relative z-10 mt-7 flex flex-wrap items-center gap-2.5">
                  <span className="-rotate-2">
                    <Pill>🎮 Gaming</Pill>
                  </span>
                  <span className="rotate-1">
                    <Pill>🍜 Food</Pill>
                  </span>
                  <span className="-rotate-1">
                    <Pill>🥾 Hiking</Pill>
                  </span>
                </div>

                {/* One exchange, kept from the table this section used to be:
                    the argument is against followers, not against screens, so
                    the online plan stays visible. */}
                <div
                  className="float relative z-10 mt-7 inline-flex max-w-full flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-3xl rounded-bl-lg bg-surface px-5 py-3.5 shadow-[0_18px_40px_-28px_rgba(23,32,51,0.55)]"
                  style={{
                    ["--float-distance" as string]: "5px",
                    ["--float-duration" as string]: "6.1s",
                    ["--float-delay" as string]: "0.9s",
                  }}
                >
                  <span className="text-[11px] font-bold tracking-widest text-mint-ink">
                    {t("landing.onlineTag")}
                  </span>
                  <span className="font-semibold text-ink">
                    {t("landing.quoteAsk")}
                  </span>
                  <span className="text-ink-soft">{t("landing.quoteYep")}</span>
                </div>

                {/* The payoff, in the same position as "Still nobody to go out
                    with." on the left. The two lines are the whole section. */}
                <p className="relative z-10 mt-8 text-2xl font-extrabold tracking-tight text-ink">
                  {t("landing.goingSaturday")}
                </p>
              </div>
            </div>

            <p className="reveal mx-auto mt-10 max-w-2xl text-balance text-center text-lg text-ink-soft">
              {t("landing.problemClosing")}
            </p>
          </div>
        </section>

        {/*
          The argument above is prose. This is the same argument as a picture,
          placed immediately after it so the section reads as claim then proof.
        */}
        <TheDifference />

        {/* 4b: The board, as objects */}
        <section className="bg-canvas px-5 pb-24 text-ink">
          <div className="mx-auto max-w-6xl">
            <h2 className="reveal max-w-2xl text-balance text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t("landing.boardTitle")}
            </h2>
            <p className="reveal mt-3 max-w-2xl text-ink-soft">
              {t("landing.boardBody")}
            </p>
            <div className="mt-10">
              <PebbleBoard />
            </div>
          </div>
        </section>

        {/* 5: The signature moment */}
        <section className="px-5 py-24">
          <div className="reveal mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold tracking-widest text-[#9B85FF]">
              {t("landing.momentEyebrow")}
            </p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t("landing.momentTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/65">
              {t("landing.momentBody")}
            </p>
          </div>

          <div className="mt-12">
            <BunchMoment />
          </div>
        </section>

        {/* 6: How it works, in daylight */}
        <section className="bg-band-soft px-5 py-24 text-ink">
          <div className="mx-auto max-w-6xl">
            <p className="reveal text-sm font-bold tracking-widest text-accent-ink">
              {t("landing.stagesEyebrow", { brand: brand.name.toUpperCase() })}
            </p>
            <h2 className="reveal mt-3 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t("landing.stagesTitle")}
            </h2>

            {/*
              A sequence, drawn as one. The connector is the point: these are
              not five features, they are five positions along the same evening.
            */}
            <ol className="reveal relative mt-14 grid grid-cols-1 gap-8 md:grid-cols-5 md:gap-4">
              {/*
                Ends on the last dot rather than the container. The dots sit at
                the left edge of five equal columns, so the span between the
                first and last centre is four columns plus four gaps, not the
                full width, which ran the line a whole column past Together.
              */}
              {/*
                A ribbon rather than a rule. The connector was a 1px straight
                line between five small dots, which is the drawing you make when
                the five things are rows in a pipeline, and this is meant to be
                an evening, not a funnel. Same anchor points, same arithmetic:
                the dots sit at the left edge of five equal columns, so the span
                between the first and last centre is four columns plus four
                gaps. The curve just takes a longer route between them.

                `vector-effect` keeps the stroke an even weight, since
                `preserveAspectRatio="none"` stretches the box horizontally.
              */}
              <svg
                aria-hidden
                viewBox="0 0 1000 100"
                preserveAspectRatio="none"
                className="absolute left-[1.125rem] top-0 hidden h-9 w-[calc(80%+0.8rem)] md:block"
              >
                <defs>
                  <linearGradient id="stage-flow" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FF5C6C" />
                    <stop offset="50%" stopColor="#7657FF" />
                    <stop offset="100%" stopColor="#55D6BE" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,50 C60,10 190,10 250,50 C310,90 440,90 500,50 C560,10 690,10 750,50 C810,90 940,90 1000,50"
                  fill="none"
                  stroke="url(#stage-flow)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <Stage
                index={0}
                colour="#FF5C6C"
                name={t("landing.stages.discover.name")}
                body={t("landing.stages.discover.body")}
              />
              <Stage
                index={1}
                colour="#9250FF"
                name={t("landing.stages.match.name")}
                body={t("landing.stages.match.body")}
              />
              <Stage
                index={2}
                colour="#7657FF"
                name={t("landing.stages.bunch.name")}
                body={t("landing.stages.bunch.body")}
              />
              <Stage
                index={3}
                colour="#22A08B"
                name={t("landing.stages.plan.name")}
                body={t("landing.stages.plan.body")}
              />
              <Stage
                index={4}
                colour="#55D6BE"
                name={t("landing.stages.together.name")}
                body={t("landing.stages.together.body")}
                emphasis
              />
            </ol>

            {/*
              The claim and its demonstration, side by side. The sentence has
              carried this section on its own since the page was written; the
              phone beside it is the first place the product actually shows the
              thing it keeps asserting.
            */}
            {/*
              A fixed track for the phone, not `auto`.

              `auto` sized the column to the demo's own content, and the demo
              asks for `w-full`, which resolves against that column, which is
              sized by the content. The circle collapses to the widest
              unbreakable word inside it: the phone rendered about 80px across,
              the frames overlapped, and the last line of the message was cut
              off. A named width breaks the loop.
            */}
            {/* 14rem rather than 17. At 17 the frame stood 514px tall next to a
                two-line sentence, and the row was mostly the empty cream
                between them. */}
            <div className="reveal mt-12 grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_14rem] md:gap-12">
              <p className="max-w-2xl text-lg text-ink-soft">
                {t("landing.stagesClosing", { brand: brand.name })}
              </p>
              <AntiFeedDemo />
            </div>
          </div>
        </section>

        {/* 7: What you can actually do */}
        <section className="px-5 py-24">
          <div className="mx-auto max-w-6xl">
            <p className="reveal text-sm font-bold tracking-widest text-[#9B85FF]">
              {t("landing.waysEyebrow")}
            </p>
            <h2 className="reveal mt-3 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t("landing.waysTitle")}
            </h2>
            <p className="reveal mt-4 max-w-2xl text-white/60">
              {t("landing.waysBody")}
            </p>

            <div className="reveal">
              <WaysInTabs />
            </div>
          </div>
        </section>

        {/* 8: Online, in person, or both */}
        <section className="px-5 py-24">
          <div className="mx-auto max-w-6xl">
            <p className="reveal text-sm font-bold tracking-widest text-mint-status">
              {t("landing.plansEyebrow")}
            </p>
            <h2 className="reveal mt-3 max-w-3xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t("landing.plansTitle")}
            </h2>
            {/*
              No photographs and no testimonials. Bunchy has not launched, so
              every face and quote here would have to be invented or bought, on
              a page whose entire promise is meeting real people, and for a
              product whose own brand rules forbid claiming traction it does not
              have. These are the shapes of plans the product makes, labelled as
              such, and they get replaced the moment there are real ones to show.
            */}
            <p className="reveal mt-4 max-w-2xl text-white/60">
              {t("landing.plansBody", { brand: brand.name })}
            </p>

            {/*
              Masonry rather than a grid. Six equal rectangles in three columns
              is a table of plans; letting each card end where its own copy ends
              is a wall of them. The blobs behind sit in a different corner on
              each card and drift on their own clock, so the ground moves
              slightly and no two cards are the same shape of dark.
            */}
            <div className="mt-12 gap-5 sm:columns-2 lg:columns-3">
              <Moment
                index={0}
                shape="#55D6BE"
                tag={t("landing.plansTagOnline")}
                title={t("landing.plans.coop.title")}
                detail={t("landing.plans.coop.detail")}
                people={["M", "W", "S", "P"]}
              />
              <Moment
                index={1}
                shape="#55D6BE"
                tag={t("landing.plansTagOnline")}
                title={t("landing.plans.focus.title")}
                detail={t("landing.plans.focus.detail")}
                people={["E", "T", "M"]}
              />
              <Moment
                index={2}
                shape="#55D6BE"
                tag={t("landing.plansTagOnline")}
                title={t("landing.plans.watch.title")}
                detail={t("landing.plans.watch.detail")}
                people={["S", "P", "W", "T"]}
              />
              <Moment
                index={3}
                shape="#FFC857"
                tag={t("landing.plansTagInPerson")}
                title={t("landing.plans.coffee.title")}
                detail={t("landing.plans.coffee.detail")}
                people={["E", "T", "M"]}
              />
              <Moment
                index={4}
                shape="#FFC857"
                tag={t("landing.plansTagInPerson")}
                title={t("landing.plans.walk.title")}
                detail={t("landing.plans.walk.detail")}
                people={["T", "S", "E", "W"]}
              />
              <Moment
                index={5}
                shape="#9B85FF"
                tag={t("happeningNow.either")}
                title={t("landing.plans.boardGames.title")}
                detail={t("landing.plans.boardGames.detail")}
                people={["S", "M", "E", "T", "P", "W"]}
              />
            </div>

            {/* The optional evolution, offered, never required. */}
            <div className="reveal mt-8 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8">
              <h3 className="text-xl font-bold tracking-tight">
                {t("landing.plansBecome")}
              </h3>
              <p className="mt-3 max-w-2xl leading-relaxed text-white/60">
                {t("landing.plansBecomeBody", { brand: brand.name })}
              </p>
            </div>
          </div>
        </section>

        {/* 9: Recurring */}
        <section className="px-5 pb-24">
          <div className="reveal mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 sm:p-12">
            <p className="text-sm font-bold tracking-widest text-[#9B85FF]">
              {t("landing.recurringEyebrow")}
            </p>
            <h2 className="mt-3 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t("landing.recurringTitle")}
            </h2>
            <p className="mt-4 max-w-2xl text-white/60">
              {t("landing.recurringBody")}
            </p>

            <ul className="mt-9 flex flex-wrap gap-2.5">
              {[
                t("landing.recurringOne"),
                t("landing.recurringTwo"),
                t("landing.recurringThree"),
                t("landing.recurringFour"),
                t("landing.recurringFive"),
                t("landing.recurringSix"),
              ].map((r) => (
                <li
                  key={r}
                  className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/70"
                >
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Objections, kept from the previous page, because they convert */}
        <section className="bg-band-soft px-5 py-24 text-ink">
          <div className="reveal mx-auto max-w-3xl">
            <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t("landing.faqTitle")}
            </h2>
            <dl className="mt-10 divide-y divide-line border-y border-line">
              <Question q={t("landing.faqDatingQ")}>
                {t("landing.faqDatingA")}
              </Question>
              <Question q={t("landing.faqFreeQ")}>{t("landing.faqFreeA")}</Question>
              <Question q={t("landing.faqProfileQ")}>
                {t("landing.faqProfileA")}
              </Question>
              <Question q={t("landing.faqEmptyQ")}>
                {t("landing.faqEmptyA")}
              </Question>
            </dl>
          </div>
        </section>

        <ModerationBanner />

        {/* 7: Final CTA */}
        {/* py, not just pb: this section had no top padding, so the card began
            at the exact pixel the cream section ended and the two collided at
            the colour change. Every other section on the page is py-24. */}
        <section className="px-5 py-24">
          {/*
            The padding used to be 80px top and bottom against 24px at the
            sides, so the headline ran nearly edge to edge inside a card that
            was otherwise generously spaced. The sides now scale with the card
            rather than staying at a phone-sized inset, and the headline gets a
            max-width so it breaks at its own full stop instead of wherever the
            card happens to end.

            The vertical rhythm was also inverted: the gap *below* the subtitle
            was smaller than the one above it, which bunched all three text
            blocks together and then jumped to the button. The subtitle now sits
            tight to the headline it continues, and the paragraph starts a new
            beat with more air, not less.
          */}
          <div
            className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-20 text-center sm:px-14"
            style={{
              background: "linear-gradient(120deg, #FF5C6C 0%, #7657FF 100%)",
            }}
          >
            {/*
              Two sentences, so the line breaks between them rather than
              wherever the measure runs out. `text-balance` was breaking after
              "Do", which orphans a verb onto the end of one line and reads as
              a wrap rather than as the two-line statement this is meant to be.
            */}
            <h2 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl">
              <span className="block">{t("landing.closingOne")}</span>
              <span className="block">{t("landing.closingTwo")}</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg font-semibold text-white/90">
              {t("landing.closingSubtitle")}
            </p>
            <p className="mx-auto mt-6 max-w-lg text-white/80">
              {t("landing.closingBody")}
            </p>
            <Link
              href="/signup"
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-9 py-4 text-base font-bold text-[var(--color-on-accent)] transition-transform duration-200 hover:scale-[1.04]"
            >
              {t("landing.findMyBunch")}
              <ArrowRight size={18} aria-hidden />
            </Link>
            <p className="mx-auto mt-5 max-w-sm text-sm text-white/75">
              {t("landing.closingNote")}
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 text-sm text-white/50">
          <div className="flex items-center gap-3">
            <BunchyMark size={26} />
            <span>
              {brand.name}. {t("brand.tagline")}
            </span>
          </div>
          {/*
            Wrapping, like the row that holds it. Ten links and a theme toggle
            in a row that could not wrap came to 672px at phone width, which
            made the whole landing page scroll sideways: the one layout fault
            that makes every vertical swipe feel broken.
          */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/login" className="transition-colors hover:text-white">
              Sign in
            </Link>
            {/* One list, shared with the signed-in footer and the policy
                pages, so a page added there appears in all three rather than
                in whichever one somebody remembered. */}
            {SITE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-white"
              >
                {t(link.label)}
              </Link>
            ))}
            {/* This page is a fixed composition, but the control belongs
                somewhere reachable for the pages that are not. */}
            <ThemeToggle className="text-white/50 hover:bg-white/10 hover:text-white" />
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Activity tags. Yellow is activities; mint is reserved for availability.
 *
 * The ink is `#8a5e00` rather than the yellow fill: this pill sits on a white
 * card on the cream band, and #FFC857 on white is about 1.7:1: a colour that
 * works as a fill and not at all as text.
 */
/** The four in the contrast cluster. One of each brand accent. */
const CONTRAST_BUNCH = [
  { i: "S", c: "#FF5C6C" },
  { i: "M", c: "#7657FF" },
  { i: "E", c: "#55D6BE" },
  { i: "T", c: "#FFC857" },
] as const;

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-ink/25 bg-yellow-fun/20 px-3.5 py-1.5 text-sm font-semibold text-yellow-ink">
      {children}
    </span>
  );
}


/**
 * One position in the Discover → Match → Bunch → Plan → Together sequence.
 *
 * `emphasis` belongs to Meet alone. It is the stage the whole product exists to
 * reach, and a sequence that renders it identically to the four leading up to it
 * is quietly saying they matter the same amount.
 */
function Stage({
  colour,
  name,
  body,
  index,
  emphasis = false,
}: {
  colour: string;
  name: string;
  body: string;
  /** Position in the sequence, used only to put the floats out of phase. */
  index: number;
  emphasis?: boolean;
}) {
  return (
    <li className="relative">
      {/*
        The node sits on top of the ribbon and hides the piece of it that would
        otherwise run underneath, hence the ring in the band's own colour.
        Together is drawn larger and haloed: the copy says it is the only stage
        that counts, and five identical dots quietly said the opposite.
      */}
      <span
        className="float relative flex size-9 items-center justify-center rounded-full ring-4 ring-band-soft"
        style={{
          background: colour,
          boxShadow: emphasis ? `0 0 0 8px ${colour}33` : undefined,
          ["--float-distance" as string]: "5px",
          ["--float-duration" as string]: `${4.6 + index * 0.4}s`,
          ["--float-delay" as string]: `${index * 0.3}s`,
        }}
      >
        {emphasis && <span className="size-3 rounded-full bg-white" />}
      </span>
      <h3
        className={`mt-5 text-lg font-extrabold tracking-tight ${
          emphasis ? "text-mint-ink" : ""
        }`}
      >
        {name}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
    </li>
  );
}

/** Where each card's blob sits, so the six do not share one silhouette. */
const BLOB_POSITIONS = [
  "-right-16 -top-16 size-56",
  "-left-20 -bottom-16 size-64",
  "-right-20 bottom-0 size-52",
  "-left-16 -top-20 size-60",
  "right-0 -bottom-20 size-56",
  "-left-24 top-10 size-64",
] as const;

function Moment({
  shape,
  tag,
  title,
  detail,
  people,
  index = 0,
  className = "",
}: {
  shape: string;
  tag: string;
  title: string;
  detail: string;
  people: string[];
  /** Position in the wall, used for the blob placement and the drift phase. */
  index?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative mb-5 break-inside-avoid overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-7 ${className}`}
    >
      {/* The organic shape the brief asks for, behind the content, rather than
          decorating an empty corner. */}
      <div
        aria-hidden
        className={`float pointer-events-none absolute rounded-full blur-2xl ${
          BLOB_POSITIONS[index % BLOB_POSITIONS.length]
        }`}
        style={{
          background: shape,
          opacity: 0.22,
          ["--float-distance" as string]: "14px",
          ["--float-duration" as string]: `${7 + (index % 3) * 1.5}s`,
          ["--float-delay" as string]: `${index * 0.6}s`,
        }}
      />
      <div className="relative">
        {/*
          Uppercased to match the ONLINE / IN PERSON / EITHER badges on the
          board above. The same three words were set two different ways on one
          page, which reads as two different labelling systems.
        */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-widest"
          style={{ background: `${shape}22`, color: shape }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: shape }}
          />
          {tag.toUpperCase()}
        </span>
        <h3 className="mt-4 text-xl font-bold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{detail}</p>
        <div className="mt-6 flex -space-x-2.5">
          {people.map((initial, i) => (
            <span
              key={`${initial}-${i}`}
              className="flex size-9 items-center justify-center rounded-full text-xs font-bold ring-4 ring-band-deep"
              // Colour and label both come from who they are, the fill is too
              // bright to carry white on yellow or mint. See lib/palette.ts.
              style={{
                background: person(initial).fill,
                color: person(initial).ink,
              }}
            >
              {initial}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Question({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div className="py-5">
      <dt className="font-bold tracking-tight">{q}</dt>
      <dd className="mt-1.5 leading-relaxed text-ink-soft">{children}</dd>
    </div>
  );
}
