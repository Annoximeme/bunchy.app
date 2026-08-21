import { db } from "@/server/db/client";
import { profileForDiscordId } from "@/server/modules/discord/link";
import { setAvailability, clearAvailability } from "@/server/modules/availability/service";

/**
 * Who is actually in a room, rather than who says they are free.
 *
 * Online's answer to "nearby" is "right now", and a voice channel with three
 * people in it is the most joinable thing that can exist in this product. Until
 * now there was no way to say it: Bunchy Now shows who is *available*, which is
 * a promise about the future, not a fact about the present.
 *
 * ## It reuses availability rather than adding a presence table
 *
 * Being in a channel is a short-lived statement that you are around, which is
 * exactly what `Availability` already models, down to the expiry. A second
 * table would have meant a second thing to purge, a second thing for Bunchy Now
 * to merge, and two answers to "is this person about".
 *
 * So joining a channel sets `FREE_NOW` and leaving clears it. The existing
 * count on Bunchy Now then includes them without a line of code changing, and
 * the existing privacy switch that hides somebody from that board hides them
 * from this too, which is the property that matters most here.
 *
 * ## What is deliberately not stored
 *
 * Not which channel, not for how long, and no history. The product needs to
 * know that somebody is around; it does not need a log of where they were. A
 * table of who sat in which voice channel and when is a surveillance record
 * that would have to be explained on the privacy page, and the feature does not
 * need it to work.
 *
 * Unlinked Discord users are ignored entirely. An unlinked account is nobody as
 * far as Bunchy is concerned, and guessing from a username is the trust failure
 * that account linking exists to prevent.
 */

/** Long enough to outlive a reconnect, short enough to be self-correcting. */
const PRESENCE_HOURS = 2;

export interface PresenceResult {
  /** Null when the Discord user is not linked, which is the common case. */
  profileId: string | null;
  action: "joined" | "left" | "ignored";
}

export async function setVoicePresence(
  discordId: string,
  channelId: string | null,
  _channelName: string | null,
): Promise<PresenceResult> {
  const profile = await profileForDiscordId(discordId);
  if (!profile) return { profileId: null, action: "ignored" };

  if (channelId === null) {
    // Left the channel. Clearing rather than letting it expire, so the board
    // is honest within seconds instead of within two hours.
    await clearAvailability(profile.id);
    return { profileId: profile.id, action: "left" };
  }

  await setAvailability(profile.id, {
    kind: "FREE_NOW",
    expiresInHours: PRESENCE_HOURS,
    mode: "ONLINE",
    // No note. A note would be the obvious place to put the channel name, and
    // the channel somebody is sitting in is not something this product needs
    // to publish about them.
    note: null,
  });

  return { profileId: profile.id, action: "joined" };
}

/**
 * How many linked members are currently marked present.
 *
 * A count, never names, matching what Bunchy Now already does everywhere else.
 */
export async function presentCount(now = new Date()): Promise<number> {
  return db.availabilityStatus.count({
    where: { kind: "FREE_NOW", expiresAt: { gt: now } },
  });
}
