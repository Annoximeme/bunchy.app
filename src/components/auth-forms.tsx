"use client";

import { Link, useLocaleRouter, useTranslate } from "@/components/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice, Field, Input } from "@/components/ui";
import { FormError, useFormSubmit } from "@/components/form-state";

/**
 * Auth forms.
 *
 * Every one of these handles the same four states explicitly, idle,
 * submitting, field-level error, request error, because the moment someone
 * cannot get into their account is the moment a vague "something went wrong"
 * costs you a member.
 */

export function SignUpForm() {
  const router = useLocaleRouter();
  const t = useTranslate();
  // From a personal invite link (/signup?ref=CODE). Read here rather than kept
  // in a cookie: an invite should not follow someone around the internet.
  const referralCode = useSearchParams().get("ref") ?? undefined;

  const form = useFormSubmit(async (event) => {
    const data = new FormData(event.currentTarget);
    const result = await api<{ next: string }>("/api/auth/signup", {
      method: "POST",
      json: {
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
        ...(referralCode ? { referralCode } : {}),
      },
    });
    router.push(result.next);
    router.refresh();
  });

  return (
    /*
      Not a boxed auth card. The heading carries the same argument as the
      landing page, so the page it leads into should not suddenly look like a
      settings dialog. Squircle and ambient shadow instead of a bordered panel,
      and the headline is the size of a statement rather than a form label.

      The form itself already asked for the minimum: two fields, and the
      interests, personality, goals and availability questions all live behind
      the door rather than in front of it. That was the existing design and it
      is what the copy below is describing.
    */
    <div className="rounded-squircle bg-surface p-8 shadow-pebble">
      <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink">
        {t("auth.signUpTitle")}
      </h1>
      <p className="mt-3 leading-relaxed text-ink-soft">
        {referralCode ? `${t("auth.signUpInvited")} ${t("auth.signUpBody")}` : t("auth.signUpBody")}
      </p>

      <form onSubmit={form.onSubmit} className="mt-6 space-y-4">
        <FormError state={form} />

        <Field label={t("auth.email")} htmlFor="email" error={form.fields.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </Field>

        <Field
          label={t("auth.password")}
          htmlFor="password"
          hint={t("auth.passwordHint")}
          error={form.fields.password}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </Field>

        <Button type="submit" loading={form.pending} className="w-full" size="lg">
          {t("auth.createAccount")}
        </Button>
      </form>

      {/*
        Lives here rather than in the shared auth footer, where it used to greet
        people on Sign in and Reset your password too, neither of which is
        joining anything.
      */}
      <p className="mt-5 text-center text-xs text-muted">
        {t("auth.termsBefore")}{" "}
        <Link
          href="/terms"
          className="text-accent-ink underline underline-offset-2"
        >
          {t("auth.terms")}
        </Link>{" "}
        {t("auth.termsAnd")}{" "}
        <Link
          href="/privacy"
          className="text-accent-ink underline underline-offset-2"
        >
          {t("auth.privacy")}
        </Link>
        .
      </p>

      <p className="mt-4 border-t border-line pt-4 text-center text-sm text-muted">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-accent-ink underline underline-offset-2">
          {t("auth.signIn")}
        </Link>
      </p>
    </div>
  );
}

export function SignInForm() {
  const router = useLocaleRouter();
  const t = useTranslate();
  const form = useFormSubmit(async (event) => {
    const data = new FormData(event.currentTarget);
    const result = await api<{ next: string }>("/api/auth/login", {
      method: "POST",
      json: {
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      },
    });
    router.push(result.next);
    router.refresh();
  });

  return (
    <div className="card-surface p-7">
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.welcomeBack")}</h1>

      <form onSubmit={form.onSubmit} className="mt-6 space-y-4">
        <FormError state={form} />

        <Field label={t("auth.email")} htmlFor="email" error={form.fields.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>

        <Field label={t("auth.password")} htmlFor="password" error={form.fields.password}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>

        <Button type="submit" loading={form.pending} className="w-full" size="lg">
          {t("auth.signIn")}
        </Button>
      </form>

      <div className="mt-5 space-y-2 text-center text-sm text-muted">
        <p>
          <Link
            href="/forgot-password"
            className="font-medium text-accent-ink underline underline-offset-2"
          >
            {t("auth.forgot")}
          </Link>
        </p>
        <p>
          {t("auth.newHere")}{" "}
          <Link href="/signup" className="font-medium text-accent-ink underline underline-offset-2">
            {t("auth.createOne")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslate();
  const [sent, setSent] = useState(false);
  const form = useFormSubmit(async (event) => {
    const data = new FormData(event.currentTarget);
    await api("/api/auth/password", {
      method: "POST",
      json: { email: String(data.get("email") ?? "") },
    });
    setSent(true);
  });

  if (sent) {
    return (
      <div className="card-surface p-7">
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.checkEmail")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("auth.checkEmailBody")}</p>
        <p className="mt-5 text-sm text-muted">
          <Link href="/login" className="font-medium text-accent-ink underline underline-offset-2">
            {t("auth.backToSignIn")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card-surface p-7">
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.resetTitle")}</h1>
      <p className="mt-1.5 text-sm text-muted">{t("auth.resetBody")}</p>

      <form onSubmit={form.onSubmit} className="mt-6 space-y-4">
        <FormError state={form} />
        <Field label={t("auth.email")} htmlFor="email" error={form.fields.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Button type="submit" loading={form.pending} className="w-full" size="lg">
          {t("auth.sendResetLink")}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-accent-ink underline underline-offset-2">
          {t("auth.backToSignIn")}
        </Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useLocaleRouter();
  const t = useTranslate();
  const [done, setDone] = useState(false);
  const form = useFormSubmit(async (event) => {
    const data = new FormData(event.currentTarget);
    await api("/api/auth/password", {
      method: "PUT",
      json: { token, password: String(data.get("password") ?? "") },
    });
    setDone(true);
    setTimeout(() => router.push("/login"), 1800);
  });

  if (!token) {
    return (
      <div className="card-surface p-7">
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.linkNotValid")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("auth.linkNotValidBody")}</p>
        <p className="mt-5 text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-accent-ink underline underline-offset-2"
          >
            {t("auth.requestNewLink")}
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card-surface p-7">
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.passwordUpdated")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("auth.passwordUpdatedBody")}</p>
      </div>
    );
  }

  return (
    <div className="card-surface p-7">
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.chooseNewPassword")}</h1>

      <form onSubmit={form.onSubmit} className="mt-6 space-y-4">
        <FormError state={form} />
        <Field
          label={t("auth.newPassword")}
          htmlFor="password"
          hint={t("auth.newPasswordHint")}
          error={form.fields.password}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </Field>
        <Button type="submit" loading={form.pending} className="w-full" size="lg">
          {t("auth.updatePassword")}
        </Button>
      </form>
    </div>
  );
}

export function VerifyEmailPanel({ token }: { token: string }) {
  const t = useTranslate();
  const [state, setState] = useState<"idle" | "working" | "done" | "failed">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function verify() {
    setState("working");
    try {
      await api("/api/auth/verify-email", { method: "POST", json: { token } });
      setState("done");
    } catch (cause) {
      setMessage(errorMessage(cause));
      setState("failed");
    }
  }

  if (!token) {
    return (
      <div className="card-surface p-7">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("auth.confirmMissing")}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">{t("auth.confirmMissingBody")}</p>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="card-surface p-7">
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.emailConfirmed")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("auth.allSet")}</p>
        <div className="mt-5">
          <Link href="/discover" className="font-medium text-accent-ink underline underline-offset-2">
            {t("auth.goToDiscover")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface p-7">
      <h1 className="text-2xl font-semibold tracking-tight">{t("auth.confirmTitle")}</h1>
      <p className="mt-2 text-sm text-ink-soft">{t("auth.confirmBody")}</p>
      {state === "failed" && message && (
        <div className="mt-4">
          <ErrorNotice message={message} />
        </div>
      )}
      <Button
        onClick={verify}
        loading={state === "working"}
        className="mt-5 w-full"
        size="lg"
      >
        {t("auth.confirmCta")}
      </Button>
    </div>
  );
}
