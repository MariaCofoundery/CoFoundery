import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveDiscoveryAssessmentSignalAvailability,
  resolveOwnDiscoveryAssessmentSignalReadiness,
} from "@/features/discovery/discoveryAssessmentSignalsCore";

const READY = {
  includeAssessmentSignals: true,
  hasSubmittedBaseAssessment: true,
  isAssessmentSignalReady: true,
};

const NOT_READY = {
  includeAssessmentSignals: true,
  hasSubmittedBaseAssessment: false,
  isAssessmentSignalReady: false,
};

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

test("marks bilateral availability as false when owner is not ready and candidate is ready", () => {
  assert.deepEqual(
    resolveDiscoveryAssessmentSignalAvailability({
      ownerReadiness: NOT_READY,
      candidateReadiness: READY,
    }),
    {
      ownerReady: false,
      candidateReady: true,
      bothReady: false,
    }
  );
});

test("marks bilateral availability as false when owner is ready and candidate is not ready", () => {
  assert.deepEqual(
    resolveDiscoveryAssessmentSignalAvailability({
      ownerReadiness: READY,
      candidateReadiness: NOT_READY,
    }),
    {
      ownerReady: true,
      candidateReady: false,
      bothReady: false,
    }
  );
});

test("marks bilateral availability as true only when owner and candidate are ready", () => {
  assert.deepEqual(
    resolveDiscoveryAssessmentSignalAvailability({
      ownerReadiness: READY,
      candidateReadiness: READY,
    }),
    {
      ownerReady: true,
      candidateReady: true,
      bothReady: true,
    }
  );
});

test("marks bilateral availability as false when candidate readiness is missing", () => {
  assert.deepEqual(
    resolveDiscoveryAssessmentSignalAvailability({
      ownerReadiness: READY,
      candidateReadiness: null,
    }),
    {
      ownerReady: true,
      candidateReady: false,
      bothReady: false,
    }
  );
});
