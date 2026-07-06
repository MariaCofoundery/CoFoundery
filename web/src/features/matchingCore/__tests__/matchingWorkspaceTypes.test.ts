import assert from "node:assert/strict";
import test from "node:test";
import {
  canStartMatchingWorkspaceFromSession,
  isMatchingWorkspaceStatus,
} from "@/features/matchingCore/matchingWorkspaceTypes";

test("accepts only prepared matching workspace status for V1", () => {
  assert.equal(isMatchingWorkspaceStatus("prepared"), true);
  assert.equal(isMatchingWorkspaceStatus("active"), false);
  assert.equal(isMatchingWorkspaceStatus("archived"), false);
  assert.equal(isMatchingWorkspaceStatus("canceled"), false);
});

test("allows workspace start only for report-ready participant sessions with a report", () => {
  assert.equal(
    canStartMatchingWorkspaceFromSession({
      sessionStatus: "report_ready",
      currentUserIsParticipant: true,
      reportRunExists: true,
    }),
    true
  );
});

test("blocks workspace start before report readiness or without participant access", () => {
  assert.equal(
    canStartMatchingWorkspaceFromSession({
      sessionStatus: "ready_for_report",
      currentUserIsParticipant: true,
      reportRunExists: true,
    }),
    false
  );
  assert.equal(
    canStartMatchingWorkspaceFromSession({
      sessionStatus: "report_ready",
      currentUserIsParticipant: false,
      reportRunExists: true,
    }),
    false
  );
  assert.equal(
    canStartMatchingWorkspaceFromSession({
      sessionStatus: "report_ready",
      currentUserIsParticipant: true,
      reportRunExists: false,
    }),
    false
  );
});

test("treats an existing workspace as idempotently available", () => {
  assert.equal(
    canStartMatchingWorkspaceFromSession({
      sessionStatus: "report_ready",
      currentUserIsParticipant: true,
      reportRunExists: true,
      existingWorkspaceId: "workspace-1",
    }),
    true
  );
});
