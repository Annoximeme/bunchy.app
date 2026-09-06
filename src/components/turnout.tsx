"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useLanguage } from "@/components/link";
import { Button, ErrorNotice } from "@/components/ui";

/**
 * Confirming a seat, opening the door, and tapping in at it.
 *
 * ## Why a member sees at most one of these at a time
 *
 * They are three moments in order, and only one of them is ever now: the day
 * before, the minute the host arrives, and the hour everybody is there. A
 * screen showing all three is a screen asking somebody to work out which one
 * applies to them, which is work the page can do itself.
 *
 * ## Why the count is a count
 *
 * The host sees how many people are in the room, and that is all. Not who is
 * missing, not who has been late before, not a percentage. `hosting.ts` is
 * right that a number about a person is a number somebody will treat as proof,
 * and the useful fact at the door is simply whether to start.
 */
export function Turnout({
  activityId,
  startsAt,
  status,
  viewerStatus,
  viewerIsOrganizer,
  confirmationAsked,
  viewerConfirmed,
  checkInOpen,
  viewerCheckedIn,
  checkedInCount,
  memberCount,
  now = new Date(),
}: {
  activityId: string;
  startsAt: string;
  status: string;
  viewerStatus: string | null;
  viewerIsOrganizer: boolean;
  confirmationAsked: boolean;
  viewerConfirmed: boolean;
  checkInOpen: boolean;
  viewerCheckedIn: boolean;
  checkedInCount: number;
  memberCount: number;
  /**
   * Taken as a prop, defaulted here, the same way `YourWeek` does it. Reading
   * the clock during a render is impure, and a component whose output depends
   * on an unnamed global is a component that cannot be tested at half past
   * five in the evening.
   */
  now?: Date;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const going = viewerStatus === "JOINED";
  const start = new Date(startsAt).getTime();
  const at = now.getTime();
  // The host can open the door from two hours before, which is what the
  // service allows; showing the button earlier would be offering something
  // that answers with a refusal.
  const nearlyTime = at >= start - 2 * 3_600_000;
  const over = at > start + 6 * 3_600_000;

  if (status === "CANCELLED" || over) return null;

  async function act(action: string) {
    setPending(action);
    setError(null);
    try {
      await api(`/api/activities/${activityId}/turnout`, {
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

  const showConfirm = going && !viewerIsOrganizer && confirmationAsked && !viewerConfirmed && !checkInOpen;
  const showOpen = viewerIsOrganizer && nearlyTime && !checkInOpen;
  const showCheckIn = going && !viewerIsOrganizer && checkInOpen && !viewerCheckedIn;

  if (!showConfirm && !showOpen && !showCheckIn && !checkInOpen) return null;

  return (
    <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface-sunken px-4 py-3.5">
      {error && <ErrorNotice message={error} />}

      {showConfirm && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{t("turnout.stillComing")}</p>
            <p className="mt-0.5 text-sm text-muted">{t("turnout.stillComingWhy")}</p>
          </div>
          <Button size="sm" loading={pending === "confirm"} onClick={() => act("confirm")}>
            {t("turnout.confirmSeat")}
          </Button>
        </div>
      )}

      {showOpen && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{t("turnout.openDoor")}</p>
            <p className="mt-0.5 text-sm text-muted">{t("turnout.openDoorWhy")}</p>
          </div>
          <Button
            size="sm"
            loading={pending === "open_check_in"}
            onClick={() => act("open_check_in")}
          >
            {t("turnout.openCheckIn")}
          </Button>
        </div>
      )}

      {showCheckIn && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">{t("turnout.doorOpen")}</p>
          <Button
            size="sm"
            loading={pending === "check_in"}
            onClick={() => act("check_in")}
          >
            {t("turnout.here")}
          </Button>
        </div>
      )}

      {checkInOpen && (
        <p className={showConfirm || showOpen || showCheckIn ? "mt-3 text-sm text-muted" : "text-sm text-muted"}>
          {t("turnout.hereCount", { count: checkedInCount, of: memberCount })}
        </p>
      )}
    </div>
  );
}
