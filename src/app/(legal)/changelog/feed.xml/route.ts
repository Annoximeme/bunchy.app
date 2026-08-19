import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { env } from "@/server/env";
import { listPublicAnnouncements } from "@/server/modules/announcements/service";
import { blocksToText } from "@/server/modules/announcements/blocks";

export const dynamic = "force-dynamic";

/**
 * The changelog as a feed.
 *
 * ## Why a feed at all
 *
 * Because the promise is that members are told before a change takes effect,
 * and the honest version of that promise lets somebody verify it without
 * trusting us to send them anything. A reader who subscribes here finds out
 * about a change to the terms whether or not our mail reaches their inbox,
 * whether or not they still have an account, and whether or not we remembered.
 * That is a stronger commitment than an email list, and it costs one route.
 *
 * It is also the format the audience actually uses: the people who watch a
 * small product's policy history are journalists, regulators and the sort of
 * careful person /about is written for, and all three read feeds.
 *
 * ## Atom rather than RSS
 *
 * Atom requires a date on every entry and defines exactly one meaning for it.
 * RSS has `pubDate` as optional with several conventions, and the date is the
 * entire point of this document.
 */

/**
 * The five characters XML cannot carry raw.
 *
 * Hand-rolled rather than pulled from a dependency, and applied to every single
 * interpolation below without exception. An announcement body is written by an
 * admin, but "written by an admin" is not a safety property: an apostrophe in
 * "we've" produces invalid XML in an attribute, and one unescaped ampersand in
 * a title breaks the whole document for every subscriber at once.
 */
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const announcements = await listPublicAnnouncements(50);
  const base = env().APP_URL.replace(/\/$/, "");
  const self = `${base}/changelog/feed.xml`;

  // The feed's own timestamp is the newest entry's, not the moment of the
  // request. A feed whose `updated` moves every time it is polled tells every
  // reader it has changed when it has not.
  const updated = (announcements[0]?.publishedAt ?? new Date()).toISOString();

  const entries = announcements.map((item) => {
    const url = `${base}/changelog#${item.slug}`;
    const effective = item.effectiveAt
      ? `Takes effect ${item.effectiveAt.toISOString().slice(0, 10)}.`
      : null;
    const content = [item.summary, effective, blocksToText(item.body)]
      .filter(Boolean)
      .join("\n\n");

    return [
      "  <entry>",
      `    <title>${xml(item.title)}</title>`,
      // A tag URI rather than the URL. An entry's identity has to survive the
      // page it is rendered on moving, and a reader that keys on the link marks
      // everything unread the day a path changes.
      `    <id>tag:${xml(brand.domain)},2026:announcement/${xml(item.slug)}</id>`,
      `    <link rel="alternate" type="text/html" href="${xml(url)}"/>`,
      `    <updated>${item.publishedAt.toISOString()}</updated>`,
      `    <published>${item.publishedAt.toISOString()}</published>`,
      `    <category term="${xml(item.tier.toLowerCase())}"/>`,
      `    <summary type="text">${xml(item.summary)}</summary>`,
      // Plain text, not HTML. The blocks are never rendered to markup anywhere
      // in this product, and a feed is the last place to make an exception:
      // readers render entry content with wildly varying strictness.
      `    <content type="text">${xml(content)}</content>`,
      "  </entry>",
    ].join("\n");
  });

  const body = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <title>${xml(brand.name)} changelog</title>`,
    `  <subtitle>Every change ${xml(brand.name)} has announced, and when it took effect.</subtitle>`,
    `  <id>${xml(`${base}/changelog`)}</id>`,
    `  <link rel="self" type="application/atom+xml" href="${xml(self)}"/>`,
    `  <link rel="alternate" type="text/html" href="${xml(`${base}/changelog`)}"/>`,
    `  <updated>${updated}</updated>`,
    "  <author>",
    `    <name>${xml(LEGAL.operator)}</name>`,
    "  </author>",
    ...entries,
    "</feed>",
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "application/atom+xml; charset=utf-8",
      // Long enough that a few hundred readers polling hourly cost one render,
      // short enough that a notice published now is in every reader's client
      // within the hour. `stale-while-revalidate` means the slow path is never
      // in front of a person.
      "cache-control": "public, max-age=1800, stale-while-revalidate=3600",
    },
  });
}
