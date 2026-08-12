"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Input } from "@/components/ui";

/**
 * Search as a real form submission rather than a live-filtering input.
 *
 * The URL carries the query, so a search is shareable, back works, and the
 * server does the filtering it is already good at.
 */
export function CircleSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    router.push(trimmed ? `/circles?q=${encodeURIComponent(trimmed)}` : "/circles");
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2" role="search">
      <label htmlFor="circle-search" className="sr-only">
        Search circles
      </label>
      <Input
        id="circle-search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Board games, hiking, AI…"
        className="flex-1"
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
            router.push("/circles");
          }}
        >
          Clear
        </Button>
      )}
    </form>
  );
}
