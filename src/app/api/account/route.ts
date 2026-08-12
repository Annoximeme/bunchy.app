import { z } from "zod";
import { clearSessionCookie } from "@/server/auth/cookies";
import { handleAuthed, parseJson } from "@/server/http/route";
import { deleteAccount } from "@/server/modules/account/delete";

/**
 * Delete the account.
 *
 * Two gates, both meant: the current password, because a session cookie is
 * enough to read an account and should never be enough to destroy one; and the
 * word DELETE typed out, because this cannot be undone and a misplaced click
 * should not be able to do it.
 */
const schema = z.object({
  password: z.string().min(1, "Enter your password to confirm."),
  confirm: z.literal("DELETE", {
    error: 'Type DELETE to confirm.',
  }),
});

export async function DELETE(request: Request) {
  return handleAuthed(async (viewer) => {
    const input = await parseJson(request, schema);
    const result = await deleteAccount(viewer.userId, input.password);
    await clearSessionCookie();
    return result;
  });
}
