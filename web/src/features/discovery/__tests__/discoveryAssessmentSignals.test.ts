import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveOwnDiscoveryAssessmentSignalReadiness,
} from "@/features/discovery/discoveryAssessmentSignalsCore";

test("marks assessment signals as not ready when consent is inactive even with base assessment", () => {
  assert.deepEqual(
    resolveOwnDiscoveryAssessmentSignalReadiness({
      includeAssessmentSignals: false,
      hasSubmittedBaseAssessment: true,
    }),
    {
      includeAssessmentSignals: false,
      hasSubmittedBaseAssessment: true,
      isAssessmentSignalReady: false,
    }
  );
});

test("marks assessment signals as not ready when consent is active but base assessment is missing", () => {
  assert.deepEqual(
    resolveOwnDiscoveryAssessmentSignalReadiness({
      includeAssessmentSignals: true,
      hasSubmittedBaseAssessment: false,
    }),
    {
      includeAssessmentSignals: true,
      hasSubmittedBaseAssessment: false,
      isAssessmentSignalReady: false,
    }
  );
});

test("marks assessment signals as ready when consent and submitted base assessment are present", () => {
  assert.deepEqual(
    resolveOwnDiscoveryAssessmentSignalReadiness({
      includeAssessmentSignals: true,
      hasSubmittedBaseAssessment: true,
    }),
    {
      includeAssessmentSignals: true,
      hasSubmittedBaseAssessment: true,
      isAssessmentSignalReady: true,
    }
  );
});

test("treats missing preferences as not ready", () => {
  assert.equal(
    resolveOwnDiscoveryAssessmentSignalReadiness({
      includeAssessmentSignals: false,
      hasSubmittedBaseAssessment: false,
    }).isAssessmentSignalReady,
    false
  );
});

test("treats missing assessment status as not ready", () => {
  assert.equal(
    resolveOwnDiscoveryAssessmentSignalReadiness({
      includeAssessmentSignals: true,
      hasSubmittedBaseAssessment: false,
    }).isAssessmentSignalReady,
    false
  );
});
