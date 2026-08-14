"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui";

type Status = "NEW" | "REVIEWING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN";

/**
 * Deciding on one application.
 *
 * "Accept" deliberately does not make anybody staff — it records that this
 * person is worth talking to. The reminder under the buttons says so, because
 * an admin clicking Accept and assuming a badge appeared is how somebody ends
 * up thinking they were rejected.
 */
export function ApplicationDecision({
  id,
  status,
  username,
}: {
  id: string;
  status: Status;
  username: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(next: Status) {
    setPending(next);
    setError(null);
    try {
      await api(`/api/admin/moderators/${id}`, {
        method: "PATCH",
        json: { status: next },
      });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="shrink-0">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          loading={pending === "REVIEWING"}
          disabled={status === "REVIEWING"}
          onClick={() => decide("REVIEWING")}
        >
          Reviewing
        </Button>
        <Button
          size="sm"
          loading={pending === "ACCEPTED"}
          disabled={status === "ACCEPTED"}
          onClick={() => decide("ACCEPTED")}
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant="danger"
          loading={pending === "DECLINED"}
          disabled={status === "DECLINED"}
          onClick={() => decide("DECLINED")}
        >
          Decline
        </Button>
      </div>

      {status === "ACCEPTED" && (
        <p className="mt-2 max-w-[15rem] text-right text-xs text-muted">
          Not staff yet. Grant it with
          <code className="mx-1 rounded bg-surface-sunken px-1 py-0.5">
            npm run role -- &lt;email&gt; MODERATOR
          </code>
          after you have spoken to @{username}.
        </p>
      )}
      {error && (
        <p className="mt-2 max-w-[15rem] text-right text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
