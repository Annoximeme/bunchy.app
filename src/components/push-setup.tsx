"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice } from "@/components/ui";
import { Announce } from "@/components/live-region";

/**
 * Turning push on for this device.
 *
 * Separate from the per-type switches above it, because it answers a different
 * question. Those say *what* is worth telling somebody; this says *whether
 * this browser is allowed to interrupt them at all*, and it is per device: a
 * phone and a work laptop are two answers, not one.
 *
 * ## The permission prompt is not asked for on arrival
 *
 * Nothing here fires until somebody presses the button. A site that asks for
 * notification permission the moment it loads is the reason browsers now bury
 * the prompt, and a member who dismisses it once has denied it more or less
 * permanently, which is a worse outcome than never asking. So the ask happens
 * after a deliberate act, on a settings screen, where the person has already
 * decided they want this.
 */

type State =
  | "checking"
  | "unsupported"
  | "denied"
  | "off"
  | "on"
  | "working";

export function PushSetup({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("checking");
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  /*
    Settled asynchronously, all of it, even the two answers that are known
    synchronously.

    Reading `Notification.permission` during render or in a `useState`
    initialiser would be a hydration mismatch, because the server has no such
    thing and would render a different first paint. Deciding it in an effect
    body would be a cascading render. One async pass settles every branch the
    same way, and "checking" is a real state that shows as a loading button
    rather than a wrong one.
  */
  useEffect(() => {
    let cancelled = false;
    const settle = (next: State) => {
      if (!cancelled) setState(next);
    };

    void (async () => {
      if (!supported) return settle("unsupported");
      if (Notification.permission === "denied") return settle("denied");
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        settle(subscription ? "on" : "off");
      } catch {
        settle("off");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supported]);

  const enable = useCallback(async () => {
    setState("working");
    setError(null);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      // A worker that has only just been registered is not yet controlling
      // anything, and subscribing through it before it is active fails on some
      // browsers with an error that says nothing useful.
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        // Every push must show a notification. This is the browser holding us
        // to that, and it is the right constraint: a silent push is a way to
        // track somebody, not a way to tell them something.
        userVisibleOnly: true,
        applicationServerKey: decodeKey(publicKey),
      });

      const json = subscription.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      await api("/api/notifications/push", {
        method: "POST",
        json: { endpoint: json.endpoint, keys: json.keys },
      });

      setState("on");
      setAnnouncement("Push notifications are on for this device.");
    } catch (cause) {
      setState("off");
      setError(errorMessage(cause));
    }
  }, [publicKey]);

  const disable = useCallback(async () => {
    setState("working");
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        // The server first. If unsubscribing locally succeeded and the row
        // survived, we would keep pushing to an endpoint that is gone, which
        // is the failure that marks a subscription dead for no reason.
        await api("/api/notifications/push", {
          method: "DELETE",
          json: { endpoint: subscription.endpoint },
        }).catch(() => {});
        await subscription.unsubscribe();
      }
      setState("off");
      setAnnouncement("Push notifications are off for this device.");
    } catch (cause) {
      setState("on");
      setError(errorMessage(cause));
    }
  }, []);

  if (state === "unsupported") return null;

  return (
    <div className="mt-5 border-t border-line pt-5">
      <h3 className="text-sm font-medium text-ink">This device</h3>
      <p className="mt-1 text-sm text-muted">
        {state === "denied"
          ? "This browser is blocking notifications from Bunchy. That is changed in the browser's own site settings, not here."
          : state === "on"
            ? "Bunchy can notify you on this device. What it notifies you about is the Push column above."
            : "Get told on this device when something above happens, even when Bunchy is closed."}
      </p>

      <Announce message={announcement} />
      {error && (
        <div className="mt-3">
          <ErrorNotice message={error} />
        </div>
      )}

      {state !== "denied" && (
        <div className="mt-3">
          {state === "on" ? (
            <Button variant="secondary" size="sm" onClick={disable}>
              Turn off for this device
            </Button>
          ) : (
            <Button
              size="sm"
              loading={state === "working" || state === "checking"}
              onClick={enable}
            >
              Turn on for this device
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The VAPID public key, base64url as it travels, bytes as the browser wants it.
 *
 * `applicationServerKey` takes a `Uint8Array`, and the key is published as
 * base64url, which `atob` does not accept: it wants the `+/` alphabet and real
 * padding. Both substitutions are needed, and leaving either out produces an
 * `InvalidCharacterError` well away from anything that mentions push.
 */
function decodeKey(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = base64url.padEnd(
    base64url.length + ((4 - (base64url.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  // Built on an explicit ArrayBuffer rather than by `Uint8Array.from`, whose
  // type allows a SharedArrayBuffer behind it and so is not a `BufferSource`
  // as far as `applicationServerKey` is concerned.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
