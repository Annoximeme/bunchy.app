"use client";

import { useCallback, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { errorMessage, fieldErrors } from "@/lib/api";
import { ErrorNotice } from "@/components/ui";

/**
 * The four states every form in this product has, in one place.
 *
 * Idle, submitting, a request error, and now a per-field error, which the
 * server has always sent and the client used to discard. Each form previously
 * kept its own `pending`/`error` pair and its own try/catch, which was fine
 * until the fix for "which field was wrong?" and "where did my focus go?" had
 * to be applied five times over.
 *
 * ## Focus
 *
 * When a submit fails, focus is sitting on the submit button, and the thing
 * that just changed is somewhere above it. A sighted person's eye jumps there;
 * a keyboard or screen reader user gets nothing but a `role="alert"` reading
 * out with no way to reach what it is describing except by shift-tabbing past
 * every field.
 *
 * So focus moves. It moves to the first field the server named, because that
 * is the actionable place, and only falls back to the summary notice when the
 * failure was not about a particular field ("that email is already in use",
 * a network drop). Deliberately not the notice in both cases: `role="alert"`
 * already announces it, and focusing it as well makes some screen readers say
 * it twice.
 */
export interface FormState {
  pending: boolean;
  /** The whole-form message, if any. */
  error: string | null;
  /** Server-reported errors keyed by field name; hand straight to `Field`. */
  fields: Record<string, string>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** For a failure the form works out itself, before it calls the server. */
  fail: (message: string) => void;
  clear: () => void;
  /** The id `<FormError />` puts on its wrapper, so focus can find it. */
  noticeId: string;
}

export function useFormSubmit(
  action: (event: FormEvent<HTMLFormElement>) => Promise<void>,
): FormState {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const noticeId = useId();
  const formRef = useRef<HTMLFormElement | null>(null);

  const focusFailure = useCallback((named: Record<string, string>) => {
    // After the state update paints. `requestAnimationFrame` rather than a
    // timeout because the target only exists once React has rendered the error.
    requestAnimationFrame(() => {
      const first = Object.keys(named)[0];
      const control =
        first && formRef.current
          ? (formRef.current.querySelector<HTMLElement>(
              `#${CSS.escape(first)}, [name="${CSS.escape(first)}"]`,
            ) ?? null)
          : null;
      (control ?? document.getElementById(noticeId))?.focus();
    });
  }, [noticeId]);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      formRef.current = event.currentTarget;
      setPending(true);
      setError(null);
      setFields({});
      try {
        await action(event);
      } catch (cause) {
        const named = fieldErrors(cause);
        setFields(named);
        setError(errorMessage(cause));
        focusFailure(named);
      } finally {
        setPending(false);
      }
    },
    [action, focusFailure],
  );

  const fail = useCallback(
    (message: string) => {
      setError(message);
      setFields({});
      focusFailure({});
    },
    [focusFailure],
  );

  const clear = useCallback(() => {
    setError(null);
    setFields({});
  }, []);

  return { pending, error, fields, onSubmit, fail, clear, noticeId };
}

/**
 * The summary notice, focusable so the fallback above has somewhere to land.
 *
 * `tabIndex={-1}` makes it focusable by script without adding a stop to the
 * tab order, which is exactly the distinction that lets focus be *moved* here
 * without anybody having to tab *through* here on the way to the fields.
 */
export function FormError({ state, children }: { state: FormState; children?: ReactNode }) {
  const { error, noticeId } = state;
  if (!error) return null;
  return (
    <div id={noticeId} tabIndex={-1} className="outline-none">
      <ErrorNotice message={error} />
      {children}
    </div>
  );
}
