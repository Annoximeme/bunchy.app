import { db } from "@/server/db/client";
import { conflict, forbidden, notFound, validationFailed } from "@/server/errors";
import { consume } from "@/server/ratelimit";
import { notify } from "@/server/modules/notifications/service";
import { assertNotBlocked } from "@/server/modules/moderation/service";
import { track } from "@/server/modules/analytics/track";
import { ANALYTICS_EVENTS } from "@/server/modules/analytics/events";
import {
  areConnected,
  satisfiesAudience,
} from "@/server/modules/connections/service";

/**
 * "You two should meet."
 *
 * ## Why a person, when there is already a ranker
 *
 * Everything else that introduces two people here is software: Discover ranks,
 * Surprise Me reaches, and `discovery/introductions.ts` writes the one sentence
 * the product is allowed to say first. All of it works from what two people
 * typed into forms. A member who knows both of them has the thing none of that
 * has, which is having met them, and until now the only way to act on it was to
 * message each of them separately and hope.
 *
 * ## The rules, and why each one is here
 *
 * **You must be connected to both.** An introduction from a stranger is a
 * connection request with an extra step, and this must not become a way to put
 * a name in front of somebody who has not agreed to hear from you.
 *
 * **Both have to say yes, and neither learns which one said no.** Same rule as
 * an ordinary connection: declining is silent. The introducer is told the
 * introduction did not go ahead, and nothing else, because "they said no" is an
 * invitation to ask why, and then to try again from a new angle.
 *
 * **Their own privacy settings still decide.** Somebody who has closed
 * connection requests has closed them; being vouched for by a mutual friend
 * does not reopen a door they shut. `whoCanSendRequests` is checked against the
 * *introducer*, which is the honest reading: they are the person doing the
 * asking, and a member who accepts requests from connections is exactly the
 * member who would want this from one.
 *
 * **Five a day, and that is generous.** An introduction spends two other
 * people's attention rather than the sender's own.
 *
 * ## What it deliberately does not have
 *
 * No count of introductions made, no badge for making them, nothing on a
 * profile. The moment being the person who introduces people is worth points,
 * the introductions stop being about the two people.
 */

export interface IntroductionView {
  id: string;
  note: string | null;
  createdAt: Date;
  /** Who put the two of you together. Null if they have since left. */
  introducer: { username: string; displayName: string; avatarUrl: string | null } | null;
  /** The person being introduced, from the reader's side. */
  person: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
  };
}

const MAX_NOTE = 300;

export async function introduce(
  introducerId: string,
  oneId: string,
  otherId: string,
  note?: string | null,
): Promise<{ id: string }> {
  if (oneId === otherId) {
    throw validationFailed("Pick two different people.");
  }
  if (introducerId === oneId || introducerId === otherId) {
    throw validationFailed(
      "This is for introducing two other people. To meet somebody yourself, send them a request.",
    );
  }

  await consume("introduction", introducerId);

  // Connected to both, checked now rather than trusted from the form.
  const [knowsOne, knowsOther] = await Promise.all([
    areConnected(introducerId, oneId),
    areConnected(introducerId, otherId),
  ]);
  if (!knowsOne || !knowsOther) {
    throw forbidden("You can only introduce two people you're both connected to.");
  }

  // Every block that matters: between the two of them, and between the
  // introducer and each of them.
  await assertNotBlocked(oneId, otherId);
  await assertNotBlocked(introducerId, oneId);
  await assertNotBlocked(introducerId, otherId);

  if (await areConnected(oneId, otherId)) {
    throw conflict("They already know each other here.");
  }

  const [one, other] = await Promise.all(
    [oneId, otherId].map((id) =>
      db.profile.findUnique({
        where: { id },
        select: {
          id: true,
          displayName: true,
          user: { select: { status: true } },
          privacy: { select: { whoCanSendRequests: true } },
        },
      }),
    ),
  );
  if (!one || !other || one.user.status !== "ACTIVE" || other.user.status !== "ACTIVE") {
    throw notFound("We couldn't find one of those profiles.");
  }

  for (const person of [one, other]) {
    const scope = person.privacy?.whoCanSendRequests ?? "EVERYONE";
    if (!(await satisfiesAudience(scope, introducerId, person.id))) {
      throw forbidden("One of them isn't taking introductions right now.");
    }
  }

  // One live introduction per pair, whoever made it. Two mutual friends each
  // having the same idea in the same week is not two questions to answer.
  const live = await db.memberIntroduction.findFirst({
    where: {
      status: "PENDING",
      OR: [
        { oneId, otherId },
        { oneId: otherId, otherId: oneId },
      ],
    },
    select: { id: true },
  });
  if (live) throw conflict("Somebody has already introduced those two.");

  const introduction = await db.memberIntroduction.create({
    data: {
      introducerId,
      oneId,
      otherId,
      note: note?.trim().slice(0, MAX_NOTE) || null,
    },
    select: { id: true },
  });

  const introducer = await db.profile.findUniqueOrThrow({
    where: { id: introducerId },
    select: { displayName: true },
  });

  await Promise.all(
    [
      { profileId: oneId, meeting: other.displayName },
      { profileId: otherId, meeting: one.displayName },
    ].map(({ profileId, meeting }) =>
      notify({
        profileId,
        actorProfileId: introducerId,
        type: "CONNECTION_REQUEST",
        title: `${introducer.displayName} thinks you should meet ${meeting}`,
        body: "Have a look, and say yes only if you want to.",
        linkPath: "/connections",
        groupKey: `introduction:${introduction.id}`,
      }),
    ),
  );

  track({
    name: ANALYTICS_EVENTS.INTRODUCTION_MADE,
    profileId: introducerId,
    properties: { introductionId: introduction.id },
  });

  return introduction;
}

