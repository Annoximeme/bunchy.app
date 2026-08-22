import { brand } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import { env } from "@/server/env";

/**
 * The two messages the bot writes on its own: a greeting and the rules.
 *
 * Kept here rather than in `run-bot.ts` for the same reason the commands are:
 * this is copy, it is the most-read text the product has in Discord, and it
 * should be reviewable without reading gateway plumbing.
 *
 * ## Why the rules are these rules
 *
 * They are not generic server rules. Every line is something Bunchy already
 * promises somewhere it can be held to: the safety page's "first meets go in
 * public" and "money is the reddest flag", the moderator guidelines' finding
 * that staff impersonation is a ban and that passwords exist only as hashes,
 * and /about's commitment that nobody is ranked by looks. A Discord with
 * different values from the product it belongs to is two communities wearing
 * one name, and the one people judge is whichever they meet first.
 *
 * ## Why four embeds rather than one list
 *
 * Fourteen rules in one block is a wall, and a wall is read to the third line.
 * Splitting them into four gives each a coloured bar, a heading and a scannable
 * shape, and it lets the two blocks that are different in kind look different:
 * the scam and impersonation block is a warning rather than a rule, and the
 * last one is a help desk rather than either.
 *
 * The rules are numbered straight through the four, so a moderator can say
 * "rule 9" and have it mean one thing. That is the only reason they carry
 * numbers: it is a reference, not a sequence, and nobody works through them
 * in order.
 *
 * ## The colours
 *
 * The brand's own tokens, as plain integers because that is what Discord takes,
 * and specifically the dark-mode variants: Discord is a dark surface for most
 * people, and the light-mode danger red is close to unreadable on it. This is
 * the one piece of the product's visual identity that survives into a chat
 * client, so it is worth spending.
 */

/** #FF5C6C, the brand accent. The same value in both themes. */
const CORAL = 0xff5c6c;
/** The dark-theme danger token. The light one is too dark to read on Discord. */
const ALARM = 0xff8a7d;
/** The dark-theme teal token, for the block that offers help rather than warns. */
const MINT_BRIGHT = 0x55d6be;
const MINT = 0x0e7a69;

function appUrl(path: string): string {
  return new URL(path, env().APP_URL).toString();
}

/**
 * The rules, as the four embeds of one message.
 *
 * Ordered by how likely a reader is to need them rather than by severity: how
 * to behave, then the thing that costs people money, then meeting in person,
 * then what to do when it has already gone wrong. Somebody skimming stops
 * early, so the block that stops a scam sits above the block about cafés.
 */
export interface RulesEmbed {
  color: number;
  title: string;
  url?: string;
  description?: string;
  fields: Array<{ name: string; value: string }>;
  footer?: { text: string };
}

