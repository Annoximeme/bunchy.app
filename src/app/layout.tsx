import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { brand } from "@/lib/brand";
import { LOCALE_TAGS, type Locale } from "@/lib/i18n/config";
import { LanguageProvider } from "@/components/link";
import { currentLocale, getTranslations, languageAlternates } from "@/server/i18n";
import { env } from "@/server/env";
import "./globals.css";

/**
 * Generated per request rather than declared once, because two things in here
 * are facts about the reader: which language this page is being served in, and
 * therefore what the other two addresses for it are.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const alternates = await languageAlternates();

  return {
    /**
     * Without this, Next resolves og:image against http://localhost:3000 and
     * every shared link previews with an image no crawler can fetch, which is
     * indistinguishable from having no image at all, and was.
     *
     * `next build` evaluates this, so APP_URL is passed into the build as an
     * argument (see the Dockerfile). The fallback is the development origin
     * rather than the production domain: a preview pointing at localhost is
     * obviously broken, while one silently pointing at bunchy.app from a staging
     * build is not.
     */
    metadataBase: new URL(env().APP_URL),
    title: {
      default: `${brand.name}, ${brand.tagline}`,
      template: `%s · ${brand.name}`,
    },
    description: brand.subtitle,
    applicationName: brand.name,
    /**
     * The canonical address, and this page's address in the other two
     * languages, resolved per route against `metadataBase`.
     *
     * The canonical is belt to the Caddyfile's braces: www now 301s to the
     * apex, so the two-host split cannot happen at the network level, and this
     * says the same thing in the document for anything that arrives with a
     * tracking parameter stapled to the URL. `?utm_source=…` is a different URL
     * to a crawler, and without a canonical each campaign link becomes its own
     * thin duplicate of the page.
     *
     * The `languages` half is what stops the three language versions competing
     * with each other for the same search: they are one page at three
     * addresses, and each one says so.
     */
    alternates,
    openGraph: {
      title: `${brand.name}, ${brand.tagline}`,
      description: brand.subtitle,
      siteName: brand.name,
      type: "website",
      locale: OG_LOCALES[locale],
      url: alternates.canonical,
    },
    /**
     * Without this the card falls back to a small thumbnail beside the text. The
     * OG image is a 1200×630 composition that is illegible at that size, so the
     * one thing it exists to do only happens if the card type is declared.
     */
    twitter: {
      card: "summary_large_image",
      title: `${brand.name}, ${brand.tagline}`,
      description: brand.subtitle,
    },
    // This is a place to meet people, not a page to be indexed for.
    robots: { index: true, follow: true },
  };
}

/** What Open Graph calls these three. Not the same spelling as `hreflang`. */
const OG_LOCALES: Record<Locale, string> = {
  en: "en_GB",
  nl: "nl_BE",
  fr: "fr_BE",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfbf8" },
    { media: "(prefers-color-scheme: dark)", color: "#15120f" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * Applied before the first paint, so a hard refresh never flashes the wrong
 * theme at somebody who chose one.
 *
 * It carries the CSP nonce because this app runs a nonce-based policy with no
 * `unsafe-inline`, an unnonced inline script here would simply be refused, and
 * the theme would flicker on every load with nothing in the console to explain
 * it. `system` is stored as the absence of the attribute, which is what lets the
 * media query take over again.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem("bunchy-theme");if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t}}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const locale = await currentLocale();
  const t = await getTranslations();

  return (
    // `suppressHydrationWarning`: the script above edits this element before
    // React arrives, which is the entire point of it running that early.
    <html lang={LOCALE_TAGS[locale]} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only rounded-full bg-accent px-4 py-2 text-[var(--color-on-accent)] focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          {t("common.skipToContent")}
        </a>
        <LanguageProvider locale={locale}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
