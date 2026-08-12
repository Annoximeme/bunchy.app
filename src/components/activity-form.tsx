"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import {
  Button,
  ErrorNotice,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

/** A local datetime string for `<input type="datetime-local">`, an hour ahead. */
function defaultStart(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ActivityForm({
  bunches,
  defaultBunchId,
  defaultTitle,
  defaultDescription,
  defaultCity,
  defaultCountry,
}: {
  bunches: Array<{ id: string; name: string }>;
  defaultBunchId?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultCity: string | null;
  defaultCountry: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"OFFLINE" | "ONLINE">("OFFLINE");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const bunchId = String(data.get("bunchId") ?? "");

    try {
      const result = await api<{ activity: { id: string } }>("/api/activities", {
        method: "POST",
        json: {
          title: String(data.get("title") ?? ""),
          description: String(data.get("description") ?? ""),
          // datetime-local has no zone; the browser's own offset is the right
          // interpretation of what the organizer typed.
          startsAt: new Date(String(data.get("startsAt"))).toISOString(),
          mode,
          maxParticipants: Number(data.get("maxParticipants")),
          ...(mode === "OFFLINE"
            ? {
                locationLabel: String(data.get("locationLabel") ?? ""),
                ...(defaultCity && defaultCountry
                  ? { cityLabel: defaultCity, countryCode: defaultCountry }
                  : {}),
              }
            : { onlineUrl: String(data.get("onlineUrl") ?? "") || undefined }),
          ...(bunchId ? { bunchId } : {}),
        },
      });
      router.push(`/activities/${result.activity.id}`);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && <ErrorNotice message={error} />}

      <Field label="What's the plan?" htmlFor="title">
        <Input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={100}
          defaultValue={defaultTitle}
          placeholder="Coffee & board games"
        />
      </Field>

      <Field
        label="Tell people what to expect"
        htmlFor="description"
        hint="What you'll do, who it suits, anything to bring."
      >
        <Textarea
          id="description"
          name="description"
          required
          minLength={10}
          maxLength={1500}
          defaultValue={defaultDescription}
          placeholder="Bring a game or just turn up. We'll be at the big table near the window."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="When" htmlFor="startsAt">
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={defaultStart()}
          />
        </Field>

        <Field label="How many people" htmlFor="maxParticipants">
          <Input
            id="maxParticipants"
            name="maxParticipants"
            type="number"
            min={2}
            max={50}
            defaultValue={6}
            required
          />
        </Field>
      </div>

      <Field label="Where" htmlFor="mode">
        <Select
          id="mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as "OFFLINE" | "ONLINE")}
        >
          <option value="OFFLINE">In person</option>
          <option value="ONLINE">Online</option>
        </Select>
      </Field>

      {mode === "OFFLINE" ? (
        <Field
          label="Meeting point"
          htmlFor="locationLabel"
          hint="A venue or neighbourhood. Never post your home address here."
        >
          <Input
            id="locationLabel"
            name="locationLabel"
            required
            maxLength={160}
            placeholder="Bar Bassin, Antwerp"
          />
        </Field>
      ) : (
        <Field
          label="Where online"
          htmlFor="onlineUrl"
          hint="Only people who join can see this."
        >
          <Input
            id="onlineUrl"
            name="onlineUrl"
            type="url"
            maxLength={500}
            placeholder="https://discord.gg/…"
          />
        </Field>
      )}

      {bunches.length > 0 && (
        <Field
          label="For a bunch?"
          htmlFor="bunchId"
          hint="Bunch members get told about it. Leave empty to make it open to everyone."
        >
          <Select id="bunchId" name="bunchId" defaultValue={defaultBunchId ?? ""}>
            <option value="">Open to anyone</option>
            {bunches.map((bunch) => (
              <option key={bunch.id} value={bunch.id}>
                {bunch.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Button type="submit" loading={pending} size="lg" className="w-full">
        Create activity
      </Button>
    </form>
  );
}
