"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice, Field, Input, Textarea } from "@/components/ui";

/**
 * Turning a proposal into invitations.
 *
 * The name and description are editable before sending, because the generated
 * ones are a starting point, "Climbing in Ghent" is a reasonable guess and a
 * human can do better in ten seconds.
 */
export function CreateProposedBunch({
  suggestedName,
  profileIds,
  interests,
}: {
  suggestedName: string;
  profileIds: string[];
  interests: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(suggestedName);
  const [description, setDescription] = useState(
    interests.length > 0
      ? `A small bunch for people into ${interests.slice(0, 3).join(", ").toLowerCase()}.`
      : "A small bunch we think would suit you.",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ invited: number }>("/api/admin/formation", {
        method: "POST",
        json: { name, description, profileIds, interestSlugs: interests.map((i) => i.toLowerCase()) },
      });
      setDone(result.invited);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (done !== null) {
    return (
      <p className="text-sm font-medium text-positive">
        Created, {done} {done === 1 ? "person has" : "people have"} been invited.
        Nobody is a member until they accept.
      </p>
    );
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Create and invite
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      {error && <ErrorNotice message={error} />}
      <div className="grid gap-3 sm:max-w-md">
        <Field label="Name" htmlFor={`name-${profileIds[0]}`}>
          <Input
            id={`name-${profileIds[0]}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Description" htmlFor={`desc-${profileIds[0]}`}>
          <Textarea
            id={`desc-${profileIds[0]}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={busy} onClick={create}>
          Send {profileIds.length} invitations
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
