"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteFounderAccount } from "@/features/account/deleteFounderAccount";
import { createClient } from "@/lib/supabase/server";

export type DeleteAccountActionResult =
  | { ok: true }
  | {
      ok: false;
      error: "not_authenticated" | "missing_service_role" | "cleanup_failed";
    };

/**
 * Was von jemandem stehen bleiben darf, entscheidet er hier - nicht die AGB.
 *
 * Die beiden Angaben wandern unveraendert in die Vorbereitung: Erst wird
 * geloescht, was nicht bleiben soll, dann loest die Kontoloeschung die
 * Verknuepfung des Rests. Andersherum waere alles verwaist, auch das, wogegen
 * sich jemand ausdruecklich entschieden hat.
 */
export async function deleteCurrentUserAccountAction(
  keep: { problems: boolean; approaches: boolean } = { problems: false, approaches: false }
): Promise<DeleteAccountActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, error: "not_authenticated" };
  }

  const deleteResult = await deleteFounderAccount(user.id, keep);
  if (!deleteResult.ok) {
    return { ok: false, error: deleteResult.error };
  }

  try {
    await supabase.auth.signOut();
  } catch {
    // Best effort: once the auth user is gone, stale sessions cannot continue.
  }

  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/connect");

  redirect("/?status=account_deleted");
}
