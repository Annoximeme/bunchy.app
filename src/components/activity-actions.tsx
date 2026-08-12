"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice } from "@/components/ui";

export function ActivityJoinButton({
  activityId,
  viewerStatus,
  spotsLeft,
  isOrganizer,
  status,
}: {
  activityId: string;
  viewerStatus: string | null;
  spotsLeft: number;
  isOrganizer: boolean;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function act(fn: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  if (status === "CANCELLED") {
    return <p className="text-sm font-medium text-danger">This was cancelled.</p>;
  }

  return (
    <div className="space-y-2">
      {error && <ErrorNotice message={error} />}

      {isOrganizer ? (
        confirmCancel ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-soft">
              Cancel this? Everyone going will be told.
            </span>
            <Button
              variant="danger"
              size="sm"
              loading={pending}
              onClick={() =>
                act(() => api(`/api/activities/${activityId}`, { method: "DELETE" }))
              }
            >
              Cancel it
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>
              Keep it
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(true)}>
            Cancel activity
          </Button>
        )
      ) : viewerStatus === "JOINED" || viewerStatus === "WAITLISTED" ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-positive">
            {viewerStatus === "JOINED" ? "You're going" : "You're on the waitlist"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            loading={pending}
            onClick={() =>
              act(() =>
                api(`/api/activities/${activityId}/participation`, {
                  method: "DELETE",
                }),
              )
            }
          >
            Can&rsquo;t make it
          </Button>
        </div>
      ) : (
        <Button
          loading={pending}
          onClick={() =>
            act(() =>
              api(`/api/activities/${activityId}/participation`, { method: "POST" }),
            )
          }
        >
          {spotsLeft > 0 ? "Count me in" : "Join the waitlist"}
        </Button>
      )}
    </div>
  );
}
