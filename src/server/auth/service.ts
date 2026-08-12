import { randomBytes } from "node:crypto";
import { db } from "@/server/db/client";
import { conflict, notFound, unauthorized, validationFailed } from "@/server/errors";
import { hashPassword, needsRehash, verifyPassword } from "@/server/auth/password";
import { hashToken, issueToken } from "@/server/auth/tokens";
import {
  createSession,
  revokeAllSessionsForUser,
  type SessionContext,
} from "@/server/auth/session";
import { sendEmail } from "@/server/email";
import { env } from "@/server/env";
import { NOTIFICATION_DEFAULTS } from "@/server/modules/notifications/defaults";
import { resolveReferrer } from "@/server/modules/profile/referrals";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Builds a unique, URL-safe starting username. Onboarding lets people change
 * it; this only has to be unique and not embarrassing.
 */
async function generateUsername(email: string): Promise<string> {
  const base =
    normalizeEmail(email)
      .split("@")[0]
      ?.replace(/[^a-z0-9]+/g, "")
      .slice(0, 16) || "member";

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = randomBytes(2).toString("hex");
    const candidate = `${base}-${suffix}`;
    const taken = await db.profile.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  return `member-${randomBytes(6).toString("hex")}`;
}

export interface SignUpInput {
  /** Invite code from a personal link. Ignored if it doesn't resolve. */
  referralCode?: string;
  email: string;
  password: string;
}

export async function signUp(input: SignUpInput, context: SessionContext = {}) {
  const email = normalizeEmail(input.email);

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    throw conflict("An account with that email already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  const username = await generateUsername(email);
  // Unresolvable codes are dropped, never rejected — losing the attribution is
  // a rounding error, blocking a signup over a mistyped link is not.
  const referredById = await resolveReferrer(input.referralCode);

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      profile: {
        create: {
          username,
          displayName: username,
          referredById,
          privacy: { create: {} },
          notificationPreferences: {
            create: NOTIFICATION_DEFAULTS.map((d) => ({
              type: d.type,
              inApp: d.inApp,
              email: d.email,
            })),
          },
        },
      },
    },
    select: { id: true, email: true, profile: { select: { id: true } } },
  });

  await sendVerificationEmail(user.id, user.email);
  track({
    name: ANALYTICS_EVENTS.ACCOUNT_CREATED,
    profileId: user.profile?.id ?? null,
  });
  const session = await createSession(user.id, context);

  return {
    userId: user.id,
    profileId: user.profile?.id ?? null,
    session,
  };
}

export interface SignInInput {
  email: string;
  password: string;
}

export async function signIn(input: SignInInput, context: SessionContext = {}) {
  const email = normalizeEmail(input.email);
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      status: true,
      suspendedUntil: true,
      profile: { select: { id: true, onboardingStage: true } },
    },
  });

  // Same error and comparable timing whether the account is missing or the
  // password is wrong, so this endpoint cannot be used to enumerate members.
  const invalid = unauthorized("That email or password is not right.");

  if (!user?.passwordHash) {
    await hashPassword(input.password);
    throw invalid;
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw invalid;

  if (user.status === "BANNED") {
    throw unauthorized("This account has been closed.");
  }
  if (user.status === "SUSPENDED") {
    // A timed suspension that has run out lifts on the next sign-in rather than
    // waiting for a scheduled job.
    const expired =
      user.suspendedUntil !== null &&
      user.suspendedUntil.getTime() <= Date.now();
    if (!expired) {
      throw unauthorized(
        user.suspendedUntil
          ? `This account is suspended until ${user.suspendedUntil.toDateString()}.`
          : "This account is suspended. Contact support.",
      );
    }
    await db.user.update({
      where: { id: user.id },
      data: { status: "ACTIVE", suspendedUntil: null },
    });
  }
  if (user.status === "DEACTIVATED") {
    await db.user.update({
      where: { id: user.id },
      data: { status: "ACTIVE" },
    });
  }

  if (needsRehash(user.passwordHash)) {
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.password) },
    });
  }

  const session = await createSession(user.id, context);
  return {
    userId: user.id,
    profileId: user.profile?.id ?? null,
    onboardingStage: user.profile?.onboardingStage ?? "BASICS",
    session,
  };
}

// --- Email verification ----------------------------------------------------

export async function sendVerificationEmail(userId: string, email: string) {
  const { token, hash } = issueToken();

  await db.verificationToken.create({
    data: {
      userId,
      purpose: "EMAIL_VERIFICATION",
      tokenHash: hash,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    },
  });

  const link = `${env().APP_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Confirm your email for Bunchy",
    text: `Welcome to Bunchy.\n\nConfirm your email to finish setting up your account:\n\n${link}\n\nThis link expires in 24 hours. If you didn't sign up, you can ignore this message.`,
  });
}

export async function verifyEmail(token: string): Promise<void> {
  const record = await db.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      purpose: true,
      expiresAt: true,
      consumedAt: true,
    },
  });

  if (
    !record ||
    record.purpose !== "EMAIL_VERIFICATION" ||
    record.consumedAt ||
    record.expiresAt.getTime() <= Date.now()
  ) {
    throw validationFailed("That confirmation link is invalid or has expired.");
  }

  await db.$transaction([
    db.verificationToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  const profile = await db.profile.findUnique({
    where: { userId: record.userId },
    select: { id: true },
  });
  track({ name: ANALYTICS_EVENTS.EMAIL_VERIFIED, profileId: profile?.id ?? null });
}

// --- Password reset --------------------------------------------------------

/**
 * Always resolves successfully, whether or not the address exists. Anything
 * else turns this endpoint into a membership oracle.
 */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) return;

  const { token, hash } = issueToken();
  await db.verificationToken.create({
    data: {
      userId: user.id,
      purpose: "PASSWORD_RESET",
      tokenHash: hash,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  const link = `${env().APP_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your Bunchy password",
    text: `Someone asked to reset the password for this account.\n\n${link}\n\nThis link expires in one hour. If it wasn't you, nothing has changed and you can ignore this message.`,
  });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const record = await db.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      purpose: true,
      expiresAt: true,
      consumedAt: true,
    },
  });

  if (
    !record ||
    record.purpose !== "PASSWORD_RESET" ||
    record.consumedAt ||
    record.expiresAt.getTime() <= Date.now()
  ) {
    throw validationFailed("That reset link is invalid or has expired.");
  }

  const passwordHash = await hashPassword(newPassword);

  await db.$transaction([
    db.verificationToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
  ]);

  // A reset is the recovery path from a compromise: drop every live session.
  await revokeAllSessionsForUser(record.userId);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  keepSessionId?: string,
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw notFound("Account not found.");
  if (!user.passwordHash) {
    throw validationFailed("This account signs in with a connected provider.");
  }

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw validationFailed("Your current password is not right.");

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  await revokeAllSessionsForUser(userId, keepSessionId);
}
