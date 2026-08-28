import type { Metadata } from "next";
import { requireStaff } from "@/server/modules/admin/guard";
import { AdminHeader, Panel } from "@/components/admin/primitives";
import { BunchyLogo, BunchyMark } from "@/components/logo";
import { cn } from "@/components/ui";
import { brand } from "@/lib/brand";
import {
  BRAND_ASSETS,
  BRAND_PALETTE,
  type BrandAsset,
} from "@/server/modules/brand/assets";
import { EMAIL_PREVIEWS } from "@/server/email/previews";

export const metadata: Metadata = { title: "Brand" };
export const dynamic = "force-dynamic";

/**
 * The brand kit.
 *
 * Everything downloadable is generated from the geometry the site renders with,
 * so a logo change ships here in the same deploy rather than leaving somebody
 * advertising with last year's mark.
 *
 * Note on layout: `Panel` puts padding on its header and none on its children,
 * every other admin page either passes `className="p-5"` or fills it with a
 * DataTable that brings its own. An earlier version of this page did neither,
 * which is why it rendered flush against the panel edges.
 */
export default async function AdminBrandPage() {
  await requireStaff();

  const uploads = BRAND_ASSETS.filter((a) => a.format === "png");
  const vectors = BRAND_ASSETS.filter((a) => a.format === "svg");

  return (
    <>
      <AdminHeader
        title="Brand"
        subtitle="Logos, colours and the few rules that matter. Generated from the code that draws Bunchy, so none of it can go stale."
      />

      <div className="space-y-6">
        <Panel title="The logo" note="light, dark and the mark alone">
          {/*
            Fixed swatch colours, not tokens. These panels demonstrate the logo
            *on light* and *on dark*, so they have to stay light and dark. With
            `bg-canvas`/`bg-ink` the pair swapped in dark mode and the knockout
            logo was rendered white on a near-white panel, i.e. invisible, on the
            one page whose job is showing people what the logo looks like.
          */}
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <div
              className="flex items-center justify-center rounded-[var(--radius-control)] px-4 py-8 ring-1 ring-black/10"
              style={{ background: "#FFF9F3" }}
            >
              <BunchyLogo height={28} color="#271F16" />
            </div>
            <div
              className="flex items-center justify-center rounded-[var(--radius-control)] px-4 py-8 ring-1 ring-white/10"
              style={{ background: "#14110F" }}
            >
              <BunchyLogo height={28} color="#FFFFFF" monochrome="#FFFFFF" />
            </div>
            <div
              className="flex items-center justify-center rounded-[var(--radius-control)] px-4 py-8 ring-1 ring-black/10"
              style={{ background: "#FFF9F3" }}
            >
              <BunchyMark size={44} />
            </div>
          </div>
        </Panel>

        <Panel
          title="Ready to upload"
          note="PNG. What social platforms actually accept"
        >
          <div className="p-5">
            <p className="mb-4 text-sm text-muted">
              Facebook, Instagram, LinkedIn and X all reject an SVG upload, so
              these are the files to reach for when you are setting up an account
              or running an ad.
            </p>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {uploads.map((asset) => (
                <li
                  key={asset.slug}
                  className="flex flex-col rounded-[var(--radius-control)] border border-line p-3"
                >
                  <Preview asset={asset} className="h-28 border-0" />
                  <div className="mt-3 flex flex-1 flex-col">
                    <p className="text-sm font-medium">{asset.label}</p>
                    <p className="mt-0.5 flex-1 text-xs leading-relaxed text-muted">
                      {asset.use}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="font-mono text-[11px] text-muted">
                        {asset.width}×{asset.height}
                        {asset.background ? "" : " · transparent"}
                      </span>
                      <a
                        href={`/api/admin/brand/${asset.slug}`}
                        className="rounded-[var(--radius-control)] bg-accent px-3 py-1.5 text-xs font-semibold text-[var(--color-on-accent)] transition-colors hover:bg-accent-hover"
                      >
                        Download PNG
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="Vectors" note="print, and rebuilding an asset">
          <div className="p-5">
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {vectors.map((asset) => (
                <li
                  key={asset.slug}
                  className="flex items-center gap-3 rounded-[var(--radius-control)] border border-line px-3 py-2.5"
                >
                  <Preview asset={asset} className="size-12 shrink-0 p-1.5" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{asset.label}</p>
                    <p className="truncate text-xs text-muted">{asset.use}</p>
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
          </div>
        </Panel>

        <Panel title="Colours">
          <ul className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
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
                  <p className="text-sm font-medium">{colour.name}</p>
                  <p className="font-mono text-xs text-muted">{colour.hex}</p>
                  <p className="mt-1 text-xs text-muted">{colour.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Using it">
            <dl className="divide-y divide-line">
              {[
                [
                  "Give it room",
                  "Clear space on every side is the height of the mark's largest shape. Nothing sits inside that, not a tagline, not a partner logo, not the edge of the page.",
                ],
                [
                  "Never redraw it",
                  "No restretching, recolouring, outlining, shadows or rotation, and never set the name in another typeface. The wordmark is drawn as strokes so it cannot be re-set wrong.",
                ],
                [
                  "Knockout on dark only",
                  "White artwork is for photographs and dark panels. On light use full colour, or ink where colour cannot be trusted.",
                ],
                [
                  "Small means the mark",
                  "Below about 20px of height the wordmark stops being legible. Use the mark alone. It was drawn to still read as several shapes at favicon size.",
                ],
              ].map(([title, body]) => (
                <div key={title} className="px-5 py-3.5">
                  <dt className="text-sm font-medium">{title}</dt>
                  <dd className="mt-1 text-xs leading-relaxed text-muted">
                    {body}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Advertising Bunchy">
            <div className="space-y-4 p-5 text-sm text-ink-soft">
              <div>
                <p className="font-medium text-ink">Ready-made social card</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  The image every shared link already previews with is at{" "}
                  <a
                    href="/opengraph-image"
                    className="text-accent-ink underline underline-offset-2"
                  >
                    /opengraph-image
                  </a>{" "}
, 1200×630, the size Meta, LinkedIn, Slack and iMessage all
                  want.
                </p>
              </div>
              <div>
                <p className="font-medium text-ink">Approved lines</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Tagline: <strong>{brand.tagline}</strong>
                  <br />
                  Positioning: <strong>{brand.positioning}</strong>
                  <br />
                  Alternates: {brand.altTaglines.join(" · ")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  They live in <code>src/lib/brand.ts</code>. Inventing a new one
                  per campaign is how a product ends up with five taglines and no
                  slogan.
                </p>
              </div>
              <div>
                <p className="font-medium text-ink">What not to claim</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  No member counts, no testimonials from accounts that are not
                  real, and nothing implying we verify identities. We do not,
                  and{" "}
                  <a href="/safety" className="text-accent-ink underline underline-offset-2">
                    /safety
                  </a>{" "}
                  says so in writing. An advert that contradicts the safety page
                  is worse than no advert.
                </p>
              </div>
            </div>
          </Panel>

          {/*
            The brand as it arrives in an inbox, which is the one surface
            nobody ever looks at until a member forwards a screenshot of it.
            Rendered by the real templates, so what opens here is byte for byte
            what gets sent.
          */}
          <Panel
            title="Email"
            note="every message Bunchy sends, as it will arrive"
          >
            <ul className="divide-y divide-line">
              {EMAIL_PREVIEWS.map((preview) => (
                <li
                  key={preview.slug}
                  className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{preview.label}</p>
                    <p className="mt-0.5 text-sm text-muted">{preview.when}</p>
                    <p className="mt-1 truncate text-sm text-muted">
                      Subject: <span className="font-medium">{preview.message.subject}</span>
                    </p>
                  </div>
                  {/*
                    A new tab, not a link in place. An email is a whole
                    document with its own background, and this app sends
                    X-Frame-Options: DENY, so an iframe is not on offer either.
                  */}
                  <a
                    href={`/admin/brand/email/${preview.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 self-start rounded-[var(--radius-control)] border border-line px-3 py-1.5 text-sm font-medium hover:bg-raised sm:self-auto"
                  >
                    Preview
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

/**
 * A preview of exactly what the file contains.
 *
 * Drawn from the asset's own vector as a data URI rather than by fetching the
 * PNG: identical artwork, no extra request per row, and it renders under the
 * CSP because `img-src` already allows `data:`.
 *
 * Transparent assets get a checkerboard in two mid-greys, light enough that the
 * ink artwork reads, dark enough that the white knockout does too, which a plain
 * white or plain dark backdrop would each fail at for half the set.
 */
function Preview({
  asset,
  className,
}: {
  asset: BrandAsset;
  className?: string;
}) {
  const src = `data:image/svg+xml;base64,${Buffer.from(asset.svg(), "utf8").toString("base64")}`;

  const transparent = {
    backgroundImage:
      "linear-gradient(45deg, #d8d2c8 25%, transparent 25%), linear-gradient(-45deg, #d8d2c8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d8d2c8 75%), linear-gradient(-45deg, transparent 75%, #d8d2c8 75%)",
    backgroundSize: "14px 14px",
    backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0px",
    backgroundColor: "#efeae2",
  } as const;

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-[var(--radius-control)] border border-line p-4",
        className,
      )}
      style={asset.background ? { background: asset.background } : transparent}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${asset.label} preview`}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}
