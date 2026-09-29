"use server";

import { createClient } from "@/lib/supabase/server";
import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { getItemV21 } from "@/features/instruments/v21/registryV21";
import { INSTRUMENT_OF } from "@/features/instruments/align/reportData";
import { getItemsV22, type AssessmentScope } from "@/features/instruments/align/registries";

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

/**
 * Welcher Bogen gemessen wird.
 *
 * ---------------------------------------------------------------------------
 * ERWEITERT AM 29.09.2026 - VORHER MASS SIE NUR v2.1
 * ---------------------------------------------------------------------------
 *
 * Die Messung hing fest an `founder-alignment-v2-1`. Die beiden Boegen, die
 * jetzt tatsaechlich vorgelegt werden, zeichneten gar nichts auf - die
 * Auswertung in `docs/pretest-auswertung.md` haette null Zeilen geliefert, und
 * gemerkt haette man es erst nach dem Pilot.
 *
 * Ohne Angabe bleibt es bei v2.1: Die Seiten, die darauf zeigen, rufen weiter
 * auf, wie sie es taten.
 */
export type ViewScope = AssessmentScope | "v21";

function locator(scope: ViewScope) {
  return scope === "v21"
    ? { module: "base", instrumentId: ALIGNMENT_V21_INSTRUMENT_ID }
    : { module: scope, instrumentId: INSTRUMENT_OF[scope] };
}

/** Kennt dieser Bogen diese Frage? Eine fremde wird nicht aufgezeichnet. */
function knows(scope: ViewScope, itemId: string): boolean {
  return scope === "v21"
    ? Boolean(getItemV21(itemId))
    : getItemsV22(scope).some((item) => item.itemId === itemId);
}

/**
 * Findet den laufenden Fragebogen - ohne einen anzulegen.
 *
 * KEIN `resolveVenture`. Das legt eins an, wenn keins da ist - eine Messung
 * darf nichts entstehen lassen. Das gemeinte Vorhaben kommt von der Seite mit,
 * und ohne Angabe wird der neueste Entwurf genommen.
 */
async function currentAssessment(scope: ViewScope, ventureId?: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return null;

  const { module, instrumentId } = locator(scope);

  const suche = supabase
    .from("assessments")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("module", module)
    .eq("instrument_id", instrumentId)
    .is("submitted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const { data } = ventureId
    ? await suche.eq("venture_id", ventureId).maybeSingle()
    : await suche.maybeSingle();

  return data ? { supabase, assessmentId: data.id } : null;
}

/**
 * Diese Frage war auf dem Bildschirm.
 *
 * Legt eine Zeile an, falls es noch keine gibt - und lässt eine vorhandene in
 * Ruhe. `first_seen_at` soll das ERSTE Mal festhalten, nicht das letzte.
 */
export async function noteItemSeen(
  itemIds: string[],
  scope: ViewScope = "v21",
  ventureId?: string,
): Promise<void> {
  const known = itemIds.filter((itemId) => knows(scope, itemId));
  if (known.length === 0) return;

  const current = await currentAssessment(scope, ventureId);
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
export async function noteItemAnswered(
  itemId: string,
  scope: ViewScope = "v21",
  ventureId?: string,
): Promise<void> {
  if (!knows(scope, itemId)) return;

  const current = await currentAssessment(scope, ventureId);
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
