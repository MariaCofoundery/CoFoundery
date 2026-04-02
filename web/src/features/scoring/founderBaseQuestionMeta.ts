import type { QuestionnaireQuestionType } from "@/features/questionnaire/questionnaireShared";
import { type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import { normalizeStoredBaseAnswerToFounderPercent } from "@/features/scoring/founderBaseNormalization";

// Legacy compatibility bridge:
// This module no longer defines the active founder compatibility semantics.
// Its remaining role is limited to translating the current Supabase questionnaire
// contract (`q01...q48`) into V2-native runtime answers via the compatibility
// adapter in `founderCompatibilityAnswerRuntime.ts`.

export type FounderBaseItemPolarity = "high_is_left_pole" | "high_is_right_pole";

export type FounderBaseQuestionScoreMeta = {
  id: string;
  dimension: FounderDimensionKey;
  type: QuestionnaireQuestionType;
  polarity: FounderBaseItemPolarity;
};

export const FOUNDER_BASE_QUESTION_SCORE_META: FounderBaseQuestionScoreMeta[] = [
  { id: "q01_vision_l1", dimension: "Unternehmenslogik", type: "likert", polarity: "high_is_right_pole" },
  { id: "q02_collaboration_l1", dimension: "Arbeitsstruktur & Zusammenarbeit", type: "likert", polarity: "high_is_right_pole" },
  { id: "q03_decision_l1", dimension: "Entscheidungslogik", type: "likert", polarity: "high_is_right_pole" },
  { id: "q04_risk_l1", dimension: "Risikoorientierung", type: "likert", polarity: "high_is_right_pole" },
  { id: "q05_commitment_l1", dimension: "Commitment", type: "likert", polarity: "high_is_right_pole" },
  { id: "q06_conflict_l1", dimension: "Konfliktstil", type: "likert", polarity: "high_is_right_pole" },
  { id: "q07_vision_fc1", dimension: "Unternehmenslogik", type: "forced_choice", polarity: "high_is_left_pole" },
  { id: "q08_collaboration_fc1", dimension: "Arbeitsstruktur & Zusammenarbeit", type: "forced_choice", polarity: "high_is_right_pole" },
  { id: "q09_decision_fc1", dimension: "Entscheidungslogik", type: "forced_choice", polarity: "high_is_left_pole" },
  { id: "q10_risk_fc1", dimension: "Risikoorientierung", type: "forced_choice", polarity: "high_is_left_pole" },
  { id: "q11_commitment_fc1", dimension: "Commitment", type: "forced_choice", polarity: "high_is_left_pole" },
  { id: "q12_conflict_fc1", dimension: "Konfliktstil", type: "forced_choice", polarity: "high_is_right_pole" },
  { id: "q13_vision_s1", dimension: "Unternehmenslogik", type: "scenario", polarity: "high_is_left_pole" },
  { id: "q14_collaboration_s1", dimension: "Arbeitsstruktur & Zusammenarbeit", type: "scenario", polarity: "high_is_left_pole" },
  { id: "q15_decision_s1", dimension: "Entscheidungslogik", type: "scenario", polarity: "high_is_right_pole" },
  { id: "q16_risk_s1", dimension: "Risikoorientierung", type: "scenario", polarity: "high_is_right_pole" },
  { id: "q17_commitment_s1", dimension: "Commitment", type: "scenario", polarity: "high_is_right_pole" },
  { id: "q18_conflict_s1", dimension: "Konfliktstil", type: "scenario", polarity: "high_is_right_pole" },
  { id: "q19_vision_l2", dimension: "Unternehmenslogik", type: "likert", polarity: "high_is_left_pole" },
  { id: "q20_collaboration_l2", dimension: "Arbeitsstruktur & Zusammenarbeit", type: "likert", polarity: "high_is_left_pole" },
  { id: "q21_decision_l2", dimension: "Entscheidungslogik", type: "likert", polarity: "high_is_left_pole" },
  { id: "q22_risk_l2", dimension: "Risikoorientierung", type: "likert", polarity: "high_is_right_pole" },
  { id: "q23_commitment_l2", dimension: "Commitment", type: "likert", polarity: "high_is_right_pole" },
  { id: "q24_conflict_l2", dimension: "Konfliktstil", type: "likert", polarity: "high_is_right_pole" },
  { id: "q25_vision_fc2", dimension: "Unternehmenslogik", type: "forced_choice", polarity: "high_is_left_pole" },
  { id: "q26_collaboration_fc2", dimension: "Arbeitsstruktur & Zusammenarbeit", type: "forced_choice", polarity: "high_is_right_pole" },
  { id: "q27_decision_fc2", dimension: "Entscheidungslogik", type: "forced_choice", polarity: "high_is_left_pole" },
  { id: "q28_risk_fc2", dimension: "Risikoorientierung", type: "forced_choice", polarity: "high_is_left_pole" },
  { id: "q29_commitment_fc2", dimension: "Commitment", type: "forced_choice", polarity: "high_is_left_pole" },
  { id: "q30_conflict_fc2", dimension: "Konfliktstil", type: "forced_choice", polarity: "high_is_left_pole" },
  { id: "q31_vision_s2", dimension: "Unternehmenslogik", type: "scenario", polarity: "high_is_left_pole" },
  { id: "q32_collaboration_s2", dimension: "Arbeitsstruktur & Zusammenarbeit", type: "scenario", polarity: "high_is_left_pole" },
  { id: "q33_decision_s2", dimension: "Entscheidungslogik", type: "scenario", polarity: "high_is_right_pole" },
  { id: "q34_risk_s2", dimension: "Risikoorientierung", type: "scenario", polarity: "high_is_right_pole" },
  { id: "q35_commitment_s2", dimension: "Commitment", type: "scenario", polarity: "high_is_right_pole" },
  { id: "q36_conflict_s2", dimension: "Konfliktstil", type: "scenario", polarity: "high_is_right_pole" },
  { id: "q37_vision_s3", dimension: "Unternehmenslogik", type: "scenario", polarity: "high_is_left_pole" },
  { id: "q38_collaboration_s3", dimension: "Arbeitsstruktur & Zusammenarbeit", type: "scenario", polarity: "high_is_left_pole" },
  { id: "q39_decision_s3", dimension: "Entscheidungslogik", type: "scenario", polarity: "high_is_right_pole" },
  { id: "q40_risk_s3", dimension: "Risikoorientierung", type: "scenario", polarity: "high_is_right_pole" },
  { id: "q41_commitment_s3", dimension: "Commitment", type: "scenario", polarity: "high_is_right_pole" },
  { id: "q42_conflict_s3", dimension: "Konfliktstil", type: "scenario", polarity: "high_is_right_pole" },
  { id: "q43_vision_s4", dimension: "Unternehmenslogik", type: "scenario", polarity: "high_is_left_pole" },
  { id: "q44_collaboration_s4", dimension: "Arbeitsstruktur & Zusammenarbeit", type: "scenario", polarity: "high_is_left_pole" },
  { id: "q45_decision_s4", dimension: "Entscheidungslogik", type: "scenario", polarity: "high_is_right_pole" },
  { id: "q46_risk_s4", dimension: "Risikoorientierung", type: "scenario", polarity: "high_is_right_pole" },
  { id: "q47_commitment_s4", dimension: "Commitment", type: "scenario", polarity: "high_is_right_pole" },
  { id: "q48_conflict_s4", dimension: "Konfliktstil", type: "scenario", polarity: "high_is_right_pole" },
];

export const FOUNDER_BASE_QUESTION_SCORE_META_BY_ID = new Map(
  FOUNDER_BASE_QUESTION_SCORE_META.map((entry) => [entry.id, entry])
);

export function getFounderBaseQuestionScoreMeta(questionId: string) {
  return FOUNDER_BASE_QUESTION_SCORE_META_BY_ID.get(questionId) ?? null;
}

export function applyFounderBaseItemPolarity(
  percentValue: number,
  polarity: FounderBaseItemPolarity
) {
  return polarity === "high_is_right_pole" ? percentValue : 100 - percentValue;
}

export function scoreStoredBaseAnswerToFounderPercent(questionId: string, rawValue: string) {
  const normalized = normalizeStoredBaseAnswerToFounderPercent(rawValue);
  if (normalized == null) return null;

  const meta = getFounderBaseQuestionScoreMeta(questionId);
  if (!meta) return null;

  return applyFounderBaseItemPolarity(normalized, meta.polarity);
}

export function getFounderBaseQuestionVersionMismatch(questionIds: string[]) {
  const normalizedIds = [...new Set(questionIds.filter(Boolean))];
  const knownIds = new Set(FOUNDER_BASE_QUESTION_SCORE_META.map((entry) => entry.id));
  const incoming = new Set(normalizedIds);

  const unknownIds = normalizedIds.filter((id) => !knownIds.has(id)).sort();
  const missingIds = [...knownIds].filter((id) => !incoming.has(id)).sort();

  return {
    unknownIds,
    missingIds,
    isAligned: unknownIds.length === 0 && missingIds.length === 0,
  };
}

export function assertFounderBaseQuestionVersionContract(
  questionIds: string[],
  context: string,
  options?: { allowMissing?: boolean }
) {
  const { unknownIds, missingIds, isAligned } = getFounderBaseQuestionVersionMismatch(questionIds);
  const allowMissing = options?.allowMissing === true;
  if (isAligned || (allowMissing && unknownIds.length === 0)) {
    return;
  }

  const parts: string[] = [];
  if (unknownIds.length > 0) {
    parts.push(`unknown=${unknownIds.join(",")}`);
  }
  if (!allowMissing && missingIds.length > 0) {
    parts.push(`missing=${missingIds.join(",")}`);
  }

  throw new Error(`founder_base_question_contract_mismatch (${context}): ${parts.join(" | ")}`);
}
