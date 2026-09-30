"use server";

import { FOUNDER_PROFILE_INSTRUMENT_ID } from "@/features/instruments/instruments";
import {
  DIRECTIONS,
  IMPORTANCES,
  THEME_IDS,
  type Direction,
  type Importance,
} from "@/features/find/discoveryThemes";
import { normalizePreference, type ThemePreference } from "@/features/find/discoveryMatch";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; reason: string; detail?: string };

/**
 * Die eigene Suche speichern.
 *
 * ---------------------------------------------------------------------------
 * ALLES AUF EINMAL, UND IMMER MIT DER FASSUNG
 * ---------------------------------------------------------------------------
 *
 * Die sechs Themen sind eine Auswahl und keine sechs Einstellungen: Wer eins
 * auf „egal" stellt, hat damit auch gesagt, dass die anderen bleiben. Ein
 * Aufruf je Thema könnte dazwischen abbrechen und eine halbe Suche hinterlassen.
 *
 * Die Fassung des Arbeitsprofils kommt mit, weil die Auswahl sich auf DEREN
 * Fragen bezieht (Spec, Abschnitt 28). Ohne sie würde eine Auswahl, die zu
 * anderen Fragen getroffen wurde, stillschweigend weiterbenutzt.
 */
export async function saveDiscoveryPreferences(
  preferences: readonly ThemePreference[],
): Promise<Result> {
  const bereinigt: ThemePreference[] = [];
  for (const entry of preferences) {
    if (!THEME_IDS.includes(entry.themeId)) {
      return { ok: false, reason: "unknown_theme", detail: entry.themeId };
    }
    if (!(DIRECTIONS as readonly string[]).includes(entry.direction)) {
      return { ok: false, reason: "unknown_direction", detail: entry.direction };
    }
    if (!(IMPORTANCES as readonly number[]).includes(entry.importance)) {
      return { ok: false, reason: "unknown_importance", detail: String(entry.importance) };
    }
    // „egal" mit Gewicht 2 kommt aus einer halb ausgefuellten Maske und ist
    // kein Fehler der Person - er wird aufgeloest und nicht abgewiesen.
    bereinigt.push(
      normalizePreference({
        themeId: entry.themeId,
        direction: entry.direction as Direction,
        importance: entry.importance as Importance,
      }),
    );
  }
  if (new Set(bereinigt.map((entry) => entry.themeId)).size !== bereinigt.length) {
    return { ok: false, reason: "theme_twice" };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return { ok: false, reason: "not_authenticated" };

  const { data: set, error: setError } = await supabase
    .from("discovery_preference_sets")
    .upsert(
      {
        user_id: auth.user.id,
        founder_profile_instrument_id: FOUNDER_PROFILE_INSTRUMENT_ID,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,founder_profile_instrument_id" },
    )
    .select("id")
    .single();
  if (setError || !set) {
    return { ok: false, reason: "save_failed", detail: setError?.message };
  }

  // Erst räumen, dann setzen: Was nicht mehr in der Liste steht, ist nicht
  // mehr ausgewählt. Ein Aufräumen danach könnte ausfallen und eine alte
  // Angabe stehen lassen, die niemand mehr gemacht hat.
  const { error: clearError } = await supabase
    .from("discovery_theme_preferences")
    .delete()
    .eq("preference_set_id", set.id);
  if (clearError) return { ok: false, reason: "save_failed", detail: clearError.message };

  if (bereinigt.length === 0) return { ok: true };

  const { error: insertError } = await supabase.from("discovery_theme_preferences").insert(
    bereinigt.map((entry) => ({
      preference_set_id: set.id,
      theme_id: entry.themeId,
      direction: entry.direction,
      importance: entry.importance,
    })),
  );
  if (insertError) return { ok: false, reason: "save_failed", detail: insertError.message };

  return { ok: true };
}
