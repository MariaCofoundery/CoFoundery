import "server-only";

import { createClient } from "@supabase/supabase-js";

import { reminderUnsubscribeToken } from "@/features/onboarding/reminderToken";
import { CURRENT_WORKSTYLE_HREF } from "@/features/instruments/workstyle/current";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";
import { sendOnboardingReminderEmail } from "@/lib/email/sendOnboardingReminderEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

/**
 * Der Lauf, der die zwei freundlichen Erinnerungen nach dem Einstieg verschickt.
 *
 * Wer erinnert wird, entscheidet die Datenbank (`prepare_onboarding_reminders`): nur mit ausdruecklicher
 * Zustimmung, nur ohne Abmeldung, nur solange etwas offen ist - und sie stempelt, BEVOR gesendet wird. Ein zweiter
 * Aufruf am selben Tag findet nichts mehr.
 *
 * Ohne `CRON_SECRET` wird nichts verschickt (das Geheimnis unterschreibt auch den Abmelde-Link): "nicht eingerichtet"
 * heisst hier wie ueberall still, nicht kaputt.
 */

type PreparedRow = { recipient_user_id: string; reminder_round: number; next_step: "workstyle" | "setup" };

export type OnboardingReminderResult =
  | { ok: true; prepared: number; mailed: number }
  | { ok: false; reason: "missing_service_role" | "prepare_failed" };

function privilegedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function reminderTargetPath(step: "workstyle" | "setup") {
  return step === "workstyle" ? CURRENT_WORKSTYLE_HREF : "/welcome/profil";
}

export async function runOnboardingReminders(limit = 50): Promise<OnboardingReminderResult> {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  const client = privilegedClient();
  if (!client) return { ok: false, reason: "missing_service_role" };
  if (!secret) return { ok: true, prepared: 0, mailed: 0 };

  const { data, error } = await client.rpc("prepare_onboarding_reminders", { p_limit: limit });
  if (error) return { ok: false, reason: "prepare_failed" };
  const rows = (data ?? []) as PreparedRow[];

  let mailed = 0;
  const origin = getPublicAppOrigin();
  for (const row of rows) {
    try {
      const recipient = await getNotificationRecipient(row.recipient_user_id);
      if (!recipient) continue;
      const { data: core } = await client.from("person_core").select("display_name").eq("user_id", row.recipient_user_id).maybeSingle();
      // Nur der Vorname: nie ein Team, nie eine Antwort.
      const name = ((core?.display_name as string | null) ?? "").trim().split(/\s+/)[0] || null;
      const token = reminderUnsubscribeToken(row.recipient_user_id, secret);
      const result = await sendOnboardingReminderEmail({
        recipientEmail: recipient.email,
        round: row.reminder_round === 2 ? 2 : 1,
        nextStep: row.next_step,
        name,
        url: `${origin}${reminderTargetPath(row.next_step)}`,
        unsubscribeUrl: `${origin}/abmelden/erinnerung?u=${row.recipient_user_id}&t=${token}`,
        locale: recipient.locale,
      });
      mailed += result.ok ? 1 : 0;
    } catch {
      // Ein Fehlschlag bei einem Menschen beendet den Lauf nicht; der Stempel steht schon - die gewollte Richtung.
    }
  }
  return { ok: true, prepared: rows.length, mailed };
}
