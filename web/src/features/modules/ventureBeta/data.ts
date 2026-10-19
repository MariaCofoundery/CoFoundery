import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  VENTURE_ALIGNMENT_BETA_INSTRUMENT_ID,
  VENTURE_ALIGNMENT_INSTRUMENT_ID,
} from "@/features/instruments/instruments";
import { betaItems } from "@/features/modules/ventureBeta/registry";
import { takeoverRowsFrom } from "@/features/modules/ventureBeta/dataPure";
import { TAKEOVER_ELIGIBLE } from "@/features/modules/ventureBeta/takeover";

/**
 * Was die Beta-Seite lesen muss - und nicht mehr.
 *
 * NUR LESEN, NUR DIE EIGENEN. Jede Kette nennt ihr Instrument: die Beta
 * (`venture-alignment-v2-beta1`) und - nur als Angebot zur Uebernahme - die v1-Antworten der
 * identischen Items. Die v1-Antworten werden hier nur GELESEN; sie werden nie veraendert und nie
 * automatisch uebernommen.
 */
import type { BetaAnswerRow } from "@/features/modules/ventureBeta/dataPure";

export type { BetaAnswerRow };

export type BetaPageState = {
  /** Der offene Entwurf (auch ein neuer Durchlauf neben einer Abgabe). */
  draft: { id: string; answers: BetaAnswerRow[] } | null;
  /** Die neueste Abgabe - bleibt gueltig, auch neben einem neuen Entwurf. */
  submitted: { id: string; submittedAt: string; answers: BetaAnswerRow[] } | null;
  /** v1-Antworten, die uebernommen werden koennten (in Beta-IDs uebersetzt) - leer, wenn es nichts gibt. */
  takeover: BetaAnswerRow[];
};

const COLUMNS = "block_id, answer_format, value, missing_code";

async function answersOf(client: SupabaseClient, assessmentId: string): Promise<BetaAnswerRow[]> {
  const { data } = await client
    .from("alignment_answers")
    .select(COLUMNS)
    .eq("assessment_id", assessmentId)
    .in("block_id", betaItems().map((item) => item.itemId));
  return (data ?? []) as BetaAnswerRow[];
}

export async function loadBetaPageState(client: SupabaseClient, userId: string, ventureId: string): Promise<BetaPageState> {
  const latest = (instrumentId: string, submitted: boolean) => {
    let chain = client
      .from("assessments")
      .select("id, submitted_at")
      .eq("user_id", userId)
      .eq("instrument_id", instrumentId)
      .eq("venture_id", ventureId);
    chain = submitted ? chain.not("submitted_at", "is", null) : chain.is("submitted_at", null);
    return chain.order(submitted ? "submitted_at" : "created_at", { ascending: false }).limit(1).maybeSingle();
  };

  const [{ data: draft }, { data: submitted }, { data: legacy }] = await Promise.all([
    latest(VENTURE_ALIGNMENT_BETA_INSTRUMENT_ID, false),
    latest(VENTURE_ALIGNMENT_BETA_INSTRUMENT_ID, true),
    latest(VENTURE_ALIGNMENT_INSTRUMENT_ID, true),
  ]);

  const [draftAnswers, submittedAnswers, legacyAnswers] = await Promise.all([
    draft?.id ? answersOf(client, draft.id as string) : Promise.resolve(null),
    submitted?.id ? answersOf(client, submitted.id as string) : Promise.resolve(null),
    legacy?.id
      ? client
          .from("alignment_answers")
          .select(COLUMNS)
          .eq("assessment_id", legacy.id as string)
          .in("block_id", TAKEOVER_ELIGIBLE.map(([, v1Id]) => v1Id))
          .then(({ data }) => (data ?? []) as BetaAnswerRow[])
      : Promise.resolve(null),
  ]);

  return {
    draft: draft?.id && draftAnswers ? { id: draft.id as string, answers: draftAnswers } : null,
    submitted:
      submitted?.id && submittedAnswers
        ? { id: submitted.id as string, submittedAt: submitted.submitted_at as string, answers: submittedAnswers }
        : null,
    takeover: legacyAnswers ? takeoverRowsFrom(legacyAnswers) : [],
  };
}
