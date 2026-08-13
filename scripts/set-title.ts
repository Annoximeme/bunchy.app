import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Sets or clears the staff title shown on a profile.
 *
 *   npm run title -- someone@example.com "Founder & Developer of Bunchy"
 *   npm run title -- someone@example.com ""     # clears it
 *
 * Deliberately CLI-only, for the same reason `grant-role.ts` is: a badge
 * rendered from text a member controls is an impersonation surface. "Bunchy
 * Support" in a badge, followed by a direct message asking someone to confirm
 * their password, is the entire attack and it costs nothing to run. Requiring
 * database access means whoever sets a title already controls the deployment.
 *
 * Kept short on purpose — a title is a badge, not a bio.
 */

const MAX_LENGTH = 48;

function usage(message: string): never {
  console.error(`${message}\n\nUsage: npm run title -- <email> "<title>"`);
  process.exit(1);
}

async function main() {
  const [email, rawTitle] = process.argv.slice(2);
  if (!email) usage("Missing email.");
  if (rawTitle === undefined) {
    usage('Missing title. Pass "" to clear it.');
  }

  const title = rawTitle.trim();
  if (title.length > MAX_LENGTH) {
    usage(`Title is ${title.length} characters; the badge holds ${MAX_LENGTH}.`);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, profile: { select: { id: true, title: true } } },
  });

  if (!user) {
    console.error(`No account with that email: ${email}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  if (!user.profile) {
    console.error(
      `${user.email} has no profile yet — the title lives on the profile, which is created during signup.`,
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  await prisma.profile.update({
    where: { id: user.profile.id },
    data: { title: title === "" ? null : title },
  });

  console.info(
    `${user.email}: title ${user.profile.title ? `"${user.profile.title}"` : "(none)"} -> ${
      title === "" ? "(none)" : `"${title}"`
    }`,
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
