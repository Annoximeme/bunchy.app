"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { Button, ErrorNotice, Field, Input } from "@/components/ui";

/**
 * Auth forms.
 *
 * Every one of these handles the same four states explicitly — idle,
 * submitting, field-level error, request error — because the moment someone
 * cannot get into their account is the moment a vague "something went wrong"
 * costs you a member.
 */

function useSubmit<T>(action: (event: FormEvent<HTMLFormElement>) => Promise<T>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await action(event);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return { pending, error, onSubmit, setError };
}

export function SignUpForm() {
  const router = useRouter();
  const { pending, error, onSubmit } = useSubmit(async (event) => {
    const data = new FormData(event.currentTarget);
    const result = await api<{ next: string }>("/api/auth/signup", {
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
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted">
        Two fields now. The interesting questions come next.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && <ErrorNotice message={error} />}

        <Field label="Email" htmlFor="email">
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
          label="Password"
          htmlFor="password"
          hint="At least 10 characters. Length matters more than symbols."
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

        <Button type="submit" loading={pending} className="w-full" size="lg">
          Create account
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent-ink hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function SignInForm() {
  const router = useRouter();
  const { pending, error, onSubmit } = useSubmit(async (event) => {
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
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && <ErrorNotice message={error} />}

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>

        <Button type="submit" loading={pending} className="w-full" size="lg">
          Sign in
        </Button>
      </form>

      <div className="mt-5 space-y-2 text-center text-sm text-muted">
        <p>
          <Link
            href="/forgot-password"
            className="font-medium text-accent-ink hover:underline"
          >
            Forgot your password?
          </Link>
        </p>
        <p>
          New here?{" "}
          <Link href="/signup" className="font-medium text-accent-ink hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const { pending, error, onSubmit } = useSubmit(async (event) => {
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
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="mt-2 text-sm text-ink-soft">
          If that address has an account, a reset link is on its way. It expires
          in an hour.
        </p>
        <p className="mt-5 text-sm text-muted">
          <Link href="/login" className="font-medium text-accent-ink hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card-surface p-7">
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1.5 text-sm text-muted">
        We&rsquo;ll email you a link to set a new one.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && <ErrorNotice message={error} />}
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Button type="submit" loading={pending} className="w-full" size="lg">
          Send reset link
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-accent-ink hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const { pending, error, onSubmit } = useSubmit(async (event) => {
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
        <h1 className="text-2xl font-semibold tracking-tight">Link not valid</h1>
        <p className="mt-2 text-sm text-ink-soft">
          That reset link is missing or malformed. Request a new one.
        </p>
        <p className="mt-5 text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-accent-ink hover:underline"
          >
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card-surface p-7">
        <h1 className="text-2xl font-semibold tracking-tight">Password updated</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Every other device has been signed out. Taking you to sign in…
        </p>
      </div>
    );
  }

  return (
    <div className="card-surface p-7">
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && <ErrorNotice message={error} />}
        <Field
          label="New password"
          htmlFor="password"
          hint="At least 10 characters."
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
        <Button type="submit" loading={pending} className="w-full" size="lg">
          Update password
        </Button>
      </form>
    </div>
  );
}

export function VerifyEmailPanel({ token }: { token: string }) {
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
          Confirmation link missing
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Open the link from your email, or request a new one from your profile.
        </p>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="card-surface p-7">
        <h1 className="text-2xl font-semibold tracking-tight">Email confirmed</h1>
        <p className="mt-2 text-sm text-ink-soft">You&rsquo;re all set.</p>
        <div className="mt-5">
          <Link href="/discover" className="font-medium text-accent-ink hover:underline">
            Go to Discover
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface p-7">
      <h1 className="text-2xl font-semibold tracking-tight">Confirm your email</h1>
      <p className="mt-2 text-sm text-ink-soft">
        One tap and your account is verified.
      </p>
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
        Confirm email
      </Button>
    </div>
  );
}
