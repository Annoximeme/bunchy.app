"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice, Input, Select, cn } from "@/components/ui";

/**
 * The one way staff take an action.
 *
 * Every action opens the same small form and every action requires a written
 * reason before the button enables. That is not friction for its own sake: the
 * reason is what lands in the audit log, and an audit log full of blank reasons
 * is an audit log nobody can review. Making it mandatory in the only component
 * that performs actions means it cannot be skipped by adding a new page.
 */

export interface ActionOption {
  value: string;
  label: string;
}

export function AdminAction({
  label,
  endpoint,
  method = "POST",
  payload,
  confirmLabel,
  danger = false,
  requiresReason = true,
  extraField,
  disabled,
  disabledHint,
}: {
  label: string;
  endpoint: string;
  method?: "POST" | "PATCH" | "DELETE";
  /** Merged with the reason (and any extra field) to form the request body. */
  payload: Record<string, unknown>;
  confirmLabel?: string;
  danger?: boolean;
  requiresReason?: boolean;
  /** An optional second input, e.g. suspension length or a merge target. */
  extraField?: {
    name: string;
    label: string;
    type: "number" | "text" | "select";
    options?: ActionOption[];
    placeholder?: string;
    /** Sent when the field is left blank. */
    emptyValue?: unknown;
  };
  disabled?: boolean;
  disabledHint?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [extra, setExtra] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { ...payload };
      if (requiresReason) body.reason = reason.trim();
      if (extraField) {
        body[extraField.name] =
          extra === ""
            ? (extraField.emptyValue ?? null)
            : extraField.type === "number"
              ? Number(extra)
              : extra;
      }
      await api(endpoint, { method, json: body });
      setOpen(false);
      setReason("");
      setExtra("");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  if (disabled) {
    return (
      <span className="text-xs text-muted" title={disabledHint}>
        {label}
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "text-xs font-medium underline-offset-2 transition-colors hover:underline",
          danger ? "text-danger" : "text-accent-ink",
        )}
      >
        {label}
      </button>
    );
  }

  const reasonOk = !requiresReason || reason.trim().length >= 3;

  return (
    <div className="min-w-64 space-y-2 rounded-[var(--radius-control)] border border-line bg-surface-sunken p-3">
      <p className="text-xs font-semibold">{confirmLabel ?? label}</p>

      {error && <ErrorNotice message={error} />}

      {extraField && (
        <label className="block text-xs text-muted">
          {extraField.label}
          {extraField.type === "select" ? (
            <Select
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              className="mt-1 py-1.5 text-sm"
            >
              <option value="">Choose…</option>
              {extraField.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              type={extraField.type}
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder={extraField.placeholder}
              className="mt-1 py-1.5 text-sm"
            />
          )}
        </label>
      )}

      {requiresReason && (
        <label className="block text-xs text-muted">
          Reason (recorded in the audit log)
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you doing this?"
            className="mt-1 py-1.5 text-sm"
          />
        </label>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={danger ? "danger" : "primary"}
          loading={pending}
          disabled={!reasonOk}
          onClick={submit}
        >
          Confirm
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Groups actions so a table row stays readable. */
export function ActionRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-start gap-3">{children}</div>;
}
