"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Die Erinnerungsfrage beim Pausieren im Fragebogen ("Möchtest du erst mal eine Pause einlegen und später weitermachen?"): Ja oder Nein.
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
