import { z } from "zod";
import { handleAuthed, parseJson } from "@/server/http/route";
import {
  blockProfile,
  fileReport,
  unblockProfile,
} from "@/server/modules/moderation/service";

const blockSchema = z.object({
  action: z.literal("block"),
  profileId: z.string().trim().min(1).max(40),
});

const unblockSchema = z.object({
  action: z.literal("unblock"),
  profileId: z.string().trim().min(1).max(40),
});

const reportSchema = z.object({
  action: z.literal("report"),
  targetType: z.enum([
    "PROFILE",
    "BUNCH_MESSAGE",
    "DIRECT_MESSAGE",
    "BUNCH",
    "ACTIVITY",
  ]),
  targetId: z.string().trim().min(1).max(40),
  reason: z.enum([
    "HARASSMENT",
    "SPAM",
    "HATE_SPEECH",
    "SEXUAL_CONTENT",
    "SCAM_OR_FRAUD",
    "IMPERSONATION",
    "SELF_HARM",
    "OTHER",
  ]),
  details: z.string().trim().max(2000).optional(),
});

const schema = z.discriminatedUnion("action", [
  blockSchema,
  unblockSchema,
  reportSchema,
]);

/**
 * Block, unblock and report on one endpoint.
 *
 * Kept together because they are the same moment for a member, something is
 * wrong and they want it to stop, and the UI presents them as one flow.
 */
export async function POST(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, schema);

    switch (input.action) {
      case "block":
        await blockProfile(viewer.profileId, input.profileId);
        return { ok: true };
      case "unblock":
        await unblockProfile(viewer.profileId, input.profileId);
        return { ok: true };
      case "report": {
        const report = await fileReport(viewer.profileId, input);
        return { ok: true, reportId: report.id };
      }
    }
  });
}
