"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, Card, ErrorNotice, Select, Toggle } from "@/components/ui";

export interface PrivacyValues {
  whoCanMessage: string;
  whoCanSendRequests: string;
  discoverable: boolean;
  showApproxLocation: boolean;
  invitableToBunches: boolean;
  showExactAge: boolean;
  aiIntroductions: boolean;
  whoCanSeeAvailability: string;
}

const AUDIENCES = [
  { value: "EVERYONE", label: "Anyone on Bunchy" },
  { value: "BUNCH_MEMBERS", label: "People in my bunches" },
  { value: "CONNECTIONS", label: "Friends of my connections" },
  { value: "NOBODY", label: "Nobody" },
] as const;

/**
 * Privacy controls.
 *
 * Every switch here does exactly what its label says, immediately. There is no
 * "recommended" nudge next to the private option and no warning that turning
 * something off will make the product worse for you, that framing exists to
 * talk people out of privacy, and we don't use it.
 */
export function PrivacySettings({ initial }: { initial: PrivacyValues }) {
  const [values, setValues] = useState<PrivacyValues>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof PrivacyValues>(key: K, value: PrivacyValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api("/api/profile", { method: "PATCH", json: values });
      setSaved(true);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold tracking-tight">Privacy</h2>
      <p className="mt-1 text-sm text-muted">
        We never store your address or precise location, only a rough area.
      </p>

      {error && (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="whoCanSendRequests" className="block text-sm font-medium">
            Who can send you a connection request
          </label>
          <Select
            id="whoCanSendRequests"
            value={values.whoCanSendRequests}
            onChange={(e) => set("whoCanSendRequests", e.target.value)}
            className="mt-1.5"
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="whoCanMessage" className="block text-sm font-medium">
            Who can message you
          </label>
          <Select
            id="whoCanMessage"
            value={values.whoCanMessage}
            onChange={(e) => set("whoCanMessage", e.target.value)}
            className="mt-1.5"
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-sm text-muted">
            Connections can always message you. That&rsquo;s what accepting means.
          </p>
        </div>

        <div>
          <label htmlFor="whoCanSeeAvailability" className="block text-sm font-medium">
            Who can see when you&rsquo;re free
          </label>
          <Select
            id="whoCanSeeAvailability"
            value={values.whoCanSeeAvailability}
            onChange={(e) => set("whoCanSeeAvailability", e.target.value)}
            className="mt-1.5"
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-sm text-muted">
            Only applies when you set a Who&rsquo;s Up status, and those expire on
            their own. Choosing <strong>Nobody</strong> switches the feature off
            and deletes any status you have set.
          </p>
        </div>

        <div className="divide-y divide-line border-y border-line">
          <Toggle
            id="discoverable"
            checked={values.discoverable}
            onChange={(v) => set("discoverable", v)}
            label="Appear in Discover"
            description="Turn off and nobody new will be shown your profile."
          />
          <Toggle
            id="showApproxLocation"
            checked={values.showApproxLocation}
            onChange={(v) => set("showApproxLocation", v)}
            label="Show my area"
            description="Off shows only your country. Matching still works, less precisely."
          />
          <Toggle
            id="showExactAge"
            checked={values.showExactAge}
            onChange={(v) => set("showExactAge", v)}
            label="Show my age"
            description="Off shows a range instead, like 25–34."
          />
          <Toggle
            id="aiIntroductions"
            checked={values.aiIntroductions}
            onChange={(v) => set("aiIntroductions", v)}
            label="Let Bunchy introduce you to people"
            description="Off means we never suggest someone unprompted. Search and Discover still work."
          />
          <Toggle
            id="invitableToBunches"
            checked={values.invitableToBunches}
            onChange={(v) => set("invitableToBunches", v)}
            label="Allow bunch invites"
            description="Off means only you can start the conversation about joining."
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={save} loading={saving}>
          Save
        </Button>
        {saved && <span className="text-sm text-positive">Saved</span>}
      </div>
    </Card>
  );
}
