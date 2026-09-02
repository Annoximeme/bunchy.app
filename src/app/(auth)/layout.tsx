import { Link } from "@/components/link";
import { brand } from "@/lib/brand";
import { BunchyLogo } from "@/components/logo";
import { person } from "@/lib/example-people";
import { getTranslations } from "@/server/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

/**
 * The frame around signing in, joining, and the password flows.
 *
 * It used to be a white card centred in a flat cream field, which is a
 * different product to the one the landing page just spent a whole scroll
 * establishing. Clicking "Sign in" dropped you out of the dark composition into
 * something with no relationship to it.
 *
 * So the page keeps the navy ground and the two radial washes the hero opens
 * with, and on a wide screen it borrows the hero's shape as well: words on the
 * left, people on the right. The form itself stays on a themed surface rather
 * than being painted into the dark, because it is the one thing here somebody
 * has to read and type into, and it is also the last screen before an app that
 * follows their theme.
 *
 * The brand column is `hidden lg:flex`. On a phone the job is the form, and
 * pushing it below a panel of marketing is how you lose someone who was already
 * convinced.
 */

const CAST = ["S", "M", "E", "T", "P"];

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations();

  return (
    <div className="relative min-h-dvh bg-band-deep">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(42rem 26rem at 6% -6%, rgba(255,92,108,0.20), transparent 62%), radial-gradient(38rem 24rem at 96% 4%, rgba(118,87,255,0.24), transparent 62%)",
        }}
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5">
        <header className="flex items-center justify-between gap-4 py-6">
          <Link
            href="/"
            aria-label={t("authFrame.backHome", { brand: brand.name })}
            className="inline-block rounded"
          >
            <BunchyLogo height={22} color="#FFFFFF" />
          </Link>
          {/* Before the form rather than after it. Somebody who has to change
              language to read a password field should not have to read the
              password field first. */}
          <LanguageSwitcher className="text-white/70" compact />
        </header>

        <main
          id="main"
          className="flex flex-1 items-center py-8 lg:grid lg:grid-cols-[1fr_28rem] lg:gap-16"
        >
          {/* The half that says where you are. */}
          <div className="hidden lg:block">
            <span className="inline-flex items-center gap-2 rounded-full border border-mint-status/30 bg-mint-status/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-mint-status">
              <span className="size-1.5 rounded-full bg-mint-status" />
              {t("authFrame.badge")}
            </span>

            <p className="mt-6 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-white">
              {t("authFrame.headlineOne")}
              <br />
              {t("authFrame.headlineTwo")}
            </p>

            <p className="mt-4 max-w-sm text-lg leading-relaxed text-white/65">
              {t("authFrame.body")}
            </p>

            <div className="mt-10 flex items-center gap-4">
              {/*
                The padding is what makes the initials readable.

                Each circle is overlapped on its right by the next one, twelve
                pixels of it plus that circle's four-pixel ring, so a letter
                centred in the full forty-four had its right edge shaved off by
                the neighbour. Every initial in the row except the last was
                being read through a bite taken out of it. `pr-4` centres the
                letter in the part of the circle you can actually see.
              */}
              <div className="flex -space-x-3">
                {CAST.map((initial, index) => (
                  <span
                    key={initial}
                    className={`flex size-11 items-center justify-center rounded-full text-sm font-bold ring-4 ring-band-deep ${
                      index < CAST.length - 1 ? "pr-4" : ""
                    }`}
                    style={{
                      background: person(initial).fill,
                      color: person(initial).ink,
                    }}
                  >
                    {initial}
                  </span>
                ))}
              </div>
              <p className="text-sm text-white/55">
                {t("authFrame.exampleBunch", { brand: brand.name })}
              </p>
            </div>
          </div>

          {/*
            The half you came here to use. No card styling here, each form
            already brings its own surface, and wrapping a card in a card is how
            you get two borders and a shadow inside a shadow. This adds only the
            width, the centring and the lift off the dark ground.
          */}
          <div className="mx-auto w-full max-w-md animate-rise [&>*]:shadow-[0_30px_70px_-40px_rgba(0,0,0,0.85)]">
            {children}
          </div>
        </main>

        {/*
          Plain links rather than the old "By joining you agree to our terms",
          which was on every page in here, including Sign in and Reset your
          password, where nobody is joining anything. The signup form makes that
          statement itself, where it is true.
        */}
        <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-8 pt-6 text-sm text-white/55">
          <Link href="/safety" className="underline underline-offset-2 hover:text-white">
            {t("authFrame.safety")}
          </Link>
          <Link href="/privacy" className="underline underline-offset-2 hover:text-white">
            {t("authFrame.privacy")}
          </Link>
          <Link href="/terms" className="underline underline-offset-2 hover:text-white">
            {t("authFrame.terms")}
          </Link>
        </footer>
      </div>
    </div>
  );
}
