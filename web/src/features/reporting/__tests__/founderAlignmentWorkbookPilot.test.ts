import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveWorkbookStepMarkers,
  getMissingWorkbookStructuredOutputKeys,
  getWorkbookRequiredStructuredOutputKeys,
  isWorkbookStructuredStepId,
  sanitizeFounderAlignmentWorkbookPayload,
} from "@/features/reporting/founderAlignmentWorkbook";
import { WORKBOOK_STEP_CONTENT } from "@/features/reporting/founderAlignmentWorkbookStepContent";
import type { TeamScoringResult } from "@/features/scoring/founderScoring";

test("legacy workbook payloads without structured outputs remain valid", () => {
  const payload = sanitizeFounderAlignmentWorkbookPayload({
    currentStepId: "vision_direction",
    steps: {
      vision_direction: {
        mode: "collaborative",
        founderA: "A",
        founderB: "B",
        agreement: "Wir priorisieren Fokus vor Sonderwuenschen.",
        founderAApproved: false,
        founderBApproved: false,
        advisorNotes: "",
      },
    },
  });

  assert.equal(payload.steps.vision_direction.structuredOutputs, undefined);
  assert.equal(payload.steps.roles_responsibility.structuredOutputs, undefined);
});

test("legacy pilot-shaped structured outputs are mapped into the generic V2 shape", () => {
  const payload = sanitizeFounderAlignmentWorkbookPayload({
    currentStepId: "decision_rules",
    steps: {
      decision_rules: {
        mode: "collaborative",
        founderA: "",
        founderB: "",
        agreement: "",
        structuredOutputs: {
          decision_rules: {
            decisionScopeRule: "Owner entscheidet im Bereich.",
            jointDecisionThreshold: "Ab Budget > 10k gemeinsam.",
            deadlockRule: "Nach 24h entscheidet CEO.",
            reviewTrigger: "Wenn Entscheidungen 2x zurueckkommen.",
          },
        },
      },
    },
  });

  assert.equal(
    payload.steps.decision_rules.structuredOutputs?.decision_rules?.operatingRule,
    "Owner entscheidet im Bereich."
  );
  assert.equal(
    payload.steps.decision_rules.structuredOutputs?.decision_rules?.boundaryRule,
    "Ab Budget > 10k gemeinsam."
  );
  assert.equal(
    payload.steps.decision_rules.structuredOutputs?.decision_rules?.escalationRule,
    "Nach 24h entscheidet CEO."
  );
});

test("workspace entries keep source provenance when shared-space payloads are sanitized", () => {
  const payload = sanitizeFounderAlignmentWorkbookPayload({
    currentStepId: "decision_rules",
    steps: {
      decision_rules: {
        mode: "collaborative",
        founderA: "",
        founderB: "",
        agreement: "",
        workspaceV2: {
          entries: [
            {
              id: "entry-a",
              content: "Wir ziehen die andere Person frueh rein.",
              createdBy: "founderA",
              createdAt: "2026-04-09T08:00:00.000Z",
              sourceEntryId: null,
              updatedAt: null,
              updatedBy: null,
            },
            {
              id: "entry-b",
              content: "Ich will denselben Punkt fuer meinen Bereich schaerfen.",
              createdBy: "founderB",
              createdAt: "2026-04-09T08:05:00.000Z",
              sourceEntryId: "entry-a",
              updatedAt: null,
              updatedBy: null,
            },
          ],
          reactions: [],
        },
      },
    },
  });

  assert.equal(payload.steps.decision_rules.workspaceV2?.entries[1]?.sourceEntryId, "entry-a");
});

test("all non-advisor workbook steps expose the five structured output types", () => {
  for (const [stepId, content] of Object.entries(WORKBOOK_STEP_CONTENT)) {
    if (stepId === "advisor_closing") {
      assert.equal(content.outputFields, undefined);
      continue;
    }

    const outputTypes = content.outputFields?.map((field) => field.outputType) ?? [];
    assert.deepEqual(outputTypes, [
      "principle",
      "operatingRule",
      "escalationRule",
      "boundaryRule",
      "reviewTrigger",
    ]);
  }
});

test("marker-aware requiredness follows the V2 rule system", () => {
  assert.deepEqual(getWorkbookRequiredStructuredOutputKeys("decision_rules", "stable_base"), [
    "operatingRule",
    "escalationRule",
  ]);
  assert.deepEqual(getWorkbookRequiredStructuredOutputKeys("decision_rules", "conditional_complement"), [
    "operatingRule",
    "escalationRule",
  ]);
  assert.deepEqual(getWorkbookRequiredStructuredOutputKeys("decision_rules", "high_rule_need"), [
    "operatingRule",
    "escalationRule",
  ]);
  assert.deepEqual(
    getWorkbookRequiredStructuredOutputKeys("decision_rules", "critical_clarification_point"),
    ["operatingRule", "escalationRule"]
  );
});

test("missing structured outputs detect generic validation gaps", () => {
  const missing = getMissingWorkbookStructuredOutputKeys(
    "vision_direction",
    {
      principle: "Chancen pruefen wir gegen den Kernfokus.",
      operatingRule: "Kernprodukt hat Vorrang.",
      escalationRule: "",
      boundaryRule: "",
      reviewTrigger: "",
    },
    "high_rule_need"
  );

  assert.deepEqual(missing, ["escalationRule"]);
});

test("step marker derivation maps all structured workbook steps", () => {
  const scoringResult = {
    dimensions: [
      { dimension: "Unternehmenslogik", scoreA: 80, scoreB: 84 },
      { dimension: "Entscheidungslogik", scoreA: 30, scoreB: 58 },
      { dimension: "Risikoorientierung", scoreA: 55, scoreB: 52 },
      { dimension: "Arbeitsstruktur & Zusammenarbeit", scoreA: 62, scoreB: 20 },
      { dimension: "Commitment", scoreA: 18, scoreB: 84 },
      { dimension: "Konfliktstil", scoreA: 44, scoreB: 80 },
    ],
  } as TeamScoringResult;

  const markers = deriveWorkbookStepMarkers(scoringResult);

  assert.equal(markers.vision_direction?.markerClass, "stable_base");
  assert.equal(markers.decision_rules?.markerClass, "conditional_complement");
  assert.equal(markers.commitment_load?.markerClass, "critical_clarification_point");
  assert.equal(markers.collaboration_conflict?.markerClass, "high_rule_need");
  assert.equal(markers.roles_responsibility?.markerClass, "critical_clarification_point");
});

test("all non-advisor steps are now in the structured workbook scope", () => {
  assert.equal(isWorkbookStructuredStepId("roles_responsibility"), true);
  assert.equal(isWorkbookStructuredStepId("vision_direction"), true);
  assert.equal(isWorkbookStructuredStepId("advisor_closing"), false);
});
