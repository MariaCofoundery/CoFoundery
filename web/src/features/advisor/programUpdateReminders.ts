import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Der Lauf, der an faellige Programm-Updates erinnert - nur im Postfach der
 * App. Wer einen Hinweis bekommt und wann, entscheidet die Datenbank
 * (`prepare_program_update_reminders`): ein Stempel je Programm und
 * Faelligkeit, ein Hinweis je aktuellem Teammitglied. Keine Mail, keine
 * Mitteilung aufs Geraet; die Mail folgt spaeter.
 */
export type ProgramUpdateReminderResult =
  | { ok: true; prepared: number }
  | { ok: false; reason: "missing_service_role" | "prepare_failed" };

export async function runProgramUpdateReminders(limit = 100): Promise<ProgramUpdateReminderResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, reason: "missing_service_role" };
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.rpc("prepare_program_update_reminders", { p_limit: limit });
  if (error) return { ok: false, reason: "prepare_failed" };
  return { ok: true, prepared: typeof data === "number" ? data : 0 };
}
