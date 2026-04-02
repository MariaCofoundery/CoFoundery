import assert from "node:assert/strict";
import test from "node:test";
import { buildPilotAgreementDraftFromStructuredOutputs } from "@/features/reporting/founderAlignmentWorkbookPilotDraft";

test("structured draft builder composes all five rule categories in order", () => {
  const draft = buildPilotAgreementDraftFromStructuredOutputs({
    stepId: "vision_direction",
    teamContext: "pre_founder",
    markerClass: "critical_clarification_point",
    structuredOutputs: {
      principle: "Neue Chancen prueft ihr zuerst gegen euren Kernfokus",
      operatingRule: "Wenn Fokus und Sonderumsatz kollidieren, hat das Kernprodukt Vorrang",
      escalationRule:
        "Wenn ihr dieselbe Chance unterschiedlich lest, sagt ihr noch nicht zu und entscheidet bis zum naechsten Produktmeeting",
      boundaryRule: "Ein Sonderfall geht nicht weiter, wenn er das Kernprodukt zwei Wochen blockiert",
      reviewTrigger: "Ihr prueft die Regel neu, wenn ein Sonderfall mehr als zwei Wochen Fokus zieht",
    },
  });

  assert.match(draft ?? "", /Kernfokus/);
  assert.match(draft ?? "", /Kernprodukt Vorrang/);
  assert.match(draft ?? "", /vor dem Start nicht offen/i);
  assert.match(draft ?? "", /zwei Wochen blockiert/);
});

test("existing-team drafts add rule pressure without becoming generic filler", () => {
  const draft = buildPilotAgreementDraftFromStructuredOutputs({
    stepId: "collaboration_conflict",
    teamContext: "existing_team",
    markerClass: "high_rule_need",
    structuredOutputs: {
      principle: "Irritationen sprecht ihr an, sobald sie einen zweiten Termin beeinflussen",
      operatingRule: "Kritisches Feedback gebt ihr direkt im gleichen Tag und nicht erst zwischen den Zeilen",
      escalationRule: "Wenn ein Thema im Alltag nicht geloest wird, zieht ihr es in einen festen Klaerungstermin",
      boundaryRule: "Spaetestens nach zwei offenen Schleifen bleibt ein Konflikt nicht mehr im Tagesgeschaeft",
      reviewTrigger: "Ihr prueft die Regel neu, wenn dieselbe Reibung in mehreren Meetings wiederkehrt",
    },
  });

  assert.match(draft ?? "", /gleichen Tag/);
  assert.match(draft ?? "", /festen Klaerungstermin/);
  assert.match(draft ?? "", /greift im Alltag/);
});

test("stable-base drafts still force an explicit protection trigger", () => {
  const draft = buildPilotAgreementDraftFromStructuredOutputs({
    stepId: "alignment_90_days",
    teamContext: "pre_founder",
    markerClass: "stable_base",
    structuredOutputs: {
      principle: "Den 90-Tage-Fokus schuetzt ihr gegen neue Opportunitaeten",
      reviewTrigger: "Ihr prueft euren Fokus neu, wenn zwei neue Themen gleichzeitig Prioritaet fordern",
    },
  });

  assert.match(draft ?? "", /90-Tage-Fokus/);
  assert.match(draft ?? "", /stabile Basis/);
});

test("structured draft builder returns null when no structured outputs are available", () => {
  const draft = buildPilotAgreementDraftFromStructuredOutputs({
    stepId: "decision_rules",
    teamContext: "pre_founder",
    markerClass: "stable_base",
    structuredOutputs: null,
  });

  assert.equal(draft, null);
});
