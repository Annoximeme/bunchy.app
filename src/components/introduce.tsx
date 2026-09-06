"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link, useLanguage } from "@/components/link";
import { api, errorMessage } from "@/lib/api";
import {
  Avatar,
  Button,
  ErrorNotice,
  Select,
  Textarea,
} from "@/components/ui";

interface Person {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Putting two people you know together.
 *
 * ## Why it is two dropdowns and a line of text
 *
 * The line is the feature. "You both spent last summer restoring bikes" is
 * what makes an introduction worth answering; without it the notification
 * reads "somebody thinks you should meet", which is not an introduction, it is
 * a poke. So the note is the biggest control on the form and the only one that
 * takes any thought.
 *
 * ## Why nothing is counted
 *
 * No total, no badge, no "introductions made" anywhere. The moment being the
 * person who introduces people is worth points, the introductions stop being
 * about the two people.
 */
export function Introduce({ connections }: { connections: Person[] }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [one, setOne] = useState("");
  const [other, setOther] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Two people to introduce means at least two connections. Below that the
  // control would only ever be able to refuse.
  if (connections.length < 2) return null;

  if (done) {
    return (
      <p className="text-sm text-positive">{t("introduce.sent")}</p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-accent-ink underline underline-offset-2"
      >
        {t("introduce.start")}
      </button>
    );
  }

  async function send() {
    setPending(true);
    setError(null);
    try {
      await api("/api/introductions", {
        method: "POST",
        json: { action: "introduce", oneId: one, otherId: other, note: note.trim() || null },
      });
      setDone(true);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card-surface space-y-3 p-4">
      {error && <ErrorNotice message={error} />}

      <p className="text-sm text-muted">{t("introduce.hint")}</p>

      <div className="flex flex-wrap gap-2">
        <Select
          value={one}
          aria-label={t("introduce.first")}
          onChange={(event) => setOne(event.target.value)}
          className="w-auto"
        >
          <option value="">{t("introduce.first")}</option>
          {connections
            .filter((person) => person.id !== other)
            .map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
        </Select>
        <Select
          value={other}
          aria-label={t("introduce.second")}
          onChange={(event) => setOther(event.target.value)}
          className="w-auto"
        >
          <option value="">{t("introduce.second")}</option>
          {connections
            .filter((person) => person.id !== one)
            .map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
        </Select>
      </div>

      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        maxLength={300}
        placeholder={t("introduce.notePlaceholder")}
        aria-label={t("introduce.note")}
      />

      <div className="flex flex-wrap gap-3">
        <Button loading={pending} disabled={!one || !other} onClick={send}>
          {t("introduce.send")}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}

/**
 * An introduction somebody made, waiting on your answer.
 *
 * Declining is silent, the same as declining a connection request, and the
 * card says so before anybody presses anything. The person who made the
 * introduction is told it did not go ahead and never which of the two said no.
 */
export function IntroductionCard({
  introduction,
}: {
  introduction: {
    id: string;
    note: string | null;
    introducer: { username: string; displayName: string } | null;
    person: {
      username: string;
      displayName: string;
      avatarUrl: string | null;
      bio: string | null;
    };
  };
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(accept: boolean) {
    setPending(accept ? "yes" : "no");
    setError(null);
    try {
      await api("/api/introductions", {
        method: "POST",
        json: { action: "respond", introductionId: introduction.id, accept },
      });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(null);
    }
  }

  return (
    <div className="card-surface p-4">
      {error && <ErrorNotice message={error} />}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/u/${introduction.person.username}`}
          className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80"
        >
          <Avatar
            name={introduction.person.displayName}
            src={introduction.person.avatarUrl}
          />
          <span className="min-w-0">
            <span className="block truncate font-medium">
              {introduction.person.displayName}
            </span>
            <span className="block truncate text-sm text-muted">
              {introduction.introducer
                ? t("introduce.by", { name: introduction.introducer.displayName })
                : t("introduce.byGone")}
            </span>
          </span>
        </Link>

        <div className="flex gap-2">
          <Button size="sm" loading={pending === "yes"} onClick={() => respond(true)}>
            {t("introduce.yes")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={pending === "no"}
            onClick={() => respond(false)}
          >
            {t("introduce.no")}
          </Button>
        </div>
      </div>

      {introduction.note && (
        <p className="mt-3 rounded-[var(--radius-control)] bg-surface-sunken px-3.5 py-2.5 text-sm text-ink-soft">
          {introduction.note}
        </p>
      )}
    </div>
  );
}
