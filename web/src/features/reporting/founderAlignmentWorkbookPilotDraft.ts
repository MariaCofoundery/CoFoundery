import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import type {
  FounderAlignmentWorkbookStepId,
  WorkbookStructuredOutputsByStep,
  WorkbookStructuredStepOutputs,
} from "@/features/reporting/founderAlignmentWorkbook";
import type { FounderMatchingMarkerClass } from "@/features/reporting/founderMatchingMarkers";

type BuildStructuredAgreementDraftInput = {
  stepId: Exclude<FounderAlignmentWorkbookStepId, "advisor_closing">;
  structuredOutputs:
    | WorkbookStructuredOutputsByStep[Exclude<FounderAlignmentWorkbookStepId, "advisor_closing">]
    | null
    | undefined;
  teamContext: TeamContext;
  markerClass: FounderMatchingMarkerClass | null;
};

function normalizeSentence(value: string | null | undefined) {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function joinSentences(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value)).join(" ");
}

function withTail(sentence: string | null, tail: string | null) {
  if (!sentence) return null;
  return tail ? `${sentence} ${tail}` : sentence;
}

function escalationTail(teamContext: TeamContext, markerClass: FounderMatchingMarkerClass | null) {
  if (markerClass === "critical_clarification_point") {
    return teamContext === "existing_team"
      ? "Dieser Punkt laeuft nicht weiter nebenher."
      : "Diesen Punkt lasst ihr vor dem Start nicht offen.";
  }

  if (markerClass === "high_rule_need") {
    return teamContext === "existing_team"
      ? "So bleibt die Regel nicht nur Absicht, sondern greift im Alltag."
      : "So geht ihr nicht mit still offener Reibung in die Zusammenarbeit.";
  }

  if (markerClass === "conditional_complement") {
    return teamContext === "existing_team"
      ? "Der Unterschied bleibt nur produktiv, wenn ihr ihn so aktiv fuehrt."
      : "Der Unterschied hilft nur, wenn diese Bedingung vor dem Start klar ist.";
  }

  return null;
}

function boundaryTail(teamContext: TeamContext, markerClass: FounderMatchingMarkerClass | null) {
  if (markerClass === "critical_clarification_point") {
    return teamContext === "existing_team"
      ? "Diese Grenze verschiebt ihr nicht still im Alltag."
      : "Diese Grenze bleibt vor dem Start nicht implizit.";
  }

  return null;
}

function reviewTail(teamContext: TeamContext, markerClass: FounderMatchingMarkerClass | null) {
  if (markerClass === "stable_base") {
    return teamContext === "existing_team"
      ? "So schuetzt ihr, was bereits traegt."
      : "So bleibt eine stabile Basis nicht nur unausgesprochen.";
  }

  return null;
}

function buildStructuredAgreementDraft(
  outputs: WorkbookStructuredStepOutputs,
  teamContext: TeamContext,
  markerClass: FounderMatchingMarkerClass | null
) {
  return joinSentences([
    normalizeSentence(outputs.principle),
    normalizeSentence(outputs.operatingRule),
    withTail(normalizeSentence(outputs.escalationRule), escalationTail(teamContext, markerClass)),
    withTail(normalizeSentence(outputs.boundaryRule), boundaryTail(teamContext, markerClass)),
    withTail(normalizeSentence(outputs.reviewTrigger), reviewTail(teamContext, markerClass)),
  ]);
}

export function buildPilotAgreementDraftFromStructuredOutputs({
  stepId: _stepId,
  structuredOutputs,
  teamContext,
  markerClass,
}: BuildStructuredAgreementDraftInput) {
  if (!structuredOutputs) {
    return null;
  }

  const draft = buildStructuredAgreementDraft(
    structuredOutputs as WorkbookStructuredStepOutputs,
    teamContext,
    markerClass
  );

  return draft.trim().length > 0 ? draft : null;
}
