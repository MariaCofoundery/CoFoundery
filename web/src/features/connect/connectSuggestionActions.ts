"use server";

import { revalidatePath } from "next/cache";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Einen Vorschlag wegklicken.
 *
 * WEGGEKLICKT HEISST NICHT GELOESCHT: Die Zeile bleibt mit `dismissed_at`
 * stehen, damit derselbe Vorschlag nicht in der naechsten Woche wiederkommt.
 * Wer etwas nicht interessant findet, soll das einmal sagen muessen.
 *
 * Und es braucht keinen Grund. Nach einem Grund zu fragen macht aus einem
 * Achselzucken eine Begruendungspflicht - und die Antwort waere ohnehin nicht
 * auswertbar.
 */
export async function dismissConnectSuggestionAction(suggestionId: string): Promise<void> {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("connect_suggestions")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", suggestionId)
    // Ausdruecklich, obwohl die Policy dasselbe tut.
    .eq("recipient_user_id", user.id);

  revalidatePath("/connect/suggestions");
}
