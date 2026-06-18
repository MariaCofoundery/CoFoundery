import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscoveryAssessmentSignalAvailabilityMap,
  normalizeDiscoveryAssessmentSignalCandidateUserIds,
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

test("normalizes candidate user ids by removing owner, blanks, duplicates and limiting results", () => {
  assert.deepEqual(
    normalizeDiscoveryAssessmentSignalCandidateUserIds({
      ownerUserId: "owner",
      candidateUserIds: ["", "candidate-a", "owner", "candidate-a", " candidate-b ", "candidate-c"],
      limit: 2,
    }),
    ["candidate-a", "candidate-b"]
  );
});

test("builds an empty bilateral availability map for empty candidate ids", () => {
  const availability = buildDiscoveryAssessmentSignalAvailabilityMap({
    ownerReadiness: READY,
    candidateUserIds: [],
    candidateReadiness: [],
  });

  assert.equal(availability.size, 0);
});

test("fails closed when candidate readiness data is unavailable", () => {
  const availability = buildDiscoveryAssessmentSignalAvailabilityMap({
    ownerReadiness: READY,
    candidateUserIds: ["candidate-a"],
    candidateReadiness: [],
  });

  assert.deepEqual(availability.get("candidate-a"), {
    ownerReady: true,
    candidateReady: false,
    bothReady: false,
  });
});

test("marks candidate as not ready without consent even when submitted base exists", () => {
  const availability = buildDiscoveryAssessmentSignalAvailabilityMap({
    ownerReadiness: READY,
    candidateUserIds: ["candidate-a"],
    candidateReadiness: [
      {
        userId: "candidate-a",
        includeAssessmentSignals: false,
        hasSubmittedBaseAssessment: true,
      },
    ],
  });

  assert.deepEqual(availability.get("candidate-a"), {
    ownerReady: true,
    candidateReady: false,
    bothReady: false,
  });
});

test("marks candidate as not ready without submitted base assessment even when consent exists", () => {
  const availability = buildDiscoveryAssessmentSignalAvailabilityMap({
    ownerReadiness: READY,
    candidateUserIds: ["candidate-a"],
    candidateReadiness: [
      {
        userId: "candidate-a",
        includeAssessmentSignals: true,
        hasSubmittedBaseAssessment: false,
      },
    ],
  });

  assert.deepEqual(availability.get("candidate-a"), {
    ownerReady: true,
    candidateReady: false,
    bothReady: false,
  });
});
