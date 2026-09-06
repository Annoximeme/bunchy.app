"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { useLanguage } from "@/components/link";
import { Button, ErrorNotice } from "@/components/ui";

/**
 * What a member sees when their bunch has stopped.
 *
 * ## Why it says the group ended rather than that the members went quiet
 *
 * Every word here is about the bunch. Not "you haven't posted since August",
 * not a count of anybody's silence, not a suggestion to say hello. A group
 * running its course is an ordinary thing that happens to good groups, and the
 * only useful thing the product can do about it is be honest and hold the door
 * open.
 *
 * ## Why the two buttons are separate
 *
 * Putting your hand up for another group does not close this one, and closing
 * this one does not sign you up for another. Somebody can easily want the
 * first and not the second, and being made to choose one action that does both
 * is how a member ends up doing neither.
 */
export function QuietBunch({
  bunchId,
  looking,
}: {
  bunchId: string;
  /** Whether this member has already asked to be put in front of a new group. */
  looking: boolean;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function act(action: string) {
    setPending(action);
    setError(null);
    try {
      await api(`/api/bunches/${bunchId}/quiet`, {
        method: "POST",
        json: { action },
      });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="card-surface p-5">
      {error && <ErrorNotice message={error} />}

      <h2 className="font-semibold tracking-tight">{t("quiet.title")}</h2>
      <p className="mt-1 text-sm text-ink-soft">{t("quiet.body")}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        {looking ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-positive">{t("quiet.handUp")}</p>
            <button
              type="button"
              disabled={pending === "not_looking"}
              onClick={() => act("not_looking")}
              className="text-xs text-muted underline underline-offset-2 hover:text-ink disabled:opacity-60"
            >
              {t("quiet.handDown")}
            </button>
          </div>
        ) : (
          <Button
            size="sm"
            loading={pending === "looking"}
            onClick={() => act("looking")}
          >
            {t("quiet.findAnother")}
          </Button>
        )}

        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-soft">{t("quiet.sure")}</span>
            <Button
              size="sm"
              variant="danger"
              loading={pending === "close"}
              onClick={() => act("close")}
            >
              {t("quiet.closeIt")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            {t("quiet.close")}
          </Button>
        )}
      </div>
    </section>
  );
}
