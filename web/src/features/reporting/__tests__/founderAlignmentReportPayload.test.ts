import assert from "node:assert/strict";
import test from "node:test";
import { buildFounderAlignmentReportPayload } from "@/features/reporting/founderAlignmentReportPayload";

test("builds the founder alignment payload contract without DB access", () => {
  const result = buildFounderAlignmentReportPayload({
    sessionId: "session-1",
    participantA: {
      userId: "user-a",
      displayName: "Person A",
      baseAssessment: {
        id: "base-a",
        submittedAt: "2026-06-19T10:00:00.000Z",
        createdAt: "2026-06-19T09:00:00.000Z",
      },
      baseAnswers: [],
    },
    participantB: {
      userId: "user-b",
      displayName: "Person B",
      baseAssessment: {
        id: "base-b",
        submittedAt: "2026-06-19T10:05:00.000Z",
        createdAt: "2026-06-19T09:05:00.000Z",
      },
      baseAnswers: [],
    },
    baseQuestionMetaById: new Map(),
    modules: ["base"],
    teamContext: "pre_founder",
    personBInvitedAt: "2026-06-19T08:00:00.000Z",
    inviteConsentCaptured: true,
    source: "unit_test",
    generatedAt: "2026-06-19T11:00:00.000Z",
  });

  assert.equal(result.payload.reportType, "founder_alignment_v1");
  assert.equal(result.payload.report.sessionId, "session-1");
  assert.equal(result.payload.report.participantAId, "user-a");
  assert.equal(result.payload.report.participantBId, "user-b");
  assert.equal(result.payload.teamContext, "pre_founder");
  assert.deepEqual(result.modules, ["base"]);
  assert.deepEqual(result.inputAssessmentIds, ["base-a", "base-b"]);
  assert.deepEqual(result.payload.inputAssessmentIds, ["base-a", "base-b"]);
  assert.equal(result.payload.source, "unit_test");
  assert.equal(result.payload.generatedAt, "2026-06-19T11:00:00.000Z");
});

test("keeps values assessment ids unique when values are included", () => {
  const result = buildFounderAlignmentReportPayload({
    sessionId: "session-values",
    participantA: {
      userId: "user-a",
      displayName: "Person A",
      baseAssessment: {
        id: "base-a",
        submittedAt: null,
        createdAt: "2026-06-19T09:00:00.000Z",
      },
      baseAnswers: [],
      valuesAssessment: {
        id: "values-a",
        submittedAt: null,
        createdAt: "2026-06-19T09:10:00.000Z",
      },
      valuesAnswers: [],
    },
    participantB: {
      userId: "user-b",
      displayName: "Person B",
      baseAssessment: {
        id: "base-b",
        submittedAt: null,
        createdAt: "2026-06-19T09:05:00.000Z",
      },
      baseAnswers: [],
      valuesAssessment: {
        id: "values-b",
        submittedAt: null,
        createdAt: "2026-06-19T09:15:00.000Z",
      },
      valuesAnswers: [],
    },
    baseQuestionMetaById: new Map(),
    valuesQuestionMetaById: new Map(),
    valuesTotal: 0,
    modules: ["base", "values"],
    teamContext: "existing_team",
    personBInvitedAt: null,
    inviteConsentCaptured: false,
    source: "unit_test_values",
    generatedAt: "2026-06-19T11:00:00.000Z",
  });

  assert.deepEqual(result.modules, ["base", "values"]);
  assert.deepEqual(result.inputAssessmentIds, ["base-a", "base-b", "values-a", "values-b"]);
  assert.equal(result.payload.report.requestedScope, "basis_plus_values");
  assert.equal(result.payload.report.valuesModuleStatus, "completed");
});
