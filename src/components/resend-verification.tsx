"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice } from "@/components/ui";

export function ResendVerification() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/verify-email", { method: "PUT" });
      setSent(true);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return <p className="text-sm text-positive">Sent, check your inbox.</p>;
  }

  return (
    <div className="space-y-2">
      {error && <ErrorNotice message={error} />}
      <Button size="sm" variant="secondary" loading={pending} onClick={resend}>
        Resend confirmation email
      </Button>
    </div>
  );
}
