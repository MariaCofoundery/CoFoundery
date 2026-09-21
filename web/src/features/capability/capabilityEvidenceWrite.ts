import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { MAX_CONFIRMED_AREAS } from "./capabilityTypes";

/**
 * Eine erzählte Sache in Bereiche eintragen.
 *
 * HERAUSGEZOGEN AM 21.09.2026 aus `saveCapabilityEvidenceAction`, weil das
 * Interview dasselbe tut: aus einer Erzaehlung werden Eintraege, an einem
 * davon haengt der Beleg. Zwei Umsetzungen desselben Vorgangs waeren zwei
 * Wahrheiten darueber, wie eine Staerke in dieses Modell kommt - und die
 * zweite haette beim ersten Schema-Wechsel gefehlt.
 *
 * WAS HIER NICHT ENTSCHIEDEN WIRD: welche Bereiche es sind. Die Auswahl
 * trifft immer ein Mensch (oder, ohne JavaScript, die Regel-Auswertung im
 * Aufrufer). Diese Funktion schreibt, was ihr gesagt wird.
 *
 * DER AUFFANGWERT IST TEIL DES VERSPRECHENS: Bleibt keine Zuordnung uebrig,
 * wandert die Erzaehlung nach `other`, statt verloren zu gehen. Das ist
 * ehrlicher als eine schlechte Zuordnung - und wenn sich dort etwas haeuft,
 * ist das das Signal, die Begriffsliste zu ueberarbeiten.
 */

export type AttachEvidenceResult =
  | { ok: true; evidenceId: string; areaIds: string[]; primaryAreaId: string }
  | { ok: false; reason: "area" | "save" };

export async function attachCapabilityEvidence(params: {
  client: SupabaseClient;
  userId: string;
  /** Die bestaetigten Bereiche. Leer ist erlaubt - dann greift der Auffangwert. */
  areaIds: readonly string[];
  narrative: string;
  /** Null heisst "nicht angegeben" und ueberschreibt eine vorhandene Stufe nicht. */
  applicationLevel: number | null;
  /** Null heisst "hier nicht gefragt" und ueberschreibt einen vorhandenen Wunsch nicht. */
  ownershipWish: string | null;
}): Promise<AttachEvidenceResult> {
  const { client, userId, narrative } = params;

  const chosen = [...new Set(params.areaIds.map((areaId) => areaId.trim()).filter(Boolean))].slice(
    0,
    MAX_CONFIRMED_AREAS
  );
  const areaIds = chosen.length > 0 ? chosen : ["other"];
  const primaryAreaId = areaIds[0];

  const existing = await client
    .from("person_capability_entries")
    .select("id,area_id")
    .eq("user_id", userId)
    .in("area_id", areaIds);
  if (existing.error) return { ok: false, reason: "save" };

  const known = new Map(
    (existing.data ?? []).map((row) => [row.area_id as string, row.id as string])
  );
  const missing = areaIds.filter((areaId) => !known.has(areaId));

  if (missing.length > 0) {
    const inserted = await client
      .from("person_capability_entries")
      .insert(missing.map((areaId) => ({ user_id: userId, area_id: areaId })))
      .select("id,area_id");
    // Ein unbekannter Bereich kommt aus einem manipulierten Formular, nicht aus
    // der Oberflaeche. Der Fremdschluessel auf capability_areas faengt ihn ab;
    // der eigene Schluessel sagt nur genauer, was war.
    if (inserted.error) {
      return { ok: false, reason: inserted.error.message.includes("area_id") ? "area" : "save" };
    }
    for (const row of inserted.data ?? []) {
      known.set(row.area_id as string, row.id as string);
    }
  }

  const primaryEntryId = known.get(primaryAreaId);
  if (!primaryEntryId) return { ok: false, reason: "save" };

  // Stufe und Wunsch gelten fuer den Bereich, dem die Erzaehlung zugeordnet
  // wurde. Nur setzen, was angegeben ist: leer heisst leer, nicht Stufe 1 und
  // nicht "unklar".
  const patch: Record<string, unknown> = {};
  if (params.applicationLevel !== null) patch.application_level = params.applicationLevel;
  if (params.ownershipWish !== null) patch.ownership_wish = params.ownershipWish;

  if (Object.keys(patch).length > 0) {
    const { error } = await client
      .from("person_capability_entries")
      .update(patch)
      .eq("id", primaryEntryId);
    if (error) return { ok: false, reason: "save" };
  }

  // Der Beleg haengt am Eintrag, weil er genau diese Einstufung begruendet.
  const { data, error } = await client
    .from("person_capability_evidence")
    .insert({ entry_id: primaryEntryId, narrative })
    .select("id")
    .single();
  if (error || !data) return { ok: false, reason: "save" };

  return {
    ok: true,
    evidenceId: data.id as string,
    areaIds,
    primaryAreaId,
  };
}
