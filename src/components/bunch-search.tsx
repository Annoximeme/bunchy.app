"use client";

import { useState, type FormEvent } from "react";
import { Button, Input } from "@/components/ui";
import { useLocaleRouter, useTranslate } from "@/components/link";

/**
 * Search as a real form submission rather than a live-filtering input.
 *
 * The URL carries the query, so a search is shareable, back works, and the
 * server does the filtering it is already good at.
 */
export function BunchSearch({ initialQuery }: { initialQuery: string }) {
  const t = useTranslate();
  const router = useLocaleRouter();
  const [value, setValue] = useState(initialQuery);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    router.push(trimmed ? `/bunches?q=${encodeURIComponent(trimmed)}` : "/bunches");
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2" role="search">
      <label htmlFor="bunch-search" className="sr-only">
        {t("bunches.search")}
      </label>
      <Input
        id="bunch-search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("bunches.searchPlaceholder")}
        className="flex-1"
      />
      <Button type="submit" variant="secondary">
        {t("bunches.searchAction")}
      </Button>
      {initialQuery && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setValue("");
            router.push("/bunches");
          }}
        >
          {t("bunches.clear")}
        </Button>
      )}
    </form>
  );
}
