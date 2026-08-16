import type { MetadataRoute } from "next";
import { env } from "@/server/env";

/**
 * The public surface, which is small on purpose: everything else in Bunchy is
 * behind a session, and a sitemap listing URLs that redirect to /login is a
 * sitemap full of soft 404s.
 *
 * Dynamic rather than generated at build time — see `robots.ts` for why.
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
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env().APP_URL;
  const lastModified = new Date();

  return PUBLIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, base).toString(),
    lastModified,
    changeFrequency,
    priority,
  }));
}
