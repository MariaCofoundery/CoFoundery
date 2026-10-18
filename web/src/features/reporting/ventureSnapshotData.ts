import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { alignmentDisplayEntry } from "@/features/instruments/align/display";
import { readableItems } from "@/features/instruments/align/questionnaireData";
import { VENTURE_ALIGNMENT_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { readAnswer, type ReadoutEntry } from "@/features/instruments/v21/readoutV21";
import type { AppLocale } from "@/i18n/config";
import { buildVentureSnapshot, SNAPSHOT_ITEM_IDS, type SnapshotCard } from "@/features/reporting/ventureSnapshotModel";

/**
 * Die eigenen Antworten zu EINEM Vorhaben - fuer „So willst du gründen" auf
 * „Das bist du" (Phase 1.1).
 *
 * NUR DIE EIGENEN (`user_id`), NUR DIESES VORHABEN (`venture_id`), NUR DIE
 * FRAGEN DES SNAPSHOTS. Die Zeilensicherheit erlaubt ohnehin nur die eigenen;
 * die Filter stehen trotzdem hier, damit niemand sie aus einer anderen Ecke
 * fuer fremde Antworten benutzt.
 *
 * NICHT IN DER DRUCKFASSUNG: Was zu einem Vorhaben gesagt ist, gilt fuer
 * dieses Vorhaben und einen Zeitraum. In ein weitergegebenes Personenprofil
 * gehoert es nicht.
 */
export type VentureSnapshot =
  | { status: "none" }
  | { status: "draft" | "submitted"; cards: SnapshotCard[] };

export async function getVentureSnapshot(
  supabase: SupabaseClient,
  userId: string,
  ventureId: string,
  locale: AppLocale,
): Promise<VentureSnapshot> {
  try {
    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, submitted_at")
      .eq("user_id", userId)
      .eq("instrument_id", VENTURE_ALIGNMENT_INSTRUMENT_ID)
      .eq("venture_id", ventureId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!assessment) return { status: "none" };

    const { data: rows } = await supabase
      .from("alignment_answers")
      .select("block_id, value, missing_code")
      .eq("assessment_id", assessment.id)
      .in("block_id", [...SNAPSHOT_ITEM_IDS]);

    const items = new Map(readableItems("venture_alignment").map((item) => [item.itemId, item]));
    const entries: ReadoutEntry[] = ((rows ?? []) as { block_id: string; value: unknown; missing_code: string | null }[]).flatMap((row) => {
      const item = items.get(row.block_id);
      if (!item) return [];
      const entry = readAnswer(
        (row.missing_code
          ? { blockId: row.block_id, missingCode: row.missing_code }
          : { blockId: row.block_id, value: row.value }) as Parameters<typeof readAnswer>[0],
        [],
        item,
      );
      return entry ? [alignmentDisplayEntry(entry, locale)] : [];
    });

    return { status: assessment.submitted_at ? "submitted" : "draft", cards: buildVentureSnapshot(entries) };
  } catch {
    // Eine Karte weniger ist besser als eine Seite, die nicht erscheint.
    return { status: "none" };
  }
}
