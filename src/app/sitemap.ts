import type { MetadataRoute } from "next";
import { env } from "@/server/env";
import { LOCALES, LOCALE_TAGS, localePath } from "@/lib/i18n/config";

/**
 * The public surface, which is small on purpose: everything else in Bunchy is
 * behind a session, and a sitemap listing URLs that redirect to /login is a
 * sitemap full of soft 404s.
 *
 * Dynamic rather than generated at build time, see `robots.ts` for why.
 */
export const dynamic = "force-dynamic";

const PUBLIC_PATHS = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/signup", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/login", changeFrequency: "monthly" as const, priority: 0.5 },
  // Ahead of the policies: it is the page a cautious person is looking for.
  { path: "/safety", changeFrequency: "yearly" as const, priority: 0.4 },
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/moderators", changeFrequency: "monthly" as const, priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
  // Changes more often than the documents it tracks, which is the whole reason
  // it exists as a separate page.
  { path: "/changelog", changeFrequency: "monthly" as const, priority: 0.3 },
];

/**
 * Every public page, once per language, each one naming the other two.
 *
 * The `alternates` block is what turns three addresses into one page a crawler
 * understands: without it, /discover and /nl/discover look like two thin pages
 * competing with each other, and a Dutch search is as likely to be shown the
 * English one. `x-default` points at the unprefixed address, which is where
 * somebody with no stated language is sent anyway.
 *
 * This is the reason the language is in the address at all. A cookie could
 * carry the preference perfectly well and none of this would be expressible.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env().APP_URL;
  const lastModified = new Date();

  return PUBLIC_PATHS.flatMap(({ path, changeFrequency, priority }) => {
    const languages = Object.fromEntries([
      ...LOCALES.map((locale) => [
        LOCALE_TAGS[locale],
        new URL(localePath(locale, path), base).toString(),
      ]),
      ["x-default", new URL(path, base).toString()],
    ]);

    return LOCALES.map((locale) => ({
      url: new URL(localePath(locale, path), base).toString(),
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  });
}
