import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/server/auth/current-user";
import { PageHeader, PageShell } from "@/components/page-header";
import { StartBunch } from "@/components/start-bunch";

export const metadata: Metadata = { title: "Start a bunch" };

/**
 * The composer.
 *
 * Deliberately separate from `/bunches/new`, which is the long form for someone
 * who already knows exactly what they are building. This is for the far more
 * common case: a person with an evening free and a vague idea, who should not
 * have to fill in a name, a description, a category and a member limit before
 * finding out whether anyone else wants to do it.
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireViewer();
  const { q } = await searchParams;

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Start a bunch"
          subtitle="Say what you'd like to do. We'll find people who might be up for it."
        />
        <StartBunch initialQuery={q?.slice(0, 280) ?? ""} />

        <p className="mt-8 text-sm text-muted">
          Know exactly what you want to build?{" "}
          <Link href="/bunches/new" className="font-medium text-accent-ink underline underline-offset-2">
            Use the full form
          </Link>
          .
        </p>
      </div>
    </PageShell>
  );
}
