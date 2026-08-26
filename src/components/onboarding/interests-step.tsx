"use client";

import { useMemo, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice, Input, cn } from "@/components/ui";
import {
  INTEREST_CATEGORIES,
  INTEREST_SEEDS,
  type InterestSeed,
} from "@/lib/interests";
import { useLanguage, useLocaleRouter } from "@/components/link";
import { interestCategory, interestLabel } from "@/lib/i18n/interests";

/**
 * Interest picker.
 *
 * The one thing this does that a normal tag picker does not: every selection
 * carries an *intent*. "I do this" and "I want to get into this" are different
 * facts about a person, and the difference is what lets the matching engine
 * introduce a photographer to someone who wants to learn photography instead of
 * only to other photographers.
 */

interface Selection {
  slug: string;
  strength: number;
  intent: "PRACTICES" | "CURIOUS";
  custom?: string;
}

const MIN_INTERESTS = 3;

export function InterestsStep({ initial }: { initial: Selection[] }) {
  const router = useLocaleRouter();
  const { locale, t } = useLanguage();

  /**
   * The taxonomy in the reader's language.
   *
   * Built once per language rather than translated at each of the four places
   * that need it, because the search below matches on the label: somebody
   * typing "gezelschaps" is looking for board games, and filtering the English
   * word would find nothing.
   */
  const seeds = useMemo(
    () =>
      INTEREST_SEEDS.map((seed) => ({
        ...seed,
        label: interestLabel(locale, seed.slug, seed.label),
      })),
    [locale],
  );
  const [selected, setSelected] = useState<Map<string, Selection>>(
    new Map(initial.map((i) => [i.slug, i])),
  );
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bySlug = useMemo(
    () => new Map(seeds.map((i) => [i.slug, i] as const)),
    [seeds],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return null;
    return seeds.filter((i) => i.label.toLowerCase().includes(needle));
  }, [query, seeds]);

  const canAddCustom =
    query.trim().length >= 2 &&
    filtered?.length === 0 &&
    !selected.has(customSlug(query));

  function toggle(seed: InterestSeed) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(seed.slug)) next.delete(seed.slug);
      else next.set(seed.slug, { slug: seed.slug, strength: 2, intent: "PRACTICES" });
      return next;
    });
  }

  function addCustom() {
    const label = query.trim();
    const slug = customSlug(label);
    setSelected((prev) =>
      new Map(prev).set(slug, {
        slug,
        strength: 2,
        intent: "PRACTICES",
        custom: label,
      }),
    );
    setQuery("");
  }

  function update(slug: string, patch: Partial<Selection>) {
    setSelected((prev) => {
      const current = prev.get(slug);
      if (!current) return prev;
      return new Map(prev).set(slug, { ...current, ...patch });
    });
  }

  async function submit() {
    if (selected.size < MIN_INTERESTS) {
      setError(`Pick at least ${MIN_INTERESTS} so we have something to go on.`);
      return;
    }

    setPending(true);
    setError(null);

    const values = [...selected.values()];
    try {
      const result = await api<{ next: string }>("/api/onboarding/interests", {
        method: "POST",
        json: {
          interests: values
            .filter((v) => !v.custom)
            .map(({ slug, strength, intent }) => ({ slug, strength, intent })),
          customInterests: values
            .filter((v) => v.custom)
            .map((v) => ({
              label: v.custom!,
              strength: v.strength,
              intent: v.intent,
            })),
        },
      });
      router.push(result.next);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  const chosen = [...selected.values()];

  return (
    <div className="space-y-6">
      {error && <ErrorNotice message={error} />}

      <div>
        <label htmlFor="interest-search" className="sr-only">
          {t("interests.searchLabel")}
        </label>
        <Input
          id="interest-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("interests.searchPlaceholder")}
        />
        {canAddCustom && (
          <button
            type="button"
            onClick={addCustom}
            className="mt-2 text-sm font-medium text-accent-ink underline underline-offset-2"
          >
            {t("interests.addCustom", { query: query.trim() })}
          </button>
        )}
      </div>

      {chosen.length > 0 && (
        <div className="card-surface p-5">
          <p className="text-sm font-medium text-ink">
            {t("interests.yourInterests")}
            <span className="ml-1.5 font-normal text-muted">
              ({chosen.length})
            </span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {t("interests.learningNote")}
          </p>

          <ul className="mt-4 space-y-2">
            {chosen.map((item) => {
              const label = item.custom ?? bySlug.get(item.slug)?.label ?? item.slug;
              return (
                <li
                  key={item.slug}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] bg-surface-sunken px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {label}
                    <button
                      type="button"
                      onClick={() =>
                        update(item.slug, {
                          strength: item.strength === 3 ? 2 : 3,
                        })
                      }
                      aria-pressed={item.strength === 3}
                      title={t("interests.favourite")}
                      className={cn(
                        "rounded-full px-1.5 text-base leading-none transition-opacity",
                        item.strength === 3
                          ? "opacity-100"
                          : "opacity-30 hover:opacity-70",
                      )}
                    >
                      ★<span className="sr-only">{t("interests.markFavourite")}</span>
                    </button>
                  </span>

                  <span className="flex items-center gap-1">
                    <IntentButton
                      active={item.intent === "PRACTICES"}
                      onClick={() => update(item.slug, { intent: "PRACTICES" })}
                    >
                      {t("interests.doThis")}
                    </IntentButton>
                    <IntentButton
                      active={item.intent === "CURIOUS"}
                      onClick={() => update(item.slug, { intent: "CURIOUS" })}
                    >
                      {t("interests.wantToLearn")}
                    </IntentButton>
                    <button
                      type="button"
                      onClick={() =>
                        setSelected((prev) => {
                          const next = new Map(prev);
                          next.delete(item.slug);
                          return next;
                        })
                      }
                      className="ml-1 rounded-full px-2 py-1 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                      aria-label={t("interests.remove", { label })}
                    >
                      ×
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        {(filtered
          ? [{ category: t("interests.results"), items: filtered }]
          : INTEREST_CATEGORIES.map((category) => ({
              category: interestCategory(locale, category),
              items: seeds.filter((i) => i.category === category),
            }))
        ).map(({ category, items }) => (
          <div key={category}>
            <h2 className="mb-2.5 text-sm font-semibold text-ink-soft">
              {category}
            </h2>
            <div className="flex flex-wrap gap-2">
              {items.map((seed) => {
                const active = selected.has(seed.slug);
                return (
                  <button
                    key={seed.slug}
                    type="button"
                    onClick={() => toggle(seed)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ease-[var(--ease-out-soft)] active:scale-95",
                      active
                        ? "border-accent bg-accent text-[var(--color-on-accent)]"
                        : "border-line bg-surface text-ink-soft hover:border-ink-soft hover:text-ink",
                    )}
                  >
                    {seed.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {filtered?.length === 0 && (
          <p className="text-sm text-muted">
            {t("interests.noMatch", { query })}
          </p>
        )}
      </div>

      <div className="sticky bottom-4 pt-2">
        <Button
          onClick={submit}
          loading={pending}
          size="lg"
          className="w-full shadow-[var(--shadow-lift)]"
        >
          {selected.size < MIN_INTERESTS
            ? t("interests.pickMore", { count: MIN_INTERESTS - selected.size })
            : t("onboarding.continueLabel")}
        </Button>
      </div>
    </div>
  );
}

function IntentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-teal text-white" : "text-muted hover:bg-surface hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function customSlug(input: string): string {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
