import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/server/auth/current-user";
import { isAdmin, isStaff } from "@/server/modules/admin/guard";
import { countReportsByStatus } from "@/server/modules/admin/reports";
import { AdminNav } from "@/components/admin/nav";

export const dynamic = "force-dynamic";

/**
 * The staff shell.
 *
 * Non-staff get `notFound()` rather than a redirect or a 403: the admin area
 * should be indistinguishable from a URL that does not exist. Note that this
 * layout is a convenience, not the security boundary: every page and every
 * service below it re-checks, so a route added without a guard still fails
 * closed.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();
  if (!isStaff(viewer)) notFound();

  const reportCounts = await countReportsByStatus();
  const openReports = (reportCounts.OPEN ?? 0) + (reportCounts.REVIEWING ?? 0);

  return (
    <div className="min-h-dvh bg-surface-sunken">
      {/* A permanent, unmistakable marker that these actions affect real people.
          A <header> rather than a <div> so it sits inside a landmark, content
          outside one is content a screen-reader user has no way to jump to. */}
      <header className="bg-ink px-5 py-1.5 text-center text-xs font-medium text-canvas">
        Staff area · signed in as {viewer!.displayName} ({viewer!.role.toLowerCase()})
        <Link href="/discover" className="ml-3 underline underline-offset-2">
          Back to Bunchy
        </Link>
      </header>

      {/*
        Nav beside the content rather than above it. Sixteen destinations do
        not fit across a page, and the previous horizontal bar solved that by
        scrolling, which hid five of them at most widths. A column has room for
        headings, and headings are what make sixteen items findable.
      */}
      <div className="mx-auto flex w-full max-w-[80rem] flex-col md:flex-row">
        <AdminNav openReports={openReports} canManageAccounts={isAdmin(viewer)} />

        <main id="main" className="min-w-0 flex-1 px-5 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
