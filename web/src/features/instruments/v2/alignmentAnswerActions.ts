"use server";

import { createClient } from "@/lib/supabase/server";
import { ALIGNMENT_V2_INSTRUMENT_ID } from "@/features/instruments/instruments";
import {
  answerFormatOfBlock,
  type AlignmentAnswer,
} from "@/features/instruments/v2/alignmentAnswersV2";
import {
  missingRequiredBlocks,
  type AlignmentModule,
} from "@/features/instruments/v2/alignmentProgress";
import { validateAlignmentAnswer } from "@/features/instruments/v2/validateAlignmentAnswer";

/**
 * Speichern, zurücknehmen, abgeben - Instrument v2.
 *
 * ---------------------------------------------------------------------------
 * DREI DINGE, DIE HIER ANDERS SIND ALS IN V1
 * ---------------------------------------------------------------------------
 *
 * JEDE ANTWORT NENNT IHRE FASSUNG. Der Entwurf wird mit
 * `ALIGNMENT_V2_INSTRUMENT_ID` gesucht UND angelegt. Ein halb ausgefüllter
 * Fragebogen der alten Fassung darf niemandem vorgelegt werden, der gerade
 * die neue ausfüllt - und umgekehrt.
 *
 * GEPRÜFT WIRD VOR DEM SCHREIBEN, NICHT DANACH. Die Datenbank hält dieselben
 * Regeln noch einmal; das ist Absicht. Aber ein Fehler, der erst als
 * Constraint-Verletzung auffällt, kommt beim Menschen als „etwas ist
 * schiefgelaufen" an. Die Prüfung hier kann sagen, WAS.
 *
 * ZURÜCKNEHMEN IST ERLAUBT. Eine Antwort zu löschen muss möglich sein, solange
 * nichts abgegeben ist - sonst wäre „ich möchte das doch nicht angeben" eine
 * Sackgasse. Nach der Abgabe ist der Fragebogen ein Dokument.
 */

type Result = { ok: true } | { ok: false; reason: string; detail?: string };

async function draftFor(module: AlignmentModule) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error("not_authenticated");
  const userId = auth.user.id;

  const { data: existing } = await supabase
    .from("assessments")
    .select("id, module, submitted_at, instrument_id")
    .eq("user_id", userId)
    .eq("module", module)
    .eq("instrument_id", ALIGNMENT_V2_INSTRUMENT_ID)
    .is("submitted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return { supabase, draft: existing };

  const { data: created, error } = await supabase
    .from("assessments")
    .insert({ user_id: userId, module, instrument_id: ALIGNMENT_V2_INSTRUMENT_ID })
    .select("id, module, submitted_at, instrument_id")
    .single();

  if (error || !created) throw new Error(error?.message ?? "draft_create_failed");
  return { supabase, draft: created };
}

export async function saveAlignmentAnswer(
  module: AlignmentModule,
  answer: AlignmentAnswer
): Promise<Result> {
  const verdict = validateAlignmentAnswer(answer);
  if (!verdict.ok) return verdict;

  const { supabase, draft } = await draftFor(module);

  const { error } = await supabase.from("alignment_answers").upsert(
    {
      assessment_id: draft.id,
      block_id: answer.blockId,
      answer_format: answer.answerFormat,
      value: answer.value ?? null,
      missing_code: answer.missingCode ?? null,
      answered_at: new Date().toISOString(),
    },
    { onConflict: "assessment_id,block_id" }
  );

  if (error) return { ok: false, reason: "save_failed", detail: error.message };
  return { ok: true };
}

/** Eine Antwort zurücknehmen. Danach gilt der Block wieder als offen. */
export async function clearAlignmentAnswer(
  module: AlignmentModule,
  blockId: string
): Promise<Result> {
  if (!answerFormatOfBlock(blockId)) return { ok: false, reason: "unknown_block", detail: blockId };

  const { supabase, draft } = await draftFor(module);
  const { error } = await supabase
    .from("alignment_answers")
    .delete()
    .eq("assessment_id", draft.id)
    .eq("block_id", blockId);

  if (error) return { ok: false, reason: "clear_failed", detail: error.message };
  return { ok: true };
}

/**
 * Abgeben.
 *
 * VERLANGT VOLLSTÄNDIGKEIT, UND ZWAR ZU RECHT. Für jeden Block gibt es ein
 * Wort - notfalls „noch offen" oder „möchte ich nicht angeben". Niemand muss
 * etwas hinschreiben, was er nicht meint, nur um weiterzukommen. Deshalb ist
 * eine fehlende Zeile hier wirklich ein Versehen und keine Haltung.
 */
export async function submitAlignmentModule(
  module: AlignmentModule,
  step?: 1 | 2
): Promise<Result & { missing?: string[] }> {
  const { supabase, draft } = await draftFor(module);

  const { data: rows, error: readError } = await supabase
    .from("alignment_answers")
    .select("block_id")
    .eq("assessment_id", draft.id);

  if (readError) return { ok: false, reason: "read_failed", detail: readError.message };

  const missing = missingRequiredBlocks(module, (rows ?? []).map((row) => row.block_id), step);
  if (missing.length > 0) return { ok: false, reason: "incomplete", missing };

  const { error } = await supabase
    .from("assessments")
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", draft.id)
    .is("submitted_at", null);

  if (error) return { ok: false, reason: "submit_failed", detail: error.message };
  return { ok: true };
}
