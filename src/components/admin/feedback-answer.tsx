"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { Button, Select, Textarea } from "@/components/ui";
import { STATUS_LABEL } from "@/lib/feedback";
import type { FeedbackStatus } from "@/generated/prisma/enums";

const STATUSES: FeedbackStatus[] = ["NEW", "READ", "PLANNED", "SHIPPED", "DECLINED"];

/**
 * Set a state and write back.
 *
 * The reply box is always visible rather than hidden behind a button, because
 * a reply that takes an extra click is a reply that does not get written, and
 * the reply is the only part of this whole feature that the member experiences
 * as anything other than shouting into a hole.
 */
export function FeedbackAnswer({
  id,
  status,
  reply,
  canReply,
}: {
  id: string;
  status: FeedbackStatus;
  reply: string | null;
  canReply: boolean;
}) {
  const router = useRouter();
  const [next, setNext] = useState<FeedbackStatus>(status);
  const [text, setText] = useState(reply ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsReason = next === "DECLINED" && text.trim().length === 0;

  async function save() {
    setPending(true);
    setError(null);
    try {
      await api(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        json: { status: next, reply: text.trim() || null },
      });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-line pt-3">
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Textarea
        rows={2}
        value={text}
        disabled={pending}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          canReply
            ? "What happened to it. This is sent to them word for word."
            : "The account is gone, so nothing will be sent."
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="max-w-48"
          value={next}
          disabled={pending}
          onChange={(e) => setNext(e.target.value as FeedbackStatus)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>

        <Button size="sm" loading={pending} disabled={needsReason} onClick={save}>
          Save
        </Button>

        {needsReason && (
          <span className="text-xs text-muted">
            Declining needs a reason. An unexplained no is what stops people
            writing again.
          </span>
        )}
      </div>
    </div>
  );
}