/** The introductions waiting on this member's answer. */
export async function pendingIntroductions(
  profileId: string,
): Promise<IntroductionView[]> {
  const rows = await db.memberIntroduction.findMany({
    where: {
      status: "PENDING",
      OR: [
        { oneId: profileId, oneAccepted: null },
        { otherId: profileId, otherAccepted: null },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      note: true,
      createdAt: true,
      oneId: true,
      introducer: {
        select: { username: true, displayName: true, avatarUrl: true },
      },
      one: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
      },
      other: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    note: row.note,
    createdAt: row.createdAt,
    introducer: row.introducer,
    // Whichever of the two is not the reader.
    person: row.oneId === profileId ? row.other : row.one,
  }));
}

/**
 * Yes or no, from one of the two.
 *
 * A yes when the other has already said yes creates the connection outright,
 * accepted on both sides, because both people have now agreed and making one
 * of them send a request afterwards would be asking the same question twice.
 */
export async function respondToIntroduction(
  introductionId: string,
  profileId: string,
  accept: boolean,
): Promise<{ status: "PENDING" | "ACCEPTED" | "DECLINED" }> {
  const introduction = await db.memberIntroduction.findUnique({
    where: { id: introductionId },
    select: {
      id: true,
      status: true,
      introducerId: true,
      oneId: true,
      otherId: true,
      oneAccepted: true,
      otherAccepted: true,
      one: { select: { displayName: true } },
      other: { select: { displayName: true } },
    },
  });
  if (!introduction) throw notFound("That introduction no longer exists.");
  if (introduction.status !== "PENDING") {
    throw conflict("That introduction has already been settled.");
  }

  const isOne = introduction.oneId === profileId;
  const isOther = introduction.otherId === profileId;
  if (!isOne && !isOther) {
    throw forbidden("That introduction isn't yours to answer.");
  }

  const mine = isOne ? introduction.oneAccepted : introduction.otherAccepted;
  if (mine !== null) throw conflict("You've already answered this one.");
  const theirs = isOne ? introduction.otherAccepted : introduction.oneAccepted;

  if (!accept) {
    await db.memberIntroduction.update({
      where: { id: introductionId },
      data: {
        ...(isOne ? { oneAccepted: false } : { otherAccepted: false }),
        status: "DECLINED",
        respondedAt: new Date(),
      },
    });

    // The introducer is told it did not happen, and never which of them said
    // so. The other person, if they had already said yes, is told the same
    // thing, because they are waiting on an answer that is not coming.
    const waiting = theirs === true ? (isOne ? introduction.otherId : introduction.oneId) : null;
    for (const target of [introduction.introducerId, waiting]) {
      if (!target) continue;
      await notify({
        profileId: target,
        type: "CONNECTION_REQUEST",
        title: "That introduction didn't go ahead",
        body: "One of them would rather not, and we don't say which.",
        linkPath: "/connections",
        groupKey: `introduction:${introductionId}`,
      });
    }

    return { status: "DECLINED" };
  }

  if (theirs !== true) {
    await db.memberIntroduction.update({
      where: { id: introductionId },
      data: isOne ? { oneAccepted: true } : { otherAccepted: true },
    });
    return { status: "PENDING" };
  }

  // Both have now said yes.
  const connection = await db.$transaction(async (tx) => {
    const created = await tx.connection.create({
      data: {
        requesterId: introduction.oneId,
        addresseeId: introduction.otherId,
        status: "ACCEPTED",
        respondedAt: new Date(),
      },
      select: { id: true },
    });

    await tx.conversation.create({
      data: {
        connectionId: created.id,
        participants: {
          create: [
            { profileId: introduction.oneId },
            { profileId: introduction.otherId },
          ],
        },
      },
    });

    await tx.memberIntroduction.update({
      where: { id: introductionId },
      data: {
        ...(isOne ? { oneAccepted: true } : { otherAccepted: true }),
        status: "ACCEPTED",
        respondedAt: new Date(),
        connectionId: created.id,
      },
    });

    return created;
  });

  await Promise.all(
    [
      { profileId: introduction.oneId, meeting: introduction.other.displayName },
      { profileId: introduction.otherId, meeting: introduction.one.displayName },
    ].map(({ profileId: target, meeting }) =>
      notify({
        profileId: target,
        type: "CONNECTION_ACCEPTED",
        title: `You and ${meeting} are connected`,
        body: "You can message each other now.",
        linkPath: "/messages",
      }),
    ),
  );

  if (introduction.introducerId) {
    await notify({
      profileId: introduction.introducerId,
      type: "CONNECTION_ACCEPTED",
      title: "They both said yes",
      body: `${introduction.one.displayName} and ${introduction.other.displayName} are talking. That was you.`,
      linkPath: "/connections",
    });
  }

  track({
    name: ANALYTICS_EVENTS.INTRODUCTION_TOOK,
    profileId,
    properties: { introductionId, connectionId: connection.id },
  });

  return { status: "ACCEPTED" };
}
