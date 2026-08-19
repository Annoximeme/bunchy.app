import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Bootstraps staff access.
 *
 *   npm run role -- someone@example.com ADMIN
 *
 * There is deliberately no in-app way to create the *first* admin, a
 * self-service "make me an admin" path is a privilege-escalation bug waiting to
 * happen. Granting the first one requires database access, which means it
 * requires someone who already controls the deployment.
 *
 * Once one admin exists, further roles are granted through the dashboard, where
 * they are audited.
 */

const ROLES = ["MEMBER", "MODERATOR", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

function usage(message: string): never {
  console.error(`${message}\n\nUsage: npm run role -- <email> <${ROLES.join("|")}>`);
  process.exit(1);
}

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email) usage("Missing email.");
  if (!role || !ROLES.includes(role as Role)) {
    usage(`Missing or unknown role: ${role ?? "(none)"}`);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    console.error(`No account with that email: ${email}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  if (user.role === role) {
    console.info(`${user.email} is already ${role}.`);
    await prisma.$disconnect();
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: role as Role },
  });

  // A privilege change must not wait for a natural logout to take effect.
  const { count } = await prisma.session.deleteMany({ where: { userId: user.id } });

  await prisma.moderationEvent.create({
    data: {
      action: "USER_ROLE_CHANGED",
      actorUserId: null,
      actorLabel: "CLI (scripts/grant-role.ts)",
      targetType: "USER",
      targetId: user.id,
      reason: "Granted from the command line",
      metadata: { from: user.role, to: role },
    },
  });

  console.info(
    `${user.email}: ${user.role} -> ${role}. ${count} session(s) revoked; they must sign in again.`,
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
