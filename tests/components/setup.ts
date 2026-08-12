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
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
