import { brand } from "@/lib/brand";
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
 * public" and "money is the reddest flag", the moderator guidelines' list of
 * what gets escalated, and /about's commitment that nobody is ranked by looks.
 * A Discord with different values from the product it belongs to is two
 * communities wearing one name, and the one people judge is whichever they
 * meet first.
 *
 * ## The colour
 *
 * Coral, the brand's own accent, as a plain integer because that is what
 * Discord takes. It is the one piece of the product's visual identity that
 * survives into a chat client, so it is worth spending.
 */

/** #FF5C6C, the brand accent, as Discord wants it. */
const CORAL = 0xff5c6c;
const MINT = 0x0e7a69;

function appUrl(path: string): string {
  return new URL(path, env().APP_URL).toString();
}

/**
 * The rules, as one embed.
 *
 * Six of them, and no more. A rules post nobody reads to the end is a rules
 * post that protects nobody, and six is roughly where a reader stops. Anything
 * that is really a consequence rather than a rule is in the footer instead.
 */
export function rulesEmbed() {
  return {
    color: CORAL,
    title: `The short version`,
    description:
      `This server is for arranging things to do with people, and for the ` +
      `hour before and after. Six rules, all of them the same ones ${brand.name} ` +
      `itself runs on.`,
    fields: [
      {
        name: "1 · Everyone here is a stranger until they are not",
        value:
          "Treat people as though you will meet them, because you might. " +
          "First meets go somewhere public, and telling somebody where you are " +
          "going is normal rather than dramatic.",
      },
      {
        name: "2 · Nobody is ranked by looks",
        value:
          "No rating people, no swiping, no scoring who is worth talking to. " +
          `${brand.name} does not do it and neither does this server.`,
      },
      {
        name: "3 · Money is the reddest flag",
        value:
          "Nobody legitimate will ask you for money, crypto, a favour involving " +
          "a payment, or help with an investment. If somebody does, report them " +
          "and do not reply.",
      },
      {
        name: "4 · 16 and over, and no exceptions",
        value:
          "Anything involving somebody under 16 is escalated immediately, and " +
          "that is the one rule with no judgement call in it.",
      },
      {
        name: "5 · Say no plainly, and take it plainly",
        value:
          "Turning down a plan, leaving a voice channel or ending a conversation " +
          "needs no reason. Pushing after somebody has said no is the behaviour " +
          "that gets people removed.",
      },
      {
        name: "6 · Bring it back to something real",
        value:
          "The point of this place is the Thursday, not the chat. If a " +
          "conversation could be a plan, make it one: `/call` posts it here and " +
          "on Bunchy at the same time.",
      },
    ],
    footer: {
      text:
        "Report anything to a moderator here, and anything that happened on " +
        "Bunchy on Bunchy, because only one of those has the buttons.",
    },
    url: appUrl("/safety"),
  };
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
