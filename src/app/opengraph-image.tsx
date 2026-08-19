import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { lockupSvg } from "@/server/modules/brand/assets";

/**
 * The image every shared link previews with.
 *
 * Dark, and fixed. A social card cannot follow the reader's theme, the
 * platform fetches one file and serves it to everybody, so this is a choice
 * rather than a mirror, and the dark one is the right choice: previews land in
 * feeds and chat apps that are overwhelmingly dark, where a cream card glows
 * like a lightbulb and reads as an advert. It is the same navy-and-plum the
 * product's own panels use, so someone who clicks arrives somewhere familiar.
 *
 * The artwork is the real lockup, generated from the geometry the site draws
 * with, embedded as a data URI. There is no second copy of the logo here to
 * fall out of date.
 *
 * Nothing on it is per-page or per-member, deliberately: an invite link that
 * previewed someone's name and photo would leak a member into whatever group
 * chat it landed in.
 */

export const alt = `${brand.name}, ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CORAL = "#FF5C6C";
const PURPLE = "#7657FF";
const MINT = "#55D6BE";
const YELLOW = "#FFC857";

export default function OpengraphImage() {
  const lockup = `data:image/svg+xml;base64,${Buffer.from(
    lockupSvg("colour", "white"),
    "utf8",
  ).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "sans-serif",
          background:
            "linear-gradient(150deg, #151d2f 0%, #1b1930 55%, #241b32 100%)",
        }}
      >
        {/* The same two glows the site's dark panels carry. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(680px 420px at 4% -5%, rgba(255,92,108,0.40), transparent 62%), radial-gradient(620px 400px at 104% 105%, rgba(118,87,255,0.46), transparent 62%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 68,
            width: 720,
          }}
        >
          <img src={lockup} alt="" height={62} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 88,
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: -2.5,
                lineHeight: 1.02,
                display: "flex",
              }}
            >
              {brand.tagline}
            </div>
            <div
              style={{
                fontSize: 32,
                color: "rgba(255,255,255,0.72)",
                marginTop: 22,
                maxWidth: 760,
                lineHeight: 1.35,
                display: "flex",
              }}
            >
              {brand.positioning}
            </div>
          </div>

          {/* The three refusals, as chips. Short enough to read in a feed. */}
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { label: "No feed", colour: CORAL },
              { label: "No followers", colour: PURPLE },
              { label: "Just people", colour: MINT },
            ].map((chip) => (
              <div
                key={chip.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 20px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.86)",
                  fontSize: 24,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    background: chip.colour,
                    display: "flex",
                  }}
                />
                {chip.label}
              </div>
            ))}
          </div>
        </div>

        {/*
          One suggestion, the way the product shows it. A preview that is only
          a logo and a slogan could be any company; a card with a name, a
          distance and a match reading says what this actually does in the two
          seconds a link gets in a feed. The person is invented and generic on
          purpose, a real member has no business appearing in a group chat
          they were never part of.
        */}
        <div
          style={{
            position: "absolute",
            right: 58,
            top: 150,
            display: "flex",
            flexDirection: "column",
            width: 400,
            padding: 30,
            borderRadius: 26,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.14)",
            transform: "rotate(-3deg)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 74,
                height: 74,
                borderRadius: 999,
                background: "rgba(255,92,108,0.22)",
                border: "1px solid rgba(255,92,108,0.45)",
                color: "#FF8391",
                fontSize: 30,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              S
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 28, fontWeight: 600, color: "#FFFFFF", display: "flex" }}>
                Sarah, 29
              </div>
              <div style={{ fontSize: 22, color: "rgba(255,255,255,0.55)", display: "flex" }}>
                Antwerp region
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            {["Gaming", "Hiking", "Films"].map((tag) => (
              <div
                key={tag}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 20,
                  display: "flex",
                }}
              >
                {tag}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 24,
              alignSelf: "flex-start",
              padding: "8px 18px",
              borderRadius: 999,
              background: "rgba(255,92,108,0.18)",
              color: "#FF8391",
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            Both free Thursday
          </div>
        </div>

        {/*
          Bottom-right of the canvas rather than inside the text column: sharing
          the column's last row with the chips left the domain jammed against
          "Just people" with nothing between them.
        */}
        <div
          style={{
            position: "absolute",
            right: 58,
            bottom: 62,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 26,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <div style={{ display: "flex" }}>
            {[CORAL, PURPLE, MINT, YELLOW].map((colour, i) => (
              <div
                key={colour}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: colour,
                  border: "3px solid #1b1930",
                  marginLeft: i === 0 ? 0 : -12,
                  display: "flex",
                }}
              />
            ))}
          </div>
          {brand.domain}
        </div>
      </div>
    ),
    size,
  );
}
