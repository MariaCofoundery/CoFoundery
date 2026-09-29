"use server";

import { createClient } from "@/lib/supabase/server";
import { VENTURE_ALIGNMENT_INSTRUMENT_ID } from "@/features/instruments/instruments";

type Result = { ok: true } | { ok: false; reason: string; detail?: string };

/**
 * „So übernehmen“ - der Blick auf die eigenen Angaben ist festgehalten.
 *
 * ES WIRD KEINE ANTWORT GEÄNDERT. Nur ein Zeitstempel: Diese Person hat ihre
 * Angaben zu diesem Vorhaben angesehen. Wer den Schritt nie macht, verliert
 * nichts - die Antworten gelten trotzdem.
 */
export async function confirmVentureAnswers(ventureId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return { ok: false, reason: "not_authenticated" };

  const { error } = await supabase
    .from("assessments")
    .update({ answers_confirmed_at: new Date().toISOString() })
    .eq("user_id", auth.user.id)
    .eq("venture_id", ventureId)
    .eq("instrument_id", VENTURE_ALIGNMENT_INSTRUMENT_ID);

  if (error) return { ok: false, reason: "confirm_failed", detail: error.message };
  return { ok: true };
}

/**
 * Dem Vorhaben einen Namen geben.
 *
 * ---------------------------------------------------------------------------
 * EINMAL FRAGEN, NICHT VERWALTEN
 * ---------------------------------------------------------------------------
 *
 * `founder_teams.name` ist seit jeher nullable, und keine Stelle im Code hat
 * ihn je geschrieben - die Trigger setzen nur den Kontext. Für „ALIGN für
 * [Vorhaben]“ braucht es einen, sonst steht dort ein Gedankenstrich.
 *
 * Kein eigener Bereich, kein Umbenennen-Menü. Ein Feld beim ersten Mal, und
 * später änderbar an derselben Stelle.
 */
export async function setVentureName(ventureId: string, name: string): Promise<Result> {
  const sauber = name.trim();
  // Ein leerer Name ist kein Name - und die Datenbank weist ihn ohnehin ab
  // (`name is null or btrim(name) <> ''`). Hier faellt es nur frueher auf.
  if (!sauber) return { ok: false, reason: "empty_name" };
  if (sauber.length > 120) return { ok: false, reason: "name_too_long" };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return { ok: false, reason: "not_authenticated" };

  // Nur benennen, wo man Mitglied ist. Ohne diese Prüfung könnte jemand ein
  // fremdes Vorhaben umbenennen - die Policies würden es abfangen, aber eine
  // Serverfunktion soll nicht darauf bauen.
  const { data: membership } = await supabase
    .from("founder_team_members")
    .select("team_id")
    .eq("team_id", ventureId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!membership) return { ok: false, reason: "not_a_member" };

  const { error } = await supabase
    .from("founder_teams")
    .update({ name: sauber })
    .eq("id", ventureId);

  if (error) return { ok: false, reason: "rename_failed", detail: error.message };
  return { ok: true };
}
