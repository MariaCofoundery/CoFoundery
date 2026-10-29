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
  await supabase.rpc("dismiss_connect_suggestion", { p_suggestion_id: suggestionId });

  revalidatePath("/connect/suggestions");
}

/**
 * Die Vorschlagsliste wurde geoeffnet: Was dort steht, ist nicht mehr neu.
 *
 * Nimmt keine Kennungen entgegen. Die Funktion in der Datenbank markiert nur
 * die eigenen, offenen, noch ungesehenen Zeilen. Die Tabelle selbst hat keine
 * UPDATE-Rechte fuer Angemeldete - der erste Versuch mit einem direkten Update
 * lief still ins Leere, weil die Zahl nicht verschwand. Es ist eine reine
 * Anzeigeangabe fuer die Zahl in der Navigation.
 */
export async function markConnectSuggestionsSeenAction(): Promise<{ ok: boolean }> {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_connect_suggestions_seen");
  return { ok: !error };
}
