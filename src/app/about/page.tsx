import type { Metadata } from "next";
import { Link } from "@/components/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { brand } from "@/lib/brand";
import { BunchyLogo } from "@/components/logo";
import { SITE_LINKS } from "@/components/site-links";
import { ABOUT } from "@/content/about";
import { getViewer } from "@/server/auth/current-user";
import { currentLocale, getTranslations } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const doc = ABOUT[await currentLocale()];
  return { title: doc.title, description: doc.metaDescription };
}

/**
 * What this is and why it exists.
 *
 * The page a person reads when they want to know whether to trust the thing.
 * That makes honesty the whole design brief: every claim here is either
 * something the code actually does, something written in the policies, or an
 * intention explicitly labelled as one. There are no user numbers, no
 * testimonials and no "trusted by" row, because Bunchy has not launched and
 * every one of those would have to be invented.
 *
 * ## Why it is a composition rather than a themed document
 *
 * It used to follow the reader's theme, on the reasoning that the landing page
 * is a poster and this is a document. It is now banded, navy where Bunchy is
 * making a claim, cream where it is explaining itself, because the argument
 * has a shape: statement, reasoning, refusal, the person responsible, the
 * offer. Alternating grounds are what let a reader feel that shape while
 * scrolling rather than having to parse fourteen headings to find it.
 *
 * The cost of pinning is that every colour has to be written literally, since
 * the tokens flip under a dark OS and a half-inverted composition is worse
 * than either. Same discipline as the landing page, same reason.
 *
 * ## Motion
 *
 * `.reveal` is a scroll-driven CSS animation, not a library. It is guarded
 * twice, unsupported browsers never see the rule, and anyone who asked for
 * less motion is excluded before that, so the content is plainly visible in
 * both cases. This page is read, not watched.
 */

/** Body and headings. Self-hosted through next/font; the CSP blocks Google's CDN. */
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export default async function AboutPage() {
  const t = await getTranslations();
  const viewer = await getViewer();
  // A signed-in member can actually start one. Sending them to signup would be
  // a door they have already walked through.
  const startHref = viewer ? "/start" : "/signup";
  const doc = ABOUT[await currentLocale()];

  return (
    <div className={`${display.className} min-h-dvh bg-band-soft text-ink`}>
      {/* ----------------------------------------------------------------- 1
        A `div`, not a `section`. `<header>` only carries the banner role when
        it is not inside article, aside, main, nav or section, nesting it in a
        section silently demoted the masthead to a plain group, which put the
        skip link and the logo outside any landmark at all. An axe pass with the
        best-practice rules on is what surfaced it.
      */}
      <div className="bg-band-deep text-white">
        <header className="relative mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-6">
          <Link href="/" aria-label={brand.name}>
            <BunchyLogo height={20} color="#ffffff" />
          </Link>
          {/* The shared nav reads from theme tokens, which are wrong on a
              pinned ground. Same list, styled for navy. */}
          <nav aria-label={`${brand.name} pages`} className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {SITE_LINKS.filter((link) => link.href !== "/about").map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/60 transition-colors hover:text-white"
              >
                {t(link.label)}
              </Link>
            ))}
          </nav>
        </header>
      </div>

      <main id="main">
        <doc.Body startHref={startHref} />
      </main>

      {/*
        Outside `main`, and not nested in a section: `<footer>` only carries the
        contentinfo role at the top level, and inside a section it is just a
        group, which is how the site links ended up in no landmark at all.
      */}
      <footer className="bg-band-deep px-5 pb-14 text-sm text-white">
        <div className="mx-auto max-w-3xl border-t pt-8" style={{ borderColor: "rgb(255 255 255 / 0.10)" }}>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <p className="text-white/60">
              {brand.name}. {t("brand.tagline")}
            </p>
            <nav aria-label={`More about ${brand.name}`}>
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {SITE_LINKS.filter((link) => link.href !== "/about").map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-white/60 transition-colors hover:text-white"
                    >
                      {t(link.label)}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/" className="text-white/60 transition-colors hover:text-white">
                    Home
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** The refusals, each carrying the reason it is a decision rather than a gap. */

/** A full-width band of the composition. Cream is the reading ground. */
