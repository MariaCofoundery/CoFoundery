"use server";

import { createClient } from "@/lib/supabase/server";
import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { getItemV21 } from "@/features/instruments/v21/registryV21";

/**
 * Den Ausfüllverlauf aufzeichnen - für den Pretest.
 *
 * ---------------------------------------------------------------------------
 * WARUM ÜBERHAUPT
 * ---------------------------------------------------------------------------
 *
 * Die fachliche Durchsicht nennt für den Pilot: Ausfülldauer tatsächlich
 * messen, Missing-Gründe auswerten, Abbruchstellen finden. Ohne das lernt man
 * aus 40 bis 80 Ausfüllenden nichts außer Bauchgefühl - und „das darf nicht
 * durch bloßes Bauchgefühl entschieden werden“ steht dort wörtlich.
 *
 * ---------------------------------------------------------------------------
 * ZWEI REGELN, DIE WICHTIGER SIND ALS DIE MESSUNG SELBST
 * ---------------------------------------------------------------------------
 *
 * SIE DARF DAS AUSFÜLLEN NICHT STÖREN. Kein Blockieren, kein Warten, keine
 * Fehlermeldung. Wenn die Aufzeichnung scheitert, merkt das niemand - eine
 * Messung, die den gemessenen Vorgang behindert, misst am Ende sich selbst.
 *
 * SIE MISST DEN VORGANG, NICHT DIE PERSON. `revisions` ist ein Zögern-Signal
 * für die Nachfrage im Interview („du bist da dreimal zurück - woran lag
 * das?“) und sagt nichts über die Güte einer Antwort. Wer dreimal ändert,
 * denkt vielleicht gründlich nach.
 */

/** Findet den laufenden Fragebogen - ohne einen anzulegen. */
async function currentAssessment() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return null;

  const { data } = await supabase
    .from("assessments")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("module", "base")
    .eq("instrument_id", ALIGNMENT_V21_INSTRUMENT_ID)
    .is("submitted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? { supabase, assessmentId: data.id } : null;
}

/**
 * Diese Frage war auf dem Bildschirm.
 *
 * Legt eine Zeile an, falls es noch keine gibt - und lässt eine vorhandene in
 * Ruhe. `first_seen_at` soll das ERSTE Mal festhalten, nicht das letzte.
 */
export async function noteItemSeen(itemIds: string[]): Promise<void> {
  const known = itemIds.filter((itemId) => getItemV21(itemId));
  if (known.length === 0) return;

  const current = await currentAssessment();
  if (!current) return;

  await current.supabase.from("alignment_item_views").upsert(
    known.map((blockId) => ({ assessment_id: current.assessmentId, block_id: blockId })),
    // ignoreDuplicates: sonst überschriebe jeder erneute Blick den Zeitpunkt
    // des ersten - und die Dauer wäre immer die der letzten Sitzung.
    { onConflict: "assessment_id,block_id", ignoreDuplicates: true },
  );
}

/**
 * Diese Frage wurde beantwortet.
 *
 * Beim zweiten Mal zählt es als Änderung. Die Zeile kann fehlen, wenn jemand
 * mit einem alten Reiter arbeitet - dann wird sie angelegt, und die Dauer ist
 * eben unbekannt statt falsch.
 */
export async function noteItemAnswered(itemId: string): Promise<void> {
  if (!getItemV21(itemId)) return;

  const current = await currentAssessment();
  if (!current) return;

  const { data: existing } = await current.supabase
    .from("alignment_item_views")
    .select("answered_at, revisions")
    .eq("assessment_id", current.assessmentId)
    .eq("block_id", itemId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (!existing) {
    await current.supabase.from("alignment_item_views").insert({
      assessment_id: current.assessmentId,
      block_id: itemId,
      first_seen_at: now,
      answered_at: now,
    });
    return;
  }

  await current.supabase
    .from("alignment_item_views")
    .update({
      answered_at: now,
      // Erst die zweite Antwort ist eine Änderung.
      revisions: existing.answered_at ? existing.revisions + 1 : existing.revisions,
      updated_at: now,
    })
    .eq("assessment_id", current.assessmentId)
    .eq("block_id", itemId);
}
