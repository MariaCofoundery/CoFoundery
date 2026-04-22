import assert from "node:assert/strict";
import test from "node:test";
import { resolveWorkbookRelationshipAccess } from "@/features/reporting/workbookRelationshipAccess";

test("advisor workbook prefers relationship access over invitation resolution when advisor context is active", () => {
  const result = resolveWorkbookRelationshipAccess({
    advisorContext: true,
    relationshipIdFromAdvisorAccess: "rel-advisor",
    relationshipIdFromReportRun: "rel-report",
    relationshipIdFromInvitation: null,
    hasRelationshipAdvisorAccess: false,
  });

  assert.equal(result.relationshipId, "rel-advisor");
  assert.equal(result.hasRelationshipAdvisorAccess, true);
});

test("advisor workbook falls back to report-run relationship before surfacing invitation failure", () => {
  const result = resolveWorkbookRelationshipAccess({
    advisorContext: true,
    relationshipIdFromAdvisorAccess: null,
    relationshipIdFromReportRun: "rel-report",
    relationshipIdFromInvitation: null,
    hasRelationshipAdvisorAccess: true,
  });

  assert.equal(result.relationshipId, "rel-report");
  assert.equal(result.hasRelationshipAdvisorAccess, true);
});

test("founder workbook keeps invitation-first resolution outside advisor context", () => {
  const result = resolveWorkbookRelationshipAccess({
    advisorContext: false,
    relationshipIdFromAdvisorAccess: "rel-advisor",
    relationshipIdFromReportRun: "rel-report",
    relationshipIdFromInvitation: "rel-invitation",
    hasRelationshipAdvisorAccess: false,
  });

  assert.equal(result.relationshipId, "rel-invitation");
  assert.equal(result.hasRelationshipAdvisorAccess, true);
});
