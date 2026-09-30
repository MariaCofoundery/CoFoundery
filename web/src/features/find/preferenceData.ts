import "server-only";

import { FOUNDER_PROFILE_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { THEME_IDS, type Direction, type Importance } from "@/features/find/discoveryThemes";
import { normalizePreference, type ThemePreference } from "@/features/find/discoveryMatch";
import { createClient } from "@/lib/supabase/server";

/**
 * Die eigene Suche — lesen und schreiben.
 *
 * ---------------------------------------------------------------------------
 * SIE IST PRIVAT
 * ---------------------------------------------------------------------------
 *
 * Niemand liest die Präferenzen einer anderen Person, auch nicht über diesen
 * Weg. Was das beidseitige Matching davon braucht, ist das Ergebnis und nicht
 * die Auswahl — dafür gibt es eine eigene, enge Funktion.
 *
 * ---------------------------------------------------------------------------
 * SIE IST KEIN TESTABSCHLUSS
 * ---------------------------------------------------------------------------
 *
 * Spec, Abschnitt 26: Es gibt kein „abgeben", keinen Zeitpunkt, ab dem nichts
 * mehr geht. Gespeichert wird, und später ändert man es wieder.
 */

export type PreferenceSet = {
  preferences: ThemePreference[];
  /**
   * Zu welcher Fassung des Arbeitsprofils die Auswahl gehört.
   *
   * Steht hier eine andere als die aktuelle, wurde sie zu anderen Fragen
   * getroffen — siehe `stale`.
   */
  instrumentId: string;
  /**
   * Die Auswahl stammt aus einer anderen Fassung.
   *
   * Spec, Abschnitt 28: „nicht still weiterverwenden". Die Oberfläche fragt
   * dann nach, statt eine Zuordnung zu benutzen, die vielleicht nicht mehr
   * stimmt.
   */
  stale: boolean;
  updatedAt: string | null;
};

/** Leer heißt: nichts festgelegt — und nicht „sechsmal egal". */
export const NO_PREFERENCES: PreferenceSet = {
  preferences: [],
  instrumentId: FOUNDER_PROFILE_INSTRUMENT_ID,
  stale: false,
  updatedAt: null,
};

export async function getOwnPreferences(userId: string): Promise<PreferenceSet> {
  try {
    const supabase = await createClient();
    const { data: set } = await supabase
      .from("discovery_preference_sets")
      .select("id, founder_profile_instrument_id, updated_at")
      .eq("user_id", userId)
      // Die aktuelle Fassung zuerst; eine ältere nur, wenn es keine neue gibt.
      .order("updated_at", { ascending: false })
      .limit(5);

    const rows = set ?? [];
    const aktuell = rows.find(
      (row) => row.founder_profile_instrument_id === FOUNDER_PROFILE_INSTRUMENT_ID,
    );
    const gewaehlt = aktuell ?? rows[0];
    if (!gewaehlt) return NO_PREFERENCES;

    const { data: rowsOfSet } = await supabase
      .from("discovery_theme_preferences")
      .select("theme_id, direction, importance")
      .eq("preference_set_id", gewaehlt.id);

    // EIN THEMA, DAS ES NICHT MEHR GIBT, WIRD NICHT ANGEZEIGT. Es bleibt in
    // der Datenbank stehen - gelöscht wird hier nichts -, aber es geht in
    // keine Rechnung ein.
    const preferences = (rowsOfSet ?? [])
      .filter((row) => THEME_IDS.includes(row.theme_id))
      .map((row) =>
        normalizePreference({
          themeId: row.theme_id,
          direction: row.direction as Direction,
          importance: row.importance as Importance,
        }),
      );

    return {
      preferences,
      instrumentId: gewaehlt.founder_profile_instrument_id,
      stale: gewaehlt.founder_profile_instrument_id !== FOUNDER_PROFILE_INSTRUMENT_ID,
      updatedAt: (gewaehlt.updated_at as string | null) ?? null,
    };
  } catch {
    // Ohne Präferenzen zeigt FIND weiter Profile - nur ohne Aussage dazu,
    // welche Arbeitsweisen zu der Suche passen. Das ist der Zustand aus
    // Abschnitt 25 und kein Fehlerbildschirm.
    return NO_PREFERENCES;
  }
}
