import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * Component test bootstrap.
 *
 * `next/navigation` is stubbed because these components are rendered outside a
 * Next request: `useRouter` and `useSearchParams` throw without one, and the
 * point of the test is the component's own behaviour, not the framework's.
 */
/**
 * `next/font` runs at module scope and needs the Next build pipeline to have
 * downloaded and subset the font. In a test there is no pipeline, so importing
 * any component that sets type, the policy pages do, throws before a single
 * assertion runs. The class name is the only thing components read off it.
 */
vi.mock("next/font/google", () => {
  const font = () => ({ className: "font-test", style: { fontFamily: "test" } });
  // Named exports, one per family the app sets. Vitest resolves each import by
  // name against this object rather than through a proxy, so they are listed.
  return {
    Plus_Jakarta_Sans: font,
    Instrument_Serif: font,
    Inter: font,
  };
});

/**
 * `next/image` is given its dimensions and blur placeholder by the Next build,
 * which turns a static import into an object. Vitest hands the component a
 * plain string instead, and it refuses to render without a width. The pages
 * under test care that an image is there, not how it was optimised.
 */
vi.mock("next/image", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ src, alt, ...rest }: Record<string, unknown>) => {
      const source =
        typeof src === "string" ? src : String((src as { src?: string })?.src ?? "");
      return createElement("img", { src: source, alt, ...rest });
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
