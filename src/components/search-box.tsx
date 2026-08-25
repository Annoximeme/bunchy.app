"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Input } from "@/components/ui";

/**
 * The one input in the product for finding something you already have.
 *
 * A submitted form rather than a live-filtering box, for the reason the bunch
 * search gives: the URL carries the query, so the result is shareable and the
 * back button behaves. It also means no request goes out per keystroke, which
 * matters more here than there, because this one touches four tables.
 */
export function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2" role="search">
      <label htmlFor="site-search" className="sr-only">
        Search your people, bunches, activities and messages
      </label>
      <Input
        id="site-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="A name, a place, something somebody said…"
        className="flex-1"
        autoComplete="off"
      />
      <Button type="submit" variant="secondary">
        Search
      </Button>
      {initialQuery && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setValue("");
            router.push("/search");
          }}
        >
          Clear
        </Button>
      )}
    </form>
  );
}
