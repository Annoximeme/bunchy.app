import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

/**
 * The image every shared link previews with.
 *
 * Bunchy spreads by personal invitation — someone pastes a link into a group
 * chat. Without this, that paste renders as two lines of grey text, which reads
 * like a link to a form rather than an invitation to meet people.
 *
 * Drawn rather than exported from a design tool: the palette is the same set of
 * tokens the site uses, so a brand colour change here is a one-line edit
 * instead of a round trip through Figma and a binary asset in git.
 *
 * Generated once at build time. It carries no per-page or per-member detail,
 * deliberately: an invite link that previewed someone's name and photo would
 * leak a member into whatever group chat it landed in.
 */

export const alt = `${brand.name} — ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Straight from globals.css. Not imported, because this runs in a rendering
// context with no stylesheet — keep the two in step by hand, they change rarely.
const CANVAS = "#fff9f3";
const INK = "#172033";
const INK_SOFT = "#3d4759";
const ACCENT = "#ff5c6c";
const PURPLE = "#7657ff";
const MINT = "#55d6be";
const YELLOW = "#ffc857";
const LINE = "#efe6da";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CANVAS,
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        {/* The bunch: overlapping circles, which is the logo's whole idea —
            separate people, close enough to overlap, none of them centred. */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {[ACCENT, PURPLE, MINT, YELLOW].map((colour, i) => (
            <div
              key={colour}
              style={{
                width: 76,
                height: 76,
                borderRadius: 999,
                background: colour,
                border: `6px solid ${CANVAS}`,
                marginLeft: i === 0 ? 0 : -26,
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 700,
              color: INK,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            {brand.tagline}
          </div>
          <div
            style={{
              fontSize: 34,
              color: INK_SOFT,
              marginTop: 24,
              maxWidth: 900,
              lineHeight: 1.35,
            }}
          >
            {brand.positioning}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `2px solid ${LINE}`,
            paddingTop: 32,
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 700, color: INK }}>
            {brand.name}
          </div>
          <div style={{ fontSize: 28, color: INK_SOFT }}>{brand.domain}</div>
        </div>
      </div>
    ),
    size,
  );
}
