import type { Metadata } from "next";
import { requireStaff } from "@/server/modules/admin/guard";
import { AdminHeader, Panel } from "@/components/admin/primitives";
import { BunchyLogo, BunchyMark } from "@/components/logo";
import { brand } from "@/lib/brand";
import { BRAND_ASSETS, BRAND_PALETTE } from "@/server/modules/brand/assets";

export const metadata: Metadata = { title: "Brand" };
export const dynamic = "force-dynamic";

/**
 * The brand kit.
 *
 * Everything downloadable here is generated from the same geometry the site
 * renders, so a logo change ships to this page in the same deploy rather than
 * leaving somebody advertising with last year's mark. The rules are short on
 * purpose: a brand guide nobody finishes reading protects nothing.
 */
export default async function AdminBrandPage() {
  await requireStaff();

  return (
    <>
      <AdminHeader
        title="Brand"
        subtitle={`Logos, colours and the few rules that matter. Everything here is generated from the code that draws ${brand.name}, so it cannot drift out of date.`}
      />

      <div className="space-y-6">
        <Panel title="The logo">
          <div className="flex flex-wrap items-center gap-10">
            <div className="rounded-[var(--radius-control)] bg-canvas px-6 py-5">
              <BunchyLogo height={30} />
            </div>
            <div className="rounded-[var(--radius-control)] bg-ink px-6 py-5">
              <BunchyLogo height={30} color="#FFFFFF" monochrome="#FFFFFF" />
            </div>
            <div className="rounded-[var(--radius-control)] bg-canvas px-6 py-5">
              <BunchyMark size={40} />
            </div>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {BRAND_ASSETS.map((asset) => (
              <li
                key={asset.slug}
                className="flex items-start justify-between gap-4 rounded-[var(--radius-control)] border border-line p-3.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{asset.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{asset.use}</p>
                </div>
                <a
                  href={`/api/admin/brand/${asset.slug}`}
                  className="shrink-0 rounded-[var(--radius-control)] border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-surface-sunken"
                >
                  SVG
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs text-muted">
            SVG only, deliberately: it is what a printer, a poster and a favicon
            all want, and shipping a 512px PNG guarantees somebody scales it up
            for a banner.
          </p>
        </Panel>

        <Panel title="Colours">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BRAND_PALETTE.map((colour) => (
              <li
                key={colour.hex}
                className="flex items-start gap-3 rounded-[var(--radius-control)] border border-line p-3"
              >
                <span
                  aria-hidden
                  className="mt-0.5 size-9 shrink-0 rounded-full ring-1 ring-line"
                  style={{ background: colour.hex }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {colour.name}{" "}
                    <span className="font-mono text-xs text-muted">
                      {colour.hex}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{colour.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Using it">
          <div className="space-y-4 text-sm text-ink-soft">
            <div>
              <p className="font-medium text-ink">Give it room.</p>
              <p className="mt-1">
                Clear space on every side is the height of the mark&rsquo;s
                largest shape. Nothing sits inside that — not a tagline, not a
                partner logo, not the edge of the page.
              </p>
            </div>
            <div>
              <p className="font-medium text-ink">Never redraw it.</p>
              <p className="mt-1">
                Do not restretch, recolour, outline, add a shadow, rotate, or set
                the name in a different typeface. The wordmark is drawn as
                strokes precisely so it cannot be re-set wrong on a machine
                missing a font.
              </p>
            </div>
            <div>
              <p className="font-medium text-ink">Knockout on dark only.</p>
              <p className="mt-1">
                The white lockup is for photographs and dark panels. On a light
                background use full colour, or ink where colour cannot be
                trusted.
              </p>
            </div>
            <div>
              <p className="font-medium text-ink">Small means the mark.</p>
              <p className="mt-1">
                Below about 20px of height the wordmark stops being legible. Use
                the mark alone — it was drawn to still read as{" "}
                <em>several shapes</em> at favicon size.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Advertising Bunchy">
          <div className="space-y-4 text-sm text-ink-soft">
            <p>
              The social preview every shared link already carries is at{" "}
              <a
                href="/opengraph-image"
                className="text-accent-ink hover:underline"
              >
                /opengraph-image
              </a>{" "}
              — 1200×630, the size Meta, LinkedIn, Slack and iMessage all want.
              Right-click to save it for anywhere that needs a ready-made card.
            </p>
            <div>
              <p className="font-medium text-ink">The lines that are approved.</p>
              <p className="mt-1">
                Tagline: <strong>{brand.tagline}</strong> · Positioning:{" "}
                <strong>{brand.positioning}</strong>
              </p>
              <p className="mt-1">
                Alternates, for when a headline needs a different rhythm:{" "}
                {brand.altTaglines.join(" · ")}
              </p>
              <p className="mt-1">
                These live in <code>src/lib/brand.ts</code>. Inventing a new one
                in a campaign is how a product ends up with five taglines and no
                slogan.
              </p>
            </div>
            <div>
              <p className="font-medium text-ink">What not to claim.</p>
              <p className="mt-1">
                No member counts, no testimonials from accounts that are not
                real, and nothing implying we verify identities — we cannot, and{" "}
                <a href="/safety" className="text-accent-ink hover:underline">
                  /safety
                </a>{" "}
                says so in writing. An advert that contradicts the safety page is
                worse than no advert.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
