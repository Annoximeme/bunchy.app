"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link, useLanguage } from "@/components/link";
import { api, errorMessage } from "@/lib/api";
import { Button, Card, Chip, ErrorNotice, Textarea } from "@/components/ui";

/**
 * Two bunches at one evening.
 *
 * ## What each person sees
 *
 * A moderator of the bunch hosting the evening sees a way to ask another bunch
 * along, and the three bunches worth asking, worked out only when they press
 * the button. A moderator of a bunch that has been asked sees the question.
 * Everybody else sees a line saying both groups are coming, which is the part
 * that matters to somebody deciding whether to take a seat.
 *
 * ## Why the score is a sentence
 *
 * The pairing is scored on the person most likely to stand at the edge of the
 * room, which is a real number that would be a terrible thing to print. "82%
 * compatible with the Tuesday Lot" invites two groups to compare themselves;
 * "everybody would have somebody to talk to" says the same thing and is the
 * reason to go.
 */

export interface MeetupView {
  id: string;
  status: "PROPOSED" | "ACCEPTED" | "DECLINED" | "WITHDRAWN";
  note: string | null;
  hostBunch: { slug: string; name: string };
  guestBunch: { slug: string; name: string };
  viewerCanRespond: boolean;
  viewerCanWithdraw: boolean;
}

interface Candidate {
  bunchId: string;
  slug: string;
  name: string;
  description: string;
  memberCount: number;
  locationLabel: string | null;
  pairing: { everyoneHasSomeone: number; typical: number; reasons: string[] };
}

export function BunchMeetups({
  activityId,
  meetups: initialMeetups,
  canInvite,
}: {
  activityId: string;
  meetups: MeetupView[];
  /** True when the viewer moderates the bunch whose evening this is. */
  canInvite: boolean;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [meetups, setMeetups] = useState(initialMeetups);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (meetups.length === 0 && !canInvite) return null;

  async function refresh() {
    const fresh = await api<{ meetups: MeetupView[] }>(
      `/api/activities/${activityId}/meetups`,
    );
    setMeetups(fresh.meetups);
    router.refresh();
  }

  async function act(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError(null);
    try {
      await api(`/api/activities/${activityId}/meetups`, {
        method: "POST",
        json: body,
      });
      await refresh();
      setCandidates(null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  async function findCandidates() {
    setBusy("candidates");
    setError(null);
    try {
      const result = await api<{ candidates: Candidate[] }>(
        `/api/activities/${activityId}/meetups?candidates=1`,
      );
      setCandidates(result.candidates);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  const accepted = meetups.filter((meetup) => meetup.status === "ACCEPTED");
  const proposed = meetups.filter((meetup) => meetup.status === "PROPOSED");

  return (
    <Card className="mt-6">
      {error && <ErrorNotice message={error} />}

      <h2 className="text-sm font-semibold">{t("meetup.title")}</h2>

      {accepted.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {accepted.map((meetup) => (
            <li key={meetup.id} className="text-sm text-ink-soft">
              {t("meetup.bothComing", {
                host: meetup.hostBunch.name,
                guest: meetup.guestBunch.name,
              })}{" "}
              <Link
                href={`/bunches/${meetup.guestBunch.slug}`}
                className="text-accent-ink underline underline-offset-2"
              >
                {meetup.guestBunch.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {proposed.map((meetup) => (
        <div
          key={meetup.id}
          className="mt-3 rounded-[var(--radius-control)] bg-surface-sunken px-3.5 py-3"
        >
          <p className="text-sm font-medium">
            {meetup.viewerCanRespond
              ? t("meetup.asked", { host: meetup.hostBunch.name })
              : t("meetup.waiting", { guest: meetup.guestBunch.name })}
          </p>
          {meetup.note && (
            <p className="mt-1 text-sm text-muted">{meetup.note}</p>
          )}

          {meetup.viewerCanRespond && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button
                size="sm"
                loading={busy === `yes-${meetup.id}`}
                onClick={() =>
                  act(
                    { action: "respond", meetupId: meetup.id, accept: true },
                    `yes-${meetup.id}`,
                  )
                }
              >
                {t("meetup.accept")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                loading={busy === `no-${meetup.id}`}
                onClick={() =>
                  act(
                    { action: "respond", meetupId: meetup.id, accept: false },
                    `no-${meetup.id}`,
                  )
                }
              >
                {t("meetup.decline")}
              </Button>
            </div>
          )}

          {meetup.viewerCanWithdraw && (
            <button
              type="button"
              disabled={busy === `withdraw-${meetup.id}`}
              onClick={() =>
                act(
                  { action: "withdraw", meetupId: meetup.id },
                  `withdraw-${meetup.id}`,
                )
              }
              className="mt-2 text-xs text-muted underline underline-offset-2 hover:text-ink disabled:opacity-60"
            >
              {t("meetup.withdraw")}
            </button>
          )}
        </div>
      ))}

      {canInvite && candidates === null && (
        <div className="mt-3">
          <Button
            size="sm"
            variant="secondary"
            loading={busy === "candidates"}
            onClick={findCandidates}
          >
            {t("meetup.findOne")}
          </Button>
          <p className="mt-1.5 text-sm text-muted">{t("meetup.findOneWhy")}</p>
        </div>
      )}

      {canInvite && candidates !== null && (
        <div className="mt-3 space-y-3">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted">{t("meetup.nobodyYet")}</p>
          ) : (
            <>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                maxLength={300}
                placeholder={t("meetup.notePlaceholder")}
                aria-label={t("meetup.note")}
              />
              <ul className="space-y-2">
                {candidates.map((candidate) => (
                  <li
                    key={candidate.bunchId}
                    className="rounded-[var(--radius-control)] bg-surface-sunken px-3.5 py-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link
                        href={`/bunches/${candidate.slug}`}
                        className="font-medium hover:underline"
                      >
                        {candidate.name}
                      </Link>
                      <Chip>
                        {t("meetup.members", { count: candidate.memberCount })}
                      </Chip>
                    </div>
                    {candidate.pairing.reasons.length > 0 && (
                      <p className="mt-1 text-sm text-muted">
                        {candidate.pairing.reasons.join(". ")}.
                      </p>
                    )}
                    <Button
                      size="sm"
                      className="mt-2.5"
                      loading={busy === `invite-${candidate.bunchId}`}
                      onClick={() =>
                        act(
                          {
                            action: "invite",
                            guestBunchId: candidate.bunchId,
                            note: note.trim() || null,
                          },
                          `invite-${candidate.bunchId}`,
                        )
                      }
                    >
                      {t("meetup.askThem")}
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
