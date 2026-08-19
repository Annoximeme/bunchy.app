import type { MetadataRoute } from "next";
import { env } from "@/server/env";

/**
 * Crawl rules.
 *
 * Everything a signed-out crawler can actually reach is public and worth
 * indexing. The disallowed paths are not secrets, they redirect to /login or
 * 404 for a stranger, but letting a crawler queue thousands of member and
 * bunch URLs it will only ever be bounced from wastes its budget and ours.
 */
/**
 * Rendered per request rather than at build time. `next build` runs on a
 * machine with no APP_URL, the validator falls back to localhost, so a
 * statically generated sitemap link would ship pointing at http://localhost:3000.
 */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything behind a session. All of it already redirects a signed-out
      // crawler to /login, so this changes no access, it stops a crawler
      // queueing thousands of URLs it will only be bounced from, and makes the
      // claim on /safety ("search engines see the marketing pages and nothing
      // else") true by declaration as well as by enforcement.
      disallow: [
        "/api/",
        "/admin",
        "/onboarding",
        "/discover",
        "/bunches",
        "/activities",
        "/connections",
        "/messages",
        "/notifications",
        "/profile",
        "/radar",
        "/assistant",
        "/start",
        "/u/",
      ],
    },
    sitemap: new URL("/sitemap.xml", env().APP_URL).toString(),
  };
}
