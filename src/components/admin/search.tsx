"use client";

import { useState, type FormEvent } from "react";
import { Button, Input, Select } from "@/components/ui";
import { useLocaleRouter } from "@/components/link";

/**
 * Search and filters as a plain form submission.
 *
 * The query lives in the URL, so a moderator can bookmark "all suspended
 * accounts", share a search with a colleague, and use the back button, none of
 * which works if the filter state lives only in React.
 */

export interface AdminFilter {
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
}

export function AdminSearch({
  basePath,
  initialQuery,
  placeholder,
  filters = [],
}: {
  basePath: string;
  initialQuery: string;
  placeholder?: string;
  filters?: AdminFilter[];
}) {
  const router = useLocaleRouter();
  const [query, setQuery] = useState(initialQuery);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(filters.map((f) => [f.name, f.value])),
  );

  function navigate(next: Record<string, string>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ ...values, q: query.trim() });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-2" role="search">
      <label className="sr-only" htmlFor="admin-search">
        Search
      </label>
      <Input
        id="admin-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="min-w-56 flex-1 py-2 text-sm"
      />

      {filters.map((filter) => (
        <div key={filter.name}>
          <label className="sr-only" htmlFor={`filter-${filter.name}`}>
            {filter.name}
          </label>
          <Select
            id={`filter-${filter.name}`}
            value={values[filter.name] ?? ""}
            onChange={(e) => {
              const next = { ...values, [filter.name]: e.target.value };
              setValues(next);
              navigate({ ...next, q: query.trim() });
            }}
            className="py-2 text-sm"
          >
            {filter.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      ))}

      <Button type="submit" variant="secondary" size="sm">
        Search
      </Button>
    </form>
  );
}
