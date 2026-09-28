"use server";

import { createClient } from "@/lib/supabase/server";
import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { getItemV21 } from "@/features/instruments/v21/registryV21";
import {
  validateAnswerV21,
  validateFollowUpV21,
  type AlignmentAnswerV21,
} from "@/features/instruments/v21/answersV21";
import { basisOf, missingItemIds } from "@/features/instruments/v21/progressV21";

/**
 * Speichern, zurücknehmen, abgeben - Instrument v2.1.
 *
 * ---------------------------------------------------------------------------
 * DREI REGELN
 * ---------------------------------------------------------------------------
 *
 * JEDE ANTWORT NENNT IHRE FASSUNG. Der Entwurf wird mit
 * `ALIGNMENT_V21_INSTRUMENT_ID` gesucht UND angelegt. Ein halb ausgefüllter
 * Fragebogen einer anderen Fassung darf niemandem vorgelegt werden, der
 * gerade diese ausfüllt.
 *
 * GEPRÜFT WIRD VOR DEM SCHREIBEN. Die Datenbank hält dieselben Regeln noch
 * einmal; das ist Absicht. Aber ein Fehler, der erst als Constraint-Verletzung
 * auffällt, kommt beim Menschen als „etwas ist schiefgelaufen“ an. Die Prüfung
 * hier kann sagen, WAS.
 *
 * ZURÜCKNEHMEN IST ERLAUBT, solange nichts abgegeben ist - sonst wäre „ich
 * möchte das doch nicht angeben“ eine Sackgasse.
 */

type Result = { ok: true } | { ok: false; reason: string; detail?: string };

/** v2.1 ist ein Fragebogen, kein Paar. Die Spalte bleibt, der Wert ist fest. */
const MODULE = "base";

async function draft() {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error("not_authenticated");

  const { data: existing } = await supabase
    .from("assessments")
    .select("id, submitted_at")
    .eq("user_id", auth.user.id)
    .eq("module", MODULE)
    .eq("instrument_id", ALIGNMENT_V21_INSTRUMENT_ID)
    .is("submitted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return { supabase, assessment: existing };

  const { data: created, error } = await supabase
    .from("assessments")
    .insert({ user_id: auth.user.id, module: MODULE, instrument_id: ALIGNMENT_V21_INSTRUMENT_ID })
    .select("id, submitted_at")
    .single();

  if (error || !created) throw new Error(error?.message ?? "draft_create_failed");
  return { supabase, assessment: created };
}

/**
 * Die Markierung und die Bedingung stehen NEBEN der Antwort, nicht in ihr.
 *
 * „Darüber möchte ich sprechen“ ist keine Antwort auf die Frage - und „was
 * meine Wahl ändern würde“ auch nicht. Beides gehört deshalb nicht in `value`:
 * Sonst würde es mitverglichen, und aus einer freiwilligen Notiz würde ein
 * Unterschied zwischen zwei Menschen.
 */
export type AnswerAnnotations = {
  markedForDiscussion?: boolean;
  changeCondition?: string | null;
};

async function readAnswers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assessmentId: string,
): Promise<Record<string, AlignmentAnswerV21>> {
  const { data: rows } = await supabase
    .from("alignment_answers")
    .select("block_id, value, missing_code")
    .eq("assessment_id", assessmentId);

  return Object.fromEntries(
    (rows ?? []).map((row) => [
      row.block_id,
      (row.missing_code
        ? { blockId: row.block_id, missingCode: row.missing_code }
        : { blockId: row.block_id, value: row.value }) as AlignmentAnswerV21,
    ]),
  );
}

export async function saveAnswerV21(
  answer: AlignmentAnswerV21,
  annotations: AnswerAnnotations = {},
): Promise<Result> {
  const item = getItemV21(answer.blockId);
  if (!item) return { ok: false, reason: "unknown_block", detail: answer.blockId };

  const { supabase, assessment } = await draft();

  // Eine Anschlussfrage wird gegen ihre Voraussetzung geprüft, nicht für sich.
  // Sonst landet eine Antwort in der Ablage, die auf nichts zeigt.
  const basis = basisOf(answer.blockId);
  const verdict = basis
    ? validateFollowUpV21(answer, (await readAnswers(supabase, assessment.id))[basis] ?? null)
    : validateAnswerV21(answer);
  if (!verdict.ok) return verdict;

  const { error } = await supabase.from("alignment_answers").upsert(
    {
      assessment_id: assessment.id,
      block_id: answer.blockId,
      answer_format: item.answerFormat,
      value: answer.value ?? null,
      missing_code: answer.missingCode ?? null,
      marked_for_discussion: annotations.markedForDiscussion ?? false,
      change_condition: annotations.changeCondition?.trim() || null,
      answered_at: new Date().toISOString(),
    },
    { onConflict: "assessment_id,block_id" },
  );

  if (error) return { ok: false, reason: "save_failed", detail: error.message };
  return { ok: true };
}

/** Eine Antwort zurücknehmen. Danach gilt die Frage wieder als offen. */
export async function clearAnswerV21(itemId: string): Promise<Result> {
  if (!getItemV21(itemId)) return { ok: false, reason: "unknown_block", detail: itemId };

  const { supabase, assessment } = await draft();
  const { error } = await supabase
    .from("alignment_answers")
    .delete()
    .eq("assessment_id", assessment.id)
    .eq("block_id", itemId);

  if (error) return { ok: false, reason: "clear_failed", detail: error.message };
  return { ok: true };
}

/**
 * Abgeben.
 *
 * VERLANGT VOLLSTÄNDIGKEIT, UND ZWAR ZU RECHT: Für jede Frage gibt es ein
 * Wort, notfalls ein Auslassungsgrund. Deshalb ist eine fehlende Zeile hier
 * wirklich ein Versehen und keine Haltung.
 *
 * Gezählt wird, was DIESE Person sieht. Wer in L01 keine Grenze nennt, bekommt
 * L02 und L03 nicht zu sehen - sie dann zu verlangen hieße, jemanden für eine
 * zulässige Antwort zu bestrafen.
 */
export async function submitV21(): Promise<Result & { missing?: string[] }> {
  const { supabase, assessment } = await draft();
  const answers = await readAnswers(supabase, assessment.id);

  const missing = missingItemIds(answers);
  if (missing.length > 0) return { ok: false, reason: "incomplete", missing };

  const { error } = await supabase
    .from("assessments")
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", assessment.id)
    .is("submitted_at", null);

  if (error) return { ok: false, reason: "submit_failed", detail: error.message };
  return { ok: true };
}
