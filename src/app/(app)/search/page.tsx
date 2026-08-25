import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/server/auth/current-user";
import { search, type SearchResult } from "@/server/modules/search/service";
import { PageHeader, PageShell } from "@/components/page-header";
import { EmptyState, SectionHeading } from "@/components/ui";
import { SearchBox } from "@/components/search-box";
import { dayLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

/**
 * Everything this member already has, in one place.
 *
 * The query lives in the URL rather than in component state, which is the same
 * decision the bunch search made and for the same reasons: a search is
 * shareable, the back button works, and the filtering happens on the server
 * that is already good at it.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const viewer = await requireViewer();
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = await search(viewer.profileId, query);

  return (
    <PageShell>
      <PageHeader
        title="Search"
        subtitle="People you know, bunches you're in, plans you've made, things that were said."
      />

      <SearchBox initialQuery={query} />

      {query.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="What are you looking for?"
            description="A name, a place, half a sentence somebody wrote. This searches your own connections, bunches, activities and messages, and the bunches anybody can join."
          />
        </div>
      ) : query.length < 2 ? (
        <p className="mt-10 text-sm text-muted">
          One letter matches almost everything. Try a little more.
        </p>
      ) : results.total === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={`Nothing for “${query}”`}
            description="Nothing in your bunches, plans, people or messages matches that. Spelling and a shorter word are the two things worth trying."
          />
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          <Group title="People" results={results.people} />
          <Group title="Bunches" results={results.bunches} />
          <Group title="Activities" results={results.activities} />
          <Group title="Messages" results={results.messages} />
        </div>
      )}
    </PageShell>
  );
}

function Group({ title, results }: { title: string; results: SearchResult[] }) {
  if (results.length === 0) return null;

  return (
    <section>
      <SectionHeading title={title} />
      <ul className="mt-3 space-y-1">
        {results.map((result) => (
          <li key={`${result.kind}-${result.id}`}>
            <Link
              href={result.href}
              className="block rounded-[var(--radius-control)] px-3 py-2.5 transition-colors hover:bg-surface-sunken"
            >
              <span className="block truncate font-medium text-ink">
                {result.title}
              </span>
              <span className="mt-0.5 block truncate text-sm text-muted">
                {result.subtitle}
                {result.at && `, ${dayLabel(result.at)}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
