import { PageShell } from "@/components/page-header";
import { SkeletonCard } from "@/components/ui";

/**
 * The shape of a page that has not arrived yet.
 *
 * One component with six shapes rather than fifty hand-written files. A
 * skeleton earns its place by reserving the space the real content will occupy,
 * which is the difference between a page settling and a page jumping; a
 * skeleton that looks nothing like what follows is just a different kind of
 * flash. Six shapes cover every route in the product, so each `loading.tsx` is
 * three lines and the shapes stay consistent because there is only one of each.
 *
 * `discover` is the only one belonging to a single page, and it is here rather
 * than in a bespoke `loading.tsx` for the reason the other five are: one file
 * that knows what a skeleton looks like. Discover earns its own shape because
 * it is the only two-pane layout in the product and the only one that opens on
 * a masthead, so the `grid` shape stood in for it by reserving a 36px title bar
 * where a 200px panel was about to land.
 *
 * ## What it deliberately does not do
 *
 * No spinner, no percentage, no "Loading..." in the middle of an empty page.
 * The product's argument is that it should be calm and should end, and a
 * loading state is the moment it is least able to be either. The shimmer is
 * three seconds and low contrast, slow enough that the eye does not track it.
 *
 * ## Accessibility
 *
 * The bars are `aria-hidden`: to a screen reader they are meaningless
 * rectangles, and announcing forty of them is worse than announcing nothing.
 * A single polite `role="status"` line says what is happening instead, which
 * is what a person using assistive technology actually needs to know.
 */

type Shape = "list" | "grid" | "detail" | "table" | "form" | "discover";

function Bar({ className }: { className: string }) {
  return (
    <div className={`skeleton ${className}`}>
      <div className="skeleton-shimmer" />
    </div>
  );
}

function Header() {
  return (
    <div className="mb-8 space-y-2.5" aria-hidden>
      <Bar className="h-9 w-52" />
      <Bar className="h-4 w-80 max-w-full" />
    </div>
  );
}

function Row() {
  return (
    <div
      className="flex items-center gap-4 rounded-squircle bg-surface p-5 shadow-pebble"
      aria-hidden
    >
      <Bar className="size-11 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Bar className="h-4 w-1/3" />
        <Bar className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/** The head of Discover: a tall panel with a greeting and a row of jump pills. */
function Masthead() {
  return (
    <div
      className="mb-6 rounded-squircle bg-surface p-6 shadow-pebble sm:p-8"
      aria-hidden
    >
      <Bar className="h-10 w-64 max-w-full" />
      <Bar className="mt-4 h-4 w-96 max-w-full" />
      <div className="mt-6 flex flex-wrap gap-2">
        {["w-24", "w-24", "w-28"].map((w, i) => (
          <Bar key={i} className={`h-8 ${w} rounded-full`} />
        ))}
      </div>
    </div>
  );
}

/** A rail card: a heading and a few rows under it. */
function Panel({ lines }: { lines: number }) {
  return (
    <div className="card-surface space-y-3 p-5" aria-hidden>
      <Bar className="h-4 w-24" />
      {Array.from({ length: lines }, (_, i) => (
        <Bar key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function PageSkeleton({
  shape = "list",
  /** What is being fetched, said once, politely. */
  label = "Loading",
  /**
   * Skip `PageShell`.
   *
   * The admin and onboarding layouts already centre and pad their own main
   * element, so wrapping again halves the width and doubles the padding, and
   * the skeleton ends up a different size from the page it is standing in for.
   * Which is the one job a skeleton has.
   */
  bare = false,
}: {
  shape?: Shape;
  label?: string;
  bare?: boolean;
}) {
  /*
    Discover is the one page on the broad width, and a skeleton drawn 192px
    narrower than the page replacing it is a skeleton that causes the jump it
    exists to prevent.
  */
  const body = (
    <>
      {shape === "discover" ? <Masthead /> : <Header />}

      {/*
        `polite`, never `assertive`. This interrupts nothing: the page is
        already blank, so there is no urgency to convey and nothing to talk
        over.
      */}
      <p className="sr-only" role="status" aria-live="polite">
        {label}
      </p>

      {shape === "grid" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {shape === "list" && (
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Row key={i} />
          ))}
        </div>
      )}

      {shape === "detail" && (
        <div
          className="rounded-squircle bg-surface p-8 shadow-pebble"
          aria-hidden
        >
          <div className="flex items-center gap-5">
            <Bar className="size-20 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <Bar className="h-6 w-44" />
              <Bar className="h-4 w-32" />
            </div>
          </div>
          <div className="mt-8 space-y-3">
            <Bar className="h-3 w-full" />
            <Bar className="h-3 w-11/12" />
            <Bar className="h-3 w-3/4" />
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {["w-20", "w-24", "w-16", "w-28"].map((w) => (
              <Bar key={w} className={`h-7 ${w} rounded-full`} />
            ))}
          </div>
        </div>
      )}

      {shape === "table" && (
        <div
          className="overflow-hidden rounded-squircle bg-surface shadow-pebble"
          aria-hidden
        >
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-line p-4 last:border-b-0"
            >
              <Bar className="h-4 w-1/4" />
              <Bar className="h-4 w-1/3" />
              <Bar className="ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      )}

      {shape === "form" && (
        <div
          className="mx-auto max-w-xl rounded-squircle bg-surface p-8 shadow-pebble"
          aria-hidden
        >
          <div className="space-y-6">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Bar className="h-3.5 w-28" />
                <Bar className="h-11 w-full" />
              </div>
            ))}
            <Bar className="h-11 w-36 rounded-full" />
          </div>
        </div>
      )}

      {shape === "discover" && (
        <div
          className="flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start"
          aria-hidden
        >
          <div className="space-y-5 xl:col-start-2 xl:row-start-1">
            <Panel lines={3} />
            <Panel lines={2} />
          </div>
          <div className="@container min-w-0 xl:col-start-1 xl:row-start-1">
            <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (bare) return <div>{body}</div>;
  return (
    <PageShell width={shape === "discover" ? "broad" : "wide"}>{body}</PageShell>
  );
}
