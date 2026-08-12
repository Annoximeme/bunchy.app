"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice } from "@/components/ui";

export function RespondToRequest({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "accept" | "decline") {
    setPending(action);
    setError(null);
    try {
      await api(`/api/connections/${connectionId}`, {
        method: "PATCH",
        json: { action },
      });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      {error && <ErrorNotice message={error} />}
      <div className="flex gap-2">
        <Button
          size="sm"
          loading={pending === "accept"}
          onClick={() => respond("accept")}
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant="ghost"
          loading={pending === "decline"}
          onClick={() => respond("decline")}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}

export function WithdrawRequest({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setPending(true);
    setError(null);
    try {
      await api(`/api/connections/${connectionId}`, { method: "DELETE" });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && <ErrorNotice message={error} />}
      <Button size="sm" variant="ghost" loading={pending} onClick={withdraw}>
        Withdraw
      </Button>
    </div>
  );
}

/** Connect button used on a profile page. */
export function ConnectButton({
  profileId,
  state,
}: {
  profileId: string;
  state: "none" | "pending_outgoing" | "pending_incoming" | "connected" | "self";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state === "self") return null;

  if (state === "connected") {
    return <p className="text-sm font-medium text-positive">You&rsquo;re connected</p>;
  }

  if (state === "pending_incoming") {
    return (
      <p className="text-sm text-ink-soft">
        They asked to connect — answer it on your{" "}
        <a href="/connections" className="font-medium text-accent hover:underline">
          connections page
        </a>
        .
      </p>
    );
  }

  if (state === "pending_outgoing" || sent) {
    return <p className="text-sm text-muted">Request sent</p>;
  }

  async function connect() {
    setPending(true);
    setError(null);
    try {
      await api("/api/connections", { method: "POST", json: { profileId } });
      setSent(true);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && <ErrorNotice message={error} />}
      <Button loading={pending} onClick={connect}>
        Connect
      </Button>
    </div>
  );
}
