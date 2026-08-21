import { db } from "@/server/db/client";
import { env } from "@/server/env";
import { isAppError } from "@/server/errors";
import { redeemLinkCode, requireLinked } from "@/server/modules/discord/link";
import { openCalls, createQuickCall } from "@/server/modules/activities/quick";
import { setAvailability } from "@/server/modules/availability/service";
import type { AvailabilityKind } from "@/generated/prisma/enums";

/**
 * What the bot can be asked to do, as plain functions.
 *
 * Deliberately free of discord.js. Everything here takes a Discord id and some
 * strings and returns a string, so the whole command surface is testable
 * without a gateway, a token or a network, and `run-bot.ts` is left holding
 * nothing but the wiring. A command that can only be exercised by talking to
 * Discord is a command nobody tests.
 *
 * ## Every reply is ephemeral, and that is a product decision
 *
 * The caller decides, but these are written on the assumption nobody else sees
 * them. A bot that announces "Sarah is free tonight" into a channel has turned
 * somebody's availability into a broadcast they did not ask for, and this
 * product does not do that anywhere else: Bunchy Now shows counts and never
 * names anyone.
 *
 * ## Errors
 *
 * `AppError` messages are written for members and are safe to show. Anything
 * else is not, so it becomes a flat apology and goes to the log. A stack trace
 * in a public channel is both noise and a disclosure.
 */

export interface CommandContext {
  discordId: string;
  username: string | null;
}

function appUrl(path: string): string {
  return new URL(path, env().APP_URL).toString();
}

async function guard<T>(fn: () => Promise<T>, fallback: string): Promise<T | string> {
  try {
    return await fn();
  } catch (error) {
    if (isAppError(error)) return error.message;
    console.error("[bot] command failed:", error);
    return fallback;
  }
}

/** `/link 123456` */
export async function linkCommand(
  ctx: CommandContext,
  code: string,
): Promise<string> {
  const result = await guard(
    () => redeemLinkCode(code, ctx.discordId, ctx.username),
    "Something went wrong linking that. Try again in a moment.",
  );
  if (typeof result === "string") return result;
  return `Linked to ${result.displayName}. You can use the other commands now.`;
}

/** `/tonight` */
export async function tonightCommand(ctx: CommandContext): Promise<string> {
  const result = await guard(async () => {
    const profile = await requireLinked(ctx.discordId);
    const calls = await openCalls(profile.id, 5);

    if (calls.length === 0) {
      // A path forward rather than "no results", the same rule the empty
      // states on the site follow.
      return `Nothing open right now. ${appUrl("/now")} is where you start one.`;
    }

    const lines = calls.map((call) => {
      const mins = Math.round((call.expiresAt.getTime() - Date.now()) / 60_000);
      const closes = mins < 60 ? `${mins} min` : `${Math.round(mins / 60)} h`;
      return `• **${call.title}** — ${call.going} going, closes in ${closes}`;
    });

    return [`Open right now:`, ...lines, appUrl("/now")].join("\n");
  }, "Could not read what is on. Try again in a moment.");

  return typeof result === "string" ? result : String(result);
}

const UP_FOR: Record<string, AvailabilityKind> = {
  gaming: "UP_FOR_GAMING",
  something: "LOOKING_FOR_SOMETHING",
  people: "LOOKING_FOR_PEOPLE",
  tonight: "FREE_TONIGHT",
  now: "FREE_NOW",
};

export const UP_FOR_CHOICES = Object.keys(UP_FOR);

/** `/up-for gaming` */
export async function upForCommand(
  ctx: CommandContext,
  what: string,
): Promise<string> {
  const kind = UP_FOR[what];
  if (!kind) {
    return `I do not know "${what}". Try one of: ${UP_FOR_CHOICES.join(", ")}.`;
  }

  const result = await guard(async () => {
    const profile = await requireLinked(ctx.discordId);
    await setAvailability(profile.id, { kind, expiresInHours: 4, mode: "ONLINE" });
    // Never announced. This is the same status Bunchy Now shows as a count
    // without naming anybody, and routing it through Discord must not turn it
    // into a broadcast.
    return `Set. You are up for ${what} for the next four hours. Nobody is told; it shows as a count.`;
  }, "Could not set that. Try again in a moment.");

  return typeof result === "string" ? result : String(result);
}

/** `/call Anyone up for Helldivers?` */
export async function callCommand(
  ctx: CommandContext,
  title: string,
  hours = 3,
): Promise<string> {
  const result = await guard(async () => {
    const profile = await requireLinked(ctx.discordId);
    const call = await createQuickCall(profile.id, {
      title,
      windowMinutes: Math.round(hours * 60),
      mode: "ONLINE",
    });
    return `Posted. It closes in ${hours} hours: ${appUrl(`/activities/${call.id}`)}`;
  }, "Could not post that. Try again in a moment.");

  return typeof result === "string" ? result : String(result);
}

/**
 * Calls worth announcing in a channel, and the rules that stop it being a feed.
 *
 * Three of them, and each removes a different way this goes wrong.
 *
 * Only calls with room, because announcing a full one is noise nobody can act
 * on. Only calls made in the last few minutes, so a restart of the bot does not
 * replay the afternoon into the channel. And nothing from a call inside a
 * private bunch, because that is a group's own business and Discord is a
 * different room with different people in it.
 *
 * The caller is expected to remember what it has posted. This returns
 * candidates; it does not decide twice.
 */
export async function announceable(
  since: Date,
  now = new Date(),
): Promise<
  Array<{ id: string; title: string; going: number; spotsLeft: number; url: string }>
> {
  const rows = await db.activity.findMany({
    where: {
      status: "SCHEDULED",
      expiresAt: { not: null, gt: now },
      createdAt: { gt: since },
      // A private group's plans are not the Discord's business.
      OR: [{ bunchId: null }, { bunch: { visibility: "PUBLIC" } }],
    },
    orderBy: { createdAt: "asc" },
    take: 5,
    select: {
      id: true,
      title: true,
      maxParticipants: true,
      _count: { select: { participants: true } },
    },
  });

  return rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      going: row._count.participants,
      spotsLeft: row.maxParticipants - row._count.participants,
      url: appUrl(`/activities/${row.id}`),
    }))
    .filter((row) => row.spotsLeft > 0);
}