export function rulesEmbeds(): RulesEmbed[] {
  return [
    {
      color: CORAL,
      title: "The rules",
      url: appUrl("/safety"),
      description:
        `This server is for arranging things to do with people, and for the ` +
        `hour either side. Fourteen rules, all of them the ones ${brand.name} ` +
        `itself runs on. They are short on purpose: rules nobody finishes ` +
        `reading protect nobody.`,
      fields: [
        {
          name: "1 · Nobody is ranked by looks",
          value:
            "No rating people, no scoring who is worth talking to, no asking " +
            `a room to judge a photo. ${brand.name} has never had a swipe in ` +
            "it and neither does this server.",
        },
        {
          name: "2 · Say no plainly, and take it plainly",
          value:
            "Turning down a plan, leaving a voice channel or ending a " +
            "conversation needs no reason and no apology. Pushing after " +
            "somebody has said no is the behaviour that gets people removed. " +
            "The no never is.",
        },
        {
          name: "3 · Argue with what was said, never with what somebody is",
          value:
            "Disagreeing is fine and being blunt is fine. Going after " +
            "somebody for what they are rather than what they said is not, " +
            "and it is the one thing here that skips the warning.",
        },
        {
          name: "4 · This is not a dating app",
          value:
            "It does not become one quietly either. Unsolicited sexual " +
            "messages or images get you removed the first time, not the third.",
        },
        {
          name: "5 · Once is a message, five is harassment",
          value:
            "Carrying on after somebody stopped answering, following them " +
            "between channels, or bringing other people in on it. The bar is " +
            "the pattern, not the rudest single line.",
        },
        {
          name: "6 · Somebody else's words are not yours to move",
          value:
            "No screenshotting a conversation into another channel, no " +
            "reposting somebody's photo somewhere else, no forwarding a " +
            "direct message. Ask them first, every time.",
        },
        {
          name: "7 · Nothing to sell, and nothing to drop",
          value:
            "No advertising, no referral links, no mass direct messages. " +
            "That includes messaging people privately because you met them " +
            "here. If you are here to promote something, you are in the " +
            "wrong server.",
        },
        {
          name: "8 · Bring it back to something real",
          value:
            "The point of this place is the Thursday, not the chat. If a " +
            "conversation could be a plan, make it one: `/call` posts it here " +
            `and on ${brand.name} at the same time.`,
        },
      ],
    },
    {
      color: ALARM,
      title: `Nobody from ${brand.name} will ask you for that`,
      description:
        `Pretending to be another member breaks the rules. Pretending to be ` +
        `${brand.name} staff is a ban, the first time, with no conversation ` +
        `about what you meant by it. This is the block worth actually ` +
        `reading, because it is the one that costs people money.`,
      fields: [
        {
          name: "9 · Be who you say you are",
          value:
            "Do not claim to be a specific real person, and do not claim to " +
            "be staff, a moderator, or anything calling itself support. Staff " +
            `carry a badge on their ${brand.name} profile, and it exists so ` +
            "you can check rather than guess.",
        },
        {
          name: "10 · Four things staff will never do",
          value:
            "We will never ask for your password, and could not use it if " +
            "you sent it: it is kept only as a hash, so nobody at " +
            `${brand.name}, admins included, can see yours. We will never ` +
            "ask for a login code. We will never message you first asking " +
            "you to verify, unlock or confirm something. And we will never " +
            "ask you to install anything or sign in through a link somebody " +
            "handed you. Anyone doing one of those four is not us.",
        },
        {
          name: "11 · Money is the reddest flag",
          value:
            "Nobody legitimate will ask you for money, crypto, gift cards, a " +
            "loan, an investment tip or a favour involving your bank. It " +
            "usually arrives wrapped in weeks of friendliness, and there is " +
            "no version of it that turns out to be a misunderstanding. Report " +
            "it and stop replying.",
        },
      ],
    },
    {
      color: CORAL,
      title: "Meeting in person",
      description:
        "Plenty of this is online, where the worst that happens is blocking " +
        "somebody. This part is about the other half, which is worth doing " +
        "carefully.",
      fields: [
        {
          name: "12 · 16 and over, and no exceptions",
          value:
            `${brand.name} is 16+. Anything involving somebody under 16 is ` +
            "escalated straight away, and it is the one rule on this list " +
            "with no judgement call in it.",
        },
        {
          name: "13 · First meets go somewhere public",
          value:
            "A café, a bar, a park, anywhere with staff and strangers about. " +
            "Not a home, not a car, not somewhere you would have trouble " +
            "leaving. Somebody worth meeting will not mind, and somebody who " +
            "pushes back on it has told you something useful. Every activity " +
            "page has a Tell someone button that sends the what, where and " +
            "when to a friend in one message.",
        },
        {
          name: "14 · You owe nobody your details",
          value:
            "Not a phone number, not a last name, not a workplace, not an " +
            `address. ${brand.name} never asks for any of them either, and ` +
            "stores your location as a coarse area rather than a street. " +
            "Leave whenever you like, and you do not owe anybody a reason.",
        },
      ],
    },
    {
      color: MINT_BRIGHT,
      title: "If something goes wrong",
      fields: [
        {
          name: `Here and ${brand.name} are two different places`,
          value:
            "This server is genuinely ours and genuinely not the site. Over " +
            "here you are also covered by Discord's own rules. Reporting " +
            `somebody on ${brand.name} does not remove them from this ` +
            "server, and blocking them there does not block them here. So " +
            "tell a moderator here and tell Discord, because only one of " +
            "those has the buttons.",
        },
        {
          name: "What happens to a report",
          value:
            "A person reads it. We deliberately do not suspend an account " +
            "just because somebody reported it, because automatic enforcement " +
            "on unread reports is a tool for harassing people rather than for " +
            "stopping it. That means a wait, and we would rather be honest " +
            "about the wait than pretend to a speed we do not have.",
        },
        {
          name: "How hard we act",
          value:
            "Rude is not against the rules. After that it goes: the message " +
            "comes down, then a day, then a week, then thirty days, then the " +
            "account. We stop at the first step that actually solves it, " +
            "because escalating later is always possible and an " +
            "over-correction has already happened.",
        },
        {
          name: "If somebody is in danger",
          value:
            "Emergency services first, and not us: 112 across the EU, 999 in " +
            "the UK, 911 in the US and Canada. We are a small team and we " +
            "cannot be one of those. Afterwards, write to " +
            `${LEGAL.supportContact}. If somebody is talking about harming ` +
            "themselves, tell a moderator: what follows is help, not " +
            "enforcement, and nobody loses their account over it.",
        },
      ],
      footer: {
        text: `The longer version, and what we do on our side: ${brand.domain}/safety`,
      },
    },
  ];
}

/**
 * The greeting.
 *
 * One message, three sentences, and one thing to do. The instinct with a
 * welcome channel is to explain everything, which produces a wall nobody reads
 * at the exact moment somebody is deciding whether this place is for them.
 *
 * It says what the server is for, points at the rules, and gives one action.
 * Not a list of five channels to visit: somebody who has just arrived can do
 * one thing, and the one worth doing is the one that makes the rest work.
 */
export function welcomeMessage(
  userId: string,
  rulesChannelId: string | null,
) {
  const rules = rulesChannelId
    ? `Have a look at <#${rulesChannelId}> first.`
    : "Have a read of the rules first.";

  return {
    content: `<@${userId}>`,
    embeds: [
      {
        color: MINT,
        title: `Welcome to ${brand.name}`,
        description:
          `This is where people work out what they are actually doing this week. ` +
          `${rules}\n\n` +
          `When you are ready, connect your account with \`/link\` and you can ` +
          `post a plan from here with \`/call\`, or see what is already on with ` +
          `\`/tonight\`.`,
        fields: [
          {
            name: "No account yet?",
            value: `${appUrl("/")} · it takes two fields.`,
          },
        ],
        footer: {
          text: "Nobody is told when you arrive or when you leave.",
        },
      },
    ],
  };
}
