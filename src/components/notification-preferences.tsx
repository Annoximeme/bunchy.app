"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Card, ErrorNotice, cn } from "@/components/ui";
import {
  NOTIFICATION_GROUPS,
  NOTIFICATION_TYPE_INFO,
  defaultPreference,
} from "@/lib/notifications";

/**
 * Per-type notification settings.
 *
 * Saved the moment a switch moves — a settings screen with a Save button is a
 * settings screen people abandon half-changed, and the whole point of granular
 * control is that it is actually used.
 *
 * There is no "turn everything on" nudge, and nothing warns you that switching
 * something off will make the product worse for you. That framing exists to
 * talk people out of quiet, and Bunchy does not use it.
 */

export interface PreferenceValue {
  type: string;
  inApp: boolean;
  email: boolean;
}

export function NotificationPreferences({
  initial,
}: {
  initial: PreferenceValue[];
}) {
  const [values, setValues] = useState<Map<string, PreferenceValue>>(
    () =>
      new Map(
        NOTIFICATION_TYPE_INFO.map((info) => {
          const found = initial.find((p) => p.type === info.type);
          return [
            info.type,
            found ?? { type: info.type, ...defaultPreference(info.type) },
          ];
        }),
      ),
  );
  const [savingType, setSavingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(type: string, channel: "inApp" | "email") {
    const current = values.get(type);
    if (!current) return;

    const next = { ...current, [channel]: !current[channel] };
    setValues((prev) => new Map(prev).set(type, next));
    setSavingType(type);
    setError(null);

    try {
      await api("/api/notifications/preferences", {
        method: "PATCH",
        json: { type, inApp: next.inApp, email: next.email },
      });
    } catch (cause) {
      // Put it back — a switch that looks changed but was not saved is a lie.
      setValues((prev) => new Map(prev).set(type, current));
      setError(errorMessage(cause));
    } finally {
      setSavingType(null);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold tracking-tight">Notifications</h2>
      <p className="mt-1 text-sm text-muted">
        We only ever tell you about something a person did. Suggestions are off
        unless you turn them on.
      </p>

      {error && (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      )}

      <div className="mt-5 space-y-6">
        {NOTIFICATION_GROUPS.map((group) => (
          <div key={group}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {group}
            </h3>

            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="sr-only">
                      Notification
                    </th>
                    <th
                      scope="col"
                      className="w-16 pb-1 text-xs font-medium text-muted"
                    >
                      In app
                    </th>
                    <th
                      scope="col"
                      className="w-16 pb-1 text-xs font-medium text-muted"
                    >
                      Email
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {NOTIFICATION_TYPE_INFO.filter((i) => i.group === group).map(
                    (info) => {
                      const value = values.get(info.type)!;
                      return (
                        <tr key={info.type}>
                          <td className="py-2.5 pr-3">
                            <span className="block font-medium text-ink">
                              {info.label}
                            </span>
                            <span className="block text-xs text-muted">
                              {info.description}
                            </span>
                          </td>
                          {(["inApp", "email"] as const).map((channel) => (
                            <td key={channel} className="py-2.5 text-center">
                              <Switch
                                checked={value[channel]}
                                busy={savingType === info.type}
                                onChange={() => toggle(info.type, channel)}
                                label={`${info.label}, ${
                                  channel === "inApp" ? "in app" : "email"
                                }`}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Switch({
  checked,
  onChange,
  label,
  busy,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy || undefined}
      onClick={onChange}
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors duration-200",
        checked ? "bg-accent" : "bg-line",
      )}
    >
      {/*
        `left-0` matters: a button centres its inline content, so without it the
        knob's static position is the middle of the track and the translate
        pushes it out past the right edge.
      */}
      <span
        className={cn(
          "absolute left-0 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[var(--ease-out-soft)]",
          checked ? "translate-x-[1.125rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
