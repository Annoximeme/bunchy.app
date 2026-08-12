"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, Card, ErrorNotice, Field, Input } from "@/components/ui";

/**
 * Your data: take it, or take it away.
 *
 * Both controls sit in one place and neither is buried. Deletion is not hidden
 * behind three screens of "are you sure?", and it is not softened into
 * "deactivate" — the member said delete, so the word on the button is Delete.
 *
 * Equally, nothing here tries to talk them out of it. No "you'll lose your 4
 * connections", no offer of a pause instead. The confirmation exists to prevent
 * an accident, not to change a mind.
 */
export function AccountData() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/account", {
        method: "DELETE",
        json: { password, confirm },
      });
      // Full reload rather than a client transition: every cached server
      // component on this session refers to an account that no longer exists.
      window.location.href = "/";
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold tracking-tight">Your data</h2>
      <p className="mt-1 text-sm text-muted">
        It&rsquo;s yours. Take a copy whenever you like, or take it away for good.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a
          href="/api/account/export"
          download
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-all duration-200 hover:border-ink-soft hover:bg-surface-sunken"
        >
          Download my data
        </a>
        <span className="text-sm text-muted">
          One JSON file, everything we hold, straight away.
        </span>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        {!open ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
              Delete my account
            </Button>
            <span className="text-sm text-muted">
              Immediate and permanent. There is no recovery window.
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold tracking-tight">
                Delete your account
              </h3>
              <p className="mt-1.5 max-w-prose text-sm text-ink-soft">
                Your profile, messages, connections and activity are erased now,
                not in thirty days. Anything you wrote in a bunch stays in that
                bunch with your name removed, so the group&rsquo;s conversation
                still makes sense. If you organised something that hasn&rsquo;t
                happened yet, everyone going is told it&rsquo;s off. Reports you
                filed stay with our moderators, without your name.
              </p>
            </div>

            {error && <ErrorNotice message={error} />}

            <div className="grid gap-3 sm:max-w-sm">
              <Field label="Your password" htmlFor="delete-password">
                <Input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field label="Type DELETE to confirm" htmlFor="delete-confirm">
                <Input
                  id="delete-confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="danger"
                loading={busy}
                disabled={confirm !== "DELETE" || password.length === 0}
                onClick={remove}
              >
                Delete my account
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  setPassword("");
                  setConfirm("");
                  setError(null);
                  router.refresh();
                }}
              >
                Keep my account
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
