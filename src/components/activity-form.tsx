"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { FormError, useFormSubmit } from "@/components/form-state";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { useLocaleRouter } from "@/components/link";

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
  const router = useLocaleRouter();
  /*
    Online first, matching the schema default.

    Most people never change a default, so this is the strongest opinion the
    form has. An online plan needs fewer things to line up than an in-person
    one, which makes it the one that can actually fill while the membership is
    small.
  */
  const [mode, setMode] = useState<"OFFLINE" | "ONLINE">("ONLINE");
  const [cadence, setCadence] = useState("");

  const form = useFormSubmit(async (event) => {
    const data = new FormData(event.currentTarget);
    const bunchId = String(data.get("bunchId") ?? "");

    const result = await api<{
      activity?: { id: string };
      series?: { id: string };
    }>("/api/activities", {
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
        ...(cadence ? { cadence } : {}),
      },
    });

    /*
      A series has no occurrence yet. The job materialises the first one
      within the hour, so there is nothing to navigate to and sending
      somebody to a 404 would be worse than sending them nowhere. The
      activities list is where it will appear, and it is the honest
      destination.
    */
    router.push(
      result.activity ? `/activities/${result.activity.id}` : "/activities",
    );
    router.refresh();
  });

  return (
    <form onSubmit={form.onSubmit} className="space-y-6">
      <FormError state={form} />

      <Field label="What's the plan?" htmlFor="title" error={form.fields.title}>
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
        error={form.fields.description}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="When" htmlFor="startsAt" error={form.fields.startsAt}>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={defaultStart()}
          />
        </Field>

        <Field
          label="How many people"
          htmlFor="maxParticipants"
          error={form.fields.maxParticipants}
        >
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
          label="Venue"
          htmlFor="locationLabel"
          error={form.fields.locationLabel}
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
      ) : null}

      {/*
        Kept apart from the venue above, and asked for separately, because the
        two have different audiences. The venue is shown to anybody who can see
        the plan. This is shown only to the people who joined it, which is the
        difference between announcing an evening and telling the world exactly
        where a group of people will be standing.
      */}
      {mode === "OFFLINE" ? (
        <Field
          label="Meeting point"
          htmlFor="meetingPoint"
          hint="Only people who join can see this. Which door, which floor, what you will be wearing. Optional, and the thing that turns a joined plan into somebody actually finding you."
          error={form.fields.meetingPoint}
        >
          <Input
            id="meetingPoint"
            name="meetingPoint"
            maxLength={200}
            placeholder="Upstairs, the long table by the window"
          />
        </Field>
      ) : (
        <Field
          label="Where online"
          htmlFor="onlineUrl"
          error={form.fields.onlineUrl}
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

      {/*
        Repeat, as one more answer about the same plan.

        Deliberately not a separate "create a recurring activity" flow. To the
        person filling this in, "every Thursday" is a property of the Thursday
        they are already describing, and a second entry point would mean two
        forms to keep in agreement. The default is a one-off, because most
        plans are.
      */}
      <Field
        label="Does it repeat?"
        htmlFor="cadence"
        error={form.fields.cadence}
        hint="A repeating plan becomes a standing arrangement. Anyone who joins it is in for every one, and can still miss a week without leaving."
      >
        <Select
          id="cadence"
          name="cadence"
          value={cadence}
          onChange={(event) => setCadence(event.target.value)}
        >
          <option value="">Just this once</option>
          <option value="WEEKLY">Every week</option>
          <option value="BIWEEKLY">Every two weeks</option>
          <option value="MONTHLY">Every month</option>
        </Select>
      </Field>

      {bunches.length > 0 && (
        <Field
          label="For a bunch?"
          htmlFor="bunchId"
          error={form.fields.bunchId}
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

      <Button type="submit" loading={form.pending} size="lg" className="w-full">
        Create activity
      </Button>
    </form>
  );
}
