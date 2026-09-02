"use client";

import { Link, useLocaleRouter, useTranslate } from "@/components/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice, Field, Input, cn } from "@/components/ui";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { FormError, useFormSubmit } from "@/components/form-state";

/**
 * Auth forms.
 *
 * Every one of these handles the same four states explicitly, idle,
 * submitting, field-level error, request error, because the moment someone
 * cannot get into their account is the moment a vague "something went wrong"
 * costs you a member.
 */

/**
 * The card every one of these forms is drawn on.
 *
 * Sign in and sign up had drifted into two different objects, a squircle with
 * an ambient shadow on one and a bordered, tighter-cornered panel on the other,
 * and the password flow you reach from the sign-in card was a third. Somebody
 * clicking "Forgot your password?" watched the card change shape under them.
 * One shell, one heading scale, so the whole way in is a single surface with
 * different words on it.
 */
function AuthCard({ children }: { children: ReactNode }) {
  return <div className="rounded-squircle bg-surface p-8 shadow-pebble">{children}</div>;
}

function AuthTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink">
      {children}
    </h1>
  );
}

/** The line under the title. Reading size, because it is there to be read. */
function AuthBody({ children }: { children: ReactNode }) {
  return <p className="mt-3 leading-relaxed text-ink-soft">{children}</p>;
}

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
    <AuthCard>
      <AuthTitle>
        {t("auth.signUpTitle")}
      </AuthTitle>
      <AuthBody>
        {referralCode
          ? `${t("auth.signUpInvited")} ${t("auth.signUpBody")}`
          : t("auth.signUpBody")}
      </AuthBody>

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
    </AuthCard>
  );
}

/**
 * A password box you can look at.
 *
 * Signing in fails most often for the dullest reason there is: a typo in a
 * field that shows you nothing. The eye is a plain button inside the box rather
 * than a checkbox under it, so it sits where the mistake is.
 *
 * Every prop is forwarded, including the `aria-describedby` and
 * `aria-invalid` that `Field` clones onto whatever it is given. Field talks to
 * this component, this component talks to the real input, and the error text
 * stays attached to the control it is about.
 */
function PasswordInput({ className, ...props }: ComponentProps<"input">) {
  const t = useTranslate();
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={revealed ? "text" : "password"}
        className={cn("pr-12", className)}
      />
      <button
        type="button"
        onClick={() => setRevealed((current) => !current)}
        aria-label={revealed ? t("auth.hidePassword") : t("auth.showPassword")}
        aria-pressed={revealed}
        className="absolute inset-y-0 right-0 flex items-center px-3.5 text-muted transition-colors duration-200 hover:text-ink"
      >
        {revealed ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
      </button>
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
    /*
      The same object as the sign-up card, which it had drifted away from: a
      tighter radius, less padding, a heading two steps smaller and no line of
      copy under it. Two doors into one building should be built out of the
      same materials, and the one for people who already live here should not
      be the shabbier of the two.
    */
    <AuthCard>
      <AuthTitle>
        {t("auth.welcomeBack")}
      </AuthTitle>
      <AuthBody>{t("auth.signInBody")}</AuthBody>

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
          error={form.fields.password}
          /* Beside the field it is about, rather than in the stack of three
             underlined links this card used to end with. */
          action={
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-accent-ink underline underline-offset-2"
            >
              {t("auth.forgot")}
            </Link>
          }
        >
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </Field>

        <Button type="submit" loading={form.pending} className="w-full" size="lg">
          {t("auth.signIn")}
        </Button>
      </form>

      {/* The hairline and the single quiet line are the sign-up card's ending,
          read in the other direction. */}
      <p className="mt-6 border-t border-line pt-4 text-center text-sm text-muted">
        {t("auth.newHere")}{" "}
        <Link href="/signup" className="font-medium text-accent-ink underline underline-offset-2">
          {t("auth.createOne")}
        </Link>
      </p>
    </AuthCard>
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
      <AuthCard>
        <AuthTitle>{t("auth.checkEmail")}</AuthTitle>
        <AuthBody>{t("auth.checkEmailBody")}</AuthBody>
        <p className="mt-5 text-sm text-muted">
          <Link href="/login" className="font-medium text-accent-ink underline underline-offset-2">
            {t("auth.backToSignIn")}
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <AuthTitle>{t("auth.resetTitle")}</AuthTitle>
      <AuthBody>{t("auth.resetBody")}</AuthBody>

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
        <Button type="submit" loading={form.pending} className="w-full" size="lg">
          {t("auth.sendResetLink")}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-accent-ink underline underline-offset-2">
          {t("auth.backToSignIn")}
        </Link>
      </p>
    </AuthCard>
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
      <AuthCard>
        <AuthTitle>{t("auth.linkNotValid")}</AuthTitle>
        <AuthBody>{t("auth.linkNotValidBody")}</AuthBody>
        <p className="mt-5 text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-accent-ink underline underline-offset-2"
          >
            {t("auth.requestNewLink")}
          </Link>
        </p>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard>
        <AuthTitle>{t("auth.passwordUpdated")}</AuthTitle>
        <AuthBody>{t("auth.passwordUpdatedBody")}</AuthBody>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <AuthTitle>{t("auth.chooseNewPassword")}</AuthTitle>

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
    </AuthCard>
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
      <AuthCard>
        <AuthTitle>
          {t("auth.confirmMissing")}
        </AuthTitle>
        <AuthBody>{t("auth.confirmMissingBody")}</AuthBody>
      </AuthCard>
    );
  }

  if (state === "done") {
    return (
      <AuthCard>
        <AuthTitle>{t("auth.emailConfirmed")}</AuthTitle>
        <AuthBody>{t("auth.allSet")}</AuthBody>
        <div className="mt-5">
          <Link href="/discover" className="font-medium text-accent-ink underline underline-offset-2">
            {t("auth.goToDiscover")}
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <AuthTitle>{t("auth.confirmTitle")}</AuthTitle>
      <AuthBody>{t("auth.confirmBody")}</AuthBody>
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
    </AuthCard>
  );
}
