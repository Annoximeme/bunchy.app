"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/components/ui";

/**
 * Light, dark, or whatever the machine says.
 *
 * Three states rather than two, because "follow my system" is a real preference
 * and a two-way switch quietly overrides it forever the first time somebody
 * pokes it. The stored value is the choice, not the outcome: `system` is stored
 * as no value at all, which hands control back to the media query.
 *
 * The applied theme is an attribute on <html> rather than a class, so the CSS
 * can scope the media query around it — see the three-state block in
 * globals.css.
 */

type Theme = "light" | "dark" | "system";

const KEY = "bunchy-theme";

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    delete root.dataset.theme;
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Private mode, or storage disabled. The choice lasts this session.
    }
    return;
  }

  root.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // As above.
  }
}

const ORDER: Theme[] = ["system", "light", "dark"];

const LABEL: Record<Theme, string> = {
  system: "Match system",
  light: "Light",
  dark: "Dark",
};

/**
 * The DOM attribute is the source of truth, not React state.
 *
 * It is set before first paint by the inline script in the layout, so the
 * component has to read it rather than own it — and reading an external store
 * is what `useSyncExternalStore` exists for. The earlier version pulled it into
 * state inside an effect, which trips `react-hooks/set-state-in-effect` and
 * renders once with the wrong answer on the way past.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  // Another tab changing the preference should move this button too.
  window.addEventListener("storage", onChange);
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", onChange);
  };
}

function readTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return value === "dark" || value === "light" ? value : "system";
}

export function ThemeToggle({ className }: { className?: string }) {
  // On the server there is no attribute to read, and "system" is what the CSS
  // does in that case — so the first client render agrees with the HTML.
  const current = useSyncExternalStore<Theme>(
    subscribe,
    readTheme,
    () => "system",
  );
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!;

  return (
    <button
      type="button"
      onClick={() => apply(next)}
      // The label names what a press will do, not what is currently on: a
      // control whose accessible name is its state reads to a screen reader as
      // a claim rather than an action.
      aria-label={`Switch to: ${LABEL[next]}`}
      title={`Theme: ${LABEL[current]}, click for ${LABEL[next]}`}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink",
        className,
      )}
    >
      <Icon theme={current} />
    </button>
  );
}

function Icon({ theme }: { theme: Theme }) {
  const shared = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (theme === "dark") {
    return (
      <svg {...shared}>
        <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
      </svg>
    );
  }

  if (theme === "light") {
    return (
      <svg {...shared}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }

  // System: a screen, because that is what it defers to.
  return (
    <svg {...shared}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}
