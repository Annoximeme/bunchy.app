import { cache } from "react";
import { db } from "@/server/db/client";
import { readSessionToken } from "@/server/auth/cookies";
import { resolveSession } from "@/server/auth/session";
import { unauthorized } from "@/server/errors";
import type { OnboardingStage, UserRole } from "@/generated/prisma/enums";

export interface Viewer {
  sessionId: string;
  userId: string;
  email: string;
  emailVerified: boolean;
  profileId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  onboardingStage: OnboardingStage;
  /** Staff privilege. Never rendered to other members. */
  role: UserRole;
}

/**
 * The signed-in member, or null.
 *
 * Wrapped in React's `cache` so a page that checks auth in the layout, the page
 * and three server components still issues one query per request.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const token = await readSessionToken();
  const session = await resolveSession(token);
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
      role: true,
      profile: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          onboardingStage: true,
        },
      },
    },
  });

  if (!user?.profile) return null;

  return {
    sessionId: session.sessionId,
    userId: user.id,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    profileId: user.profile.id,
    username: user.profile.username,
    displayName: user.profile.displayName,
    avatarUrl: user.profile.avatarUrl,
    onboardingStage: user.profile.onboardingStage,
    role: user.role,
  };
});

/** Throws `unauthorized` instead of returning null. For API routes. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw unauthorized();
  return viewer;
}

/** Touch `lastActiveAt`, used for "active recently" ordering in Discover. */
export async function touchLastActive(profileId: string): Promise<void> {
  await db.profile
    .update({ where: { id: profileId }, data: { lastActiveAt: new Date() } })
    .catch(() => {});
}
