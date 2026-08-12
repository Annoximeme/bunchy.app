import { PageShell } from "@/components/page-header";
import { SkeletonCard } from "@/components/ui";

export default function DiscoverLoading() {
  return (
    <PageShell>
      <div className="mb-8 space-y-2" aria-hidden>
        <div className="skeleton h-9 w-52">
          <div className="skeleton-shimmer" />
        </div>
        <div className="skeleton h-4 w-80">
          <div className="skeleton-shimmer" />
        </div>
      </div>

      <p className="sr-only" role="status">
        Finding people for you
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </PageShell>
  );
}
