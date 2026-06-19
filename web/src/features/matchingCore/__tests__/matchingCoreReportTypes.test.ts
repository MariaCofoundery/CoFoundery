import assert from "node:assert/strict";
import test from "node:test";
import {
  canCreateMatchingReportRunFromSession,
  isMatchingReportRunPayload,
} from "@/features/matchingCore/matchingCoreReportTypes";

test("accepts only founder alignment report payloads for matching report runs", () => {
  assert.equal(isMatchingReportRunPayload({ reportType: "founder_alignment_v1" }), true);
  assert.equal(isMatchingReportRunPayload({ reportType: "classic_compare_v1" }), false);
  assert.equal(isMatchingReportRunPayload({}), false);
  assert.equal(isMatchingReportRunPayload(null), false);
  assert.equal(isMatchingReportRunPayload([]), false);
});

test("allows matching report creation only for ready participant sessions with complete inputs", () => {
  assert.equal(
    canCreateMatchingReportRunFromSession({
      sessionStatus: "ready_for_report",
      currentUserIsParticipant: true,
      requiredInputStatus: "complete",
    }),
    true
  );
  assert.equal(
    canCreateMatchingReportRunFromSession({
      sessionStatus: "awaiting_inputs",
      currentUserIsParticipant: true,
      requiredInputStatus: "complete",
    }),
    false
  );
  assert.equal(
    canCreateMatchingReportRunFromSession({
      sessionStatus: "ready_for_report",
      currentUserIsParticipant: false,
      requiredInputStatus: "complete",
    }),
    false
  );
  assert.equal(
    canCreateMatchingReportRunFromSession({
      sessionStatus: "ready_for_report",
      currentUserIsParticipant: true,
      requiredInputStatus: "missing",
    }),
    false
  );
});

test("treats an existing matching report as idempotently available", () => {
  assert.equal(
    canCreateMatchingReportRunFromSession({
      sessionStatus: "report_ready",
      currentUserIsParticipant: true,
      requiredInputStatus: "complete",
      existingReportRunId: "report-1",
    }),
    true
  );
});
