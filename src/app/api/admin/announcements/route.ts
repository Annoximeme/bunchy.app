import { z } from "zod";
import { handle, parseJson } from "@/server/http/route";
import { requireAdmin } from "@/server/modules/admin/guard";
import {
  publishAnnouncement,
  withdrawAnnouncement,
} from "@/server/modules/announcements/service";
import { parseBlocks } from "@/server/modules/announcements/blocks";

const slug = z
  .string()
  .trim()
  .min(1)
  .max(80)
  // The slug lands in a URL, so it is constrained here rather than trusted to
  // whoever typed it.
  .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only.");

const schema = z.object({
  slug,
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(500),
  bodyText: z.string().max(20_000).default(""),
  tier: z.enum(["CRITICAL", "NOTABLE", "NOTED"]),
  linkHref: z
    .string()
    .trim()
    .max(200)
    // Relative paths only. An announcement is the operator speaking to members;
    // a link out of the product from that position is a phishing shape.
    .regex(/^\//, "Links must stay inside Bunchy.")
    .nullable()
    .optional(),
  linkLabel: z.string().trim().max(80).nullable().optional(),
  effectiveAt: z.string().trim().min(1).nullable().optional(),
  /**
   * Save, or send.
   *
   * A separate field rather than inferring a draft from an empty publish date.
   * Inferring it would make "publish now" and "save for later" the same
   * gesture with the same empty field, and the difference between them is the
   * difference between reaching every member and reaching nobody.
   */
  action: z.enum(["publish", "draft"]).default("publish"),
  /** When to publish. Empty with `action: "publish"` means now. */
  publishAt: z.string().trim().min(1).nullable().optional(),
  publicVisible: z.boolean().default(true),
  reason: z.string().trim().max(1000).optional(),
});

/**
 * A date out of a `datetime-local` input, or a refusal.
 *
 * `new Date("nonsense")` is an Invalid Date rather than a throw, and an
 * Invalid Date written to Prisma is an error from three layers down that names
 * a column instead of the field somebody typed in.
 */
function parseDate(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new z.ZodError([
      {
        code: "custom",
        path: [field],
        message: "That is not a date I can read.",
        input: value,
      },
    ]);
  }
  return date;
}

/** Publishing, scheduling and saving. Admin only, audited when it reaches anybody. */
export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireAdmin();
    const input = await parseJson(request, schema);

    return publishAnnouncement(actor, {
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      body: parseBlocks(input.bodyText),
      tier: input.tier,
      linkHref: input.linkHref ?? null,
      linkLabel: input.linkLabel ?? null,
      effectiveAt: input.effectiveAt
        ? parseDate(input.effectiveAt, "effectiveAt")
        : null,
      publishAt:
        input.action === "draft"
          ? null
          : input.publishAt
            ? parseDate(input.publishAt, "publishAt")
            : undefined,
      publicVisible: input.publicVisible,
      reason: input.reason,
    });
  });
}

/**
 * Taking it back off the board.
 *
 * The service function has existed since the module was written and nothing
 * called it, so the only way to unpublish something was to edit the database.
 * It does not delete: the row and its audit entries stay, because the record
 * of what was said and when has to survive changing our minds about saying it.
 */
export async function DELETE(request: Request) {
  return handle(async () => {
    const actor = await requireAdmin();
    const input = await parseJson(
      request,
      z.object({ slug, reason: z.string().trim().max(1000).optional() }),
    );

    await withdrawAnnouncement(actor, input.slug, input.reason);
    return { ok: true };
  });
}
