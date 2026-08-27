import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider, Link, useTranslate } from "@/components/link";
import { LanguageSwitcher } from "@/components/language-switcher";

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("next/navigation");
  return {
    ...actual,
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams("q=board+games"),
    usePathname: () => "/nl/search",
  };
});

/**
 * The two things that have to hold on every page in every language.
 *
 * A link keeps the language it was followed in, or the reader is bounced back
 * to English by the first thing they click. And the switcher offers the page
 * they are on in the other two, rather than sending them to the front page,
 * which is the failure that makes people stop using a switcher at all.
 */
describe("links in a language", () => {
  it("prefixes an internal path with the language being read", () => {
    render(
      <LanguageProvider locale="fr">
        <Link href="/discover">Discover</Link>
      </LanguageProvider>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/fr/discover");
  });

  it("leaves English unprefixed, so no page has two addresses", () => {
    render(
      <LanguageProvider locale="en">
        <Link href="/discover">Discover</Link>
      </LanguageProvider>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/discover");
  });

  it("does not touch a link that leaves the app", () => {
    render(
      <LanguageProvider locale="nl">
        <Link href="https://discord.gg/example">Discord</Link>
      </LanguageProvider>,
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://discord.gg/example",
    );
  });
});

describe("the language switcher", () => {
  it("offers the same page in each language, query and all", () => {
    render(
      <LanguageProvider locale="nl">
        <LanguageSwitcher />
      </LanguageProvider>,
    );

    // `/en/search`, not `/search`. The bare address names no language, so the
    // proxy answers it with the cookie, which still says Dutch: the switcher
    // would hand the reader straight back to the language they left.
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "href",
      "/en/search?q=board+games",
    );
    expect(screen.getByRole("link", { name: "Français" })).toHaveAttribute(
      "href",
      "/fr/search?q=board+games",
    );
  });

  it("keeps the current language visible rather than hiding it", () => {
    render(
      <LanguageProvider locale="nl">
        <LanguageSwitcher />
      </LanguageProvider>,
    );

    const current = screen.getByRole("link", { name: "Nederlands" });
    expect(current).toHaveAttribute("aria-current", "true");
    expect(current).toHaveAttribute("href", "/nl/search?q=board+games");
  });

  it("names each language in that language", () => {
    render(
      <LanguageProvider locale="fr">
        <LanguageSwitcher />
      </LanguageProvider>,
    );
    for (const name of ["English", "Nederlands", "Français"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });
});

describe("phrases", () => {
  function Phrase() {
    const t = useTranslate();
    return <p>{t("nav.discover")}</p>;
  }

  it("come out in the language of the tree they are rendered in", () => {
    render(
      <LanguageProvider locale="nl">
        <Phrase />
      </LanguageProvider>,
    );
    expect(screen.getByText("Ontdekken")).toBeInTheDocument();
  });

  it("fall back to English outside a provider rather than failing", () => {
    render(<Phrase />);
    expect(screen.getByText("Discover")).toBeInTheDocument();
  });
});

describe("the interest picker", () => {
  it("names the built-in interests in the language being read", async () => {
    const { InterestsStep } = await import("@/components/onboarding/interests-step");

    render(
      <LanguageProvider locale="nl">
        <InterestsStep initial={[]} />
      </LanguageProvider>,
    );

    expect(screen.getByRole("button", { name: "Gezelschapsspelen" })).toBeInTheDocument();
    expect(screen.getByText("Eten & drinken")).toBeInTheDocument();
  });

  it("keeps an interest a member added themselves in their own words", async () => {
    const { InterestsStep } = await import("@/components/onboarding/interests-step");

    render(
      <LanguageProvider locale="fr">
        <InterestsStep
          initial={[
            {
              slug: "warhammer-40k",
              custom: "Warhammer 40k",
              intent: "PRACTICES",
              strength: 2,
            },
          ]}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText("Warhammer 40k")).toBeInTheDocument();
    // And the taxonomy around it is still French.
    expect(screen.getByRole("button", { name: "Jeux de société" })).toBeInTheDocument();
  });
});
