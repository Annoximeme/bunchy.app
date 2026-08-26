"use client";

import { useTranslate } from "@/components/link";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, Card, ErrorNotice, Select, Toggle } from "@/components/ui";
import { brand } from "@/lib/brand";
import { phrase } from "@/lib/i18n/phrase";

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

/**
 * Who an audience setting can be opened to.
 *
 * Phrase refs rather than words: this list is module scope and the language is
 * only known once a request is being served.
 */
const AUDIENCES = [
  { value: "EVERYONE", label: phrase("privacy.anyone") },
  { value: "BUNCH_MEMBERS", label: phrase("privacy.myBunches") },
  { value: "CONNECTIONS", label: phrase("privacy.friendsOfConnections") },
  { value: "NOBODY", label: phrase("privacy.nobody") },
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
  const t = useTranslate();
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
      <h2 className="text-lg font-semibold tracking-tight">{t("privacy.title")}</h2>
      <p className="mt-1 text-sm text-muted">
        {t("privacy.locationNote")}
      </p>

      {error && (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="whoCanSendRequests" className="block text-sm font-medium">
            {t("privacy.whoCanRequest")}
          </label>
          <Select
            id="whoCanSendRequests"
            value={values.whoCanSendRequests}
            onChange={(e) => set("whoCanSendRequests", e.target.value)}
            className="mt-1.5"
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {t(a.label, { brand: brand.name })}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="whoCanMessage" className="block text-sm font-medium">
            {t("privacy.whoCanMessage")}
          </label>
          <Select
            id="whoCanMessage"
            value={values.whoCanMessage}
            onChange={(e) => set("whoCanMessage", e.target.value)}
            className="mt-1.5"
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {t(a.label, { brand: brand.name })}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-sm text-muted">
            {t("privacy.messageNote")}
          </p>
        </div>

        <div>
          <label htmlFor="whoCanSeeAvailability" className="block text-sm font-medium">
            {t("privacy.whoCanSeeFree")}
          </label>
          <Select
            id="whoCanSeeAvailability"
            value={values.whoCanSeeAvailability}
            onChange={(e) => set("whoCanSeeAvailability", e.target.value)}
            className="mt-1.5"
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {t(a.label, { brand: brand.name })}
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
            label={t("privacy.discoverable")}
            description={t("privacy.discoverableNote")}
          />
          <Toggle
            id="showApproxLocation"
            checked={values.showApproxLocation}
            onChange={(v) => set("showApproxLocation", v)}
            label={t("privacy.showArea")}
            description={t("privacy.showAreaNote")}
          />
          <Toggle
            id="showExactAge"
            checked={values.showExactAge}
            onChange={(v) => set("showExactAge", v)}
            label={t("privacy.showAge")}
            description={t("privacy.showAgeNote")}
          />
          <Toggle
            id="aiIntroductions"
            checked={values.aiIntroductions}
            onChange={(v) => set("aiIntroductions", v)}
            label={t("privacy.introductions", { brand: brand.name })}
            description={t("privacy.introductionsNote")}
          />
          <Toggle
            id="invitableToBunches"
            checked={values.invitableToBunches}
            onChange={(v) => set("invitableToBunches", v)}
            label={t("privacy.bunchInvites")}
            description={t("privacy.bunchInvitesNote")}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={save} loading={saving}>
          {t("privacy.save")}
        </Button>
        {saved && <span className="text-sm text-positive">{t("privacy.saved")}</span>}
      </div>
    </Card>
  );
}
