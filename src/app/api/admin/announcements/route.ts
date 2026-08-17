import { z } from "zod";
import { handle, parseJson } from "@/server/http/route";
import { requireAdmin } from "@/server/modules/admin/guard";
import { publishAnnouncement } from "@/server/modules/announcements/service";

const schema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    // The slug lands in a URL, so it is constrained here rather than trusted to
    // whoever typed it.
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only."),
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
  reason: z.string().trim().max(1000).optional(),
});

/** Publishing. Admin only, audited, and refused when the dates make it a lie. */
export async function POST(request: Request) {
  return handle(async () => {
    const actor = await requireAdmin();
    const input = await parseJson(request, schema);

    // Blank lines are paragraph breaks. No markdown, no HTML: the blocks are
    // rendered to React elements on the way out.
    const body = input.bodyText
      .split(/\n\s*\n/)
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({ kind: "paragraph" as const, text }));

    return publishAnnouncement(actor, {
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      body,
      tier: input.tier,
      linkHref: input.linkHref ?? null,
      linkLabel: input.linkLabel ?? null,
      effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : null,
      reason: input.reason,
    });
  });
}
