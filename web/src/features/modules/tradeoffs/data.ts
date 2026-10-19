import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  VENTURE_ALIGNMENT_INSTRUMENT_ID,
  VENTURE_TRADEOFFS_INSTRUMENT_ID,
} from "@/features/instruments/instruments";
import { TRADEOFF_ITEM_IDS } from "@/features/modules/tradeoffs/registry";

/**
 * Was die Seite „Werte & Zielkonflikte" lesen muss - und nicht mehr.
 *
 * NUR LESEN, NUR DIE EIGENEN. Jede Kette nennt ihr Instrument: die Vertiefung
 * (`venture-tradeoffs-v1`) und - nur als Angebot zur Uebernahme - die
 * historischen Antworten in `venture-alignment-v1`. Die alten Antworten werden
 * hier nur GELESEN; sie werden nie veraendert und nie automatisch uebernommen.
 */
export type TradeoffAnswerData = {
  block_id: string;
  value: Record<string, unknown> | null;
  missing_code: string | null;
};

export type TradeoffsPageState = {
  /** Der offene Entwurf (ein neuer Durchlauf), falls es einen gibt. */
  draft: { id: string; answers: TradeoffAnswerData[] } | null;
  /** Die neueste Abgabe - bleibt gueltig, auch neben einem neuen Entwurf. */
  submitted: { id: string; submittedAt: string; answers: TradeoffAnswerData[] } | null;
  /** Fruehere Antworten aus venture-alignment-v1 (W03-W06) - nur als Angebot, nie automatisch uebernommen. */
  legacy: { answers: TradeoffAnswerData[] } | null;
};

async function answersOf(client: SupabaseClient, assessmentId: string): Promise<TradeoffAnswerData[]> {
  const { data } = await client
    .from("alignment_answers")
    .select("block_id, value, missing_code")
    .eq("assessment_id", assessmentId)
    .in("block_id", [...TRADEOFF_ITEM_IDS]);
  return (data ?? []) as TradeoffAnswerData[];
}

export async function loadTradeoffsPageState(
  client: SupabaseClient,
  userId: string,
  ventureId: string
): Promise<TradeoffsPageState> {
  const [{ data: draft }, { data: submitted }, { data: legacy }] = await Promise.all([
    client
      .from("assessments")
      .select("id")
      .eq("user_id", userId)
      .eq("instrument_id", VENTURE_TRADEOFFS_INSTRUMENT_ID)
      .eq("venture_id", ventureId)
      .is("submitted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("assessments")
      .select("id, submitted_at")
      .eq("user_id", userId)
      .eq("instrument_id", VENTURE_TRADEOFFS_INSTRUMENT_ID)
      .eq("venture_id", ventureId)
      .not("submitted_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("assessments")
      .select("id")
      .eq("user_id", userId)
      .eq("instrument_id", VENTURE_ALIGNMENT_INSTRUMENT_ID)
      .eq("venture_id", ventureId)
      .not("submitted_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const [draftAnswers, submittedAnswers, legacyAnswers] = await Promise.all([
    draft?.id ? answersOf(client, draft.id as string) : Promise.resolve(null),
    submitted?.id ? answersOf(client, submitted.id as string) : Promise.resolve(null),
    legacy?.id ? answersOf(client, legacy.id as string) : Promise.resolve(null),
  ]);

  return {
    draft: draft?.id && draftAnswers ? { id: draft.id as string, answers: draftAnswers } : null,
    submitted:
      submitted?.id && submittedAnswers
        ? { id: submitted.id as string, submittedAt: submitted.submitted_at as string, answers: submittedAnswers }
        : null,
    // Angeboten wird die Uebernahme nur, wenn es etwas zu uebernehmen gibt.
    legacy: legacyAnswers && legacyAnswers.length > 0 ? { answers: legacyAnswers } : null,
  };
}
