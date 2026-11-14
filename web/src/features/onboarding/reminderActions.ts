"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Die Erinnerungsfrage nach dem ersten Erfolg ("Soll ich dich morgen erinnern?"): Ja oder Nein danke.
 *
 * Beides wird festgehalten, damit nicht noch einmal gefragt wird; nur ein Ja erlaubt Mails (hoechstens zwei). Die Frage
 * ist eine ausdrueckliche Entscheidung, nichts ist vorbelegt. Ein Fehler stoert den Fragebogen nicht.
 */
export async function answerReminderAction(wants: boolean): Promise<{ ok: boolean }> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) return { ok: false };
  const { error } = await client.rpc("set_onboarding_reminder", { p_wants: wants === true, p_source: "midway" });
  return { ok: !error };
}
