import type { Metadata, Viewport } from "next";
import { brand } from "@/lib/brand";
import { env } from "@/server/env";
import "./globals.css";

export const metadata: Metadata = {
  /**
   * Without this, Next resolves og:image against http://localhost:3000 and
   * every shared link previews with an image no crawler can fetch — which is
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
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.subtitle,
  applicationName: brand.name,
  openGraph: {
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.subtitle,
    siteName: brand.name,
    type: "website",
  },
  // This is a place to meet people, not a page to be indexed for.
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfbf8" },
    { media: "(prefers-color-scheme: dark)", color: "#15120f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only rounded-full bg-accent px-4 py-2 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
