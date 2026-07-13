import assert from "node:assert/strict";
import test from "node:test";
import { getReportBuilderCopy } from "@/features/reporting/content/builderCopy/builderCopy";
import {
  buildFounderAlignmentReportPayload,
  getFounderAlignmentReportPayloadLocale,
} from "@/features/reporting/founderAlignmentReportPayload";

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
  assert.equal(result.payload.locale, "de");
  assert.equal(getFounderAlignmentReportPayloadLocale(result.payload), "de");
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

test("marks new report payloads with the requested locale and localized focus fallbacks", () => {
  const baseInput: Parameters<typeof buildFounderAlignmentReportPayload>[0] = {
    sessionId: "session-locale",
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
    source: "unit_test_locale",
    generatedAt: "2026-06-19T11:00:00.000Z",
  };

  const defaultResult = buildFounderAlignmentReportPayload(baseInput);
  const englishResult = buildFounderAlignmentReportPayload({
    ...baseInput,
    locale: "en",
  });

  assert.equal(defaultResult.payload.locale, "de");
  assert.equal(englishResult.payload.locale, "en");
  assert.equal(getFounderAlignmentReportPayloadLocale(englishResult.payload), "en");

  const englishFocusPrompts = Object.values(
    getReportBuilderCopy("en").executiveSummary.focusPromptsByDimension
  ).flat();
  assert.deepEqual(englishResult.payload.founderReport.executiveSummary.recommendedFocus, [
    "How do you want to make decisions when pace and careful review pull in different directions?",
    "What expectations do you have for prioritization, availability, and level of effort day to day?",
  ]);
  for (const focus of englishResult.payload.founderReport.executiveSummary.recommendedFocus) {
    assert.ok(englishFocusPrompts.includes(focus));
  }

  const defaultWithEnglishLocaleAndFocus = {
    ...defaultResult.payload,
    locale: "en" as const,
    founderReport: {
      ...defaultResult.payload.founderReport,
      executiveSummary: {
        ...defaultResult.payload.founderReport.executiveSummary,
        recommendedFocus: englishResult.payload.founderReport.executiveSummary.recommendedFocus,
      },
    },
  };
  assert.deepEqual(englishResult.payload, defaultWithEnglishLocaleAndFocus);
});

test("treats legacy report payloads without locale metadata as German", () => {
  const result = buildFounderAlignmentReportPayload({
    sessionId: "session-legacy-locale",
    participantA: {
      userId: "user-a",
      displayName: "Person A",
      baseAssessment: {
        id: "base-a",
        submittedAt: null,
        createdAt: "2026-06-19T09:00:00.000Z",
      },
      baseAnswers: [],
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
    },
    baseQuestionMetaById: new Map(),
    modules: ["base"],
    teamContext: "pre_founder",
    personBInvitedAt: null,
    inviteConsentCaptured: false,
    source: "unit_test_legacy_locale",
    generatedAt: "2026-06-19T11:00:00.000Z",
  });
  const legacyPayload = { ...result.payload };
  delete legacyPayload.locale;

  assert.equal(getFounderAlignmentReportPayloadLocale(legacyPayload), "de");
  assert.equal(getFounderAlignmentReportPayloadLocale({ locale: "fr" }), "de");
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
