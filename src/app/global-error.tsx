"use client";

import { useEffect } from "react";

/**
 * The boundary underneath everything else.
 *
 * `error.tsx` files are rendered *inside* the layout they sit under, so none of
 * them can catch a failure in the root layout itself. That case fell through to
 * Next's built-in screen, which in production is an unstyled "Application error:
 * a client-side exception has occurred" on a white page. For a product whose
 * whole argument is that a person made it by hand, that is the worst possible
 * thing to be looking at.
 *
 * This replaces the document, so it has to supply its own `html` and `body`.
 *
 * Everything is inline. That is not a style choice: the reason this component
 * is on screen at all is that the root layout did not render, and the root
 * layout is what loads the stylesheet. A version of this page written in
 * Tailwind classes would be correct in development, where the dev server serves
 * CSS regardless, and unstyled in production, which is the only place it
 * matters. The theme comes from a `prefers-color-scheme` block rather than the
 * app's tokens for the same reason, and inline styles are permitted by the
 * CSP, which only refuses inline *scripts*.
 *
 * The colours are the app's own: cream and deep navy in light, the warm
 * espresso ground in dark, so even this page looks like it belongs to Bunchy.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.25rem",
          background: "#fff9f3",
          color: "#172033",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            body { background: #181614 !important; color: #e8e4df !important; }
            .bunchy-card { background: #24211e !important; border-color: #35302b !important; }
            .bunchy-soft { color: #c8c1b8 !important; }
            .bunchy-quiet { color: #9a9289 !important; }
          }
          .bunchy-retry:focus-visible, .bunchy-home:focus-visible {
            outline: 2px solid #ff5c6c;
            outline-offset: 2px;
          }
        `}</style>

        <div
          className="bunchy-card"
          style={{
            maxWidth: "28rem",
            width: "100%",
            background: "#ffffff",
            border: "1px solid #efe6da",
            borderRadius: "1.25rem",
            padding: "2rem",
            textAlign: "center",
            boxShadow: "0 8px 30px rgba(28, 25, 23, 0.04)",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Bunchy didn&rsquo;t load
          </h1>
          <p
            className="bunchy-soft"
            style={{ margin: "0.5rem 0 0", color: "#3d4759", lineHeight: 1.6 }}
          >
            Something broke badly enough that the page could not be drawn.
            Nothing you did caused it, and nothing was lost. Reloading usually
            fixes it.
          </p>

          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              className="bunchy-retry"
              onClick={reset}
              style={{
                appearance: "none",
                border: "none",
                cursor: "pointer",
                borderRadius: "9999px",
                padding: "0.7rem 1.4rem",
                fontSize: "1rem",
                fontWeight: 700,
                // Deep navy on coral, never white: white on this coral is
                // 3.00:1 and fails AA, which is the whole reason the palette
                // carries an `on-accent` token.
                background: "#ff5c6c",
                color: "#172033",
                fontFamily: "inherit",
              }}
            >
              Reload
            </button>
            {/*
              A plain anchor, not `next/link`, and the rule is disabled rather
              than obeyed. `Link` performs a client-side transition, which would
              try to render the same root layout that just failed, inside the
              same broken React tree, and land the member back on this page. A
              real document request is the only thing that can recover from a
              root layout error, which is the one situation this file exists
              for.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="bunchy-home"
              style={{
                borderRadius: "9999px",
                padding: "0.7rem 1.4rem",
                fontSize: "1rem",
                fontWeight: 600,
                border: "1px solid #efe6da",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              Start again
            </a>
          </div>

          {error.digest && (
            <p
              className="bunchy-quiet"
              style={{
                margin: "1.5rem 0 0",
                fontSize: "0.75rem",
                color: "#646977",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              Reference {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
