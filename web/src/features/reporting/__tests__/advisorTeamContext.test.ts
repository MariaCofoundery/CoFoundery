import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAdvisorReportHref,
  buildAdvisorSnapshotHref,
  buildAdvisorWorkbookHref,
  normalizeAdvisorTeamContext,
} from "@/features/reporting/advisorTeamTargets";

test("advisor report href keeps the resolved team context on the URL", () => {
  assert.equal(
    buildAdvisorReportHref("invite-123", "existing_team"),
    "/advisor/report?invitationId=invite-123&teamContext=existing_team"
  );
});

test("advisor snapshot href keeps the resolved team context on the URL", () => {
  assert.equal(
    buildAdvisorSnapshotHref("invite-123", "pre_founder"),
    "/advisor/snapshot?invitationId=invite-123&teamContext=pre_founder"
  );
});

test("advisor workbook href keeps advisor mode and the resolved team context", () => {
  assert.equal(
    buildAdvisorWorkbookHref("invite-123", "existing_team"),
    "/founder-alignment/workbook?invitationId=invite-123&advisorContext=1&teamContext=existing_team"
  );
});

test("advisor team context normalization defaults unknown values to pre-founder", () => {
  assert.equal(normalizeAdvisorTeamContext("existing_team"), "existing_team");
  assert.equal(normalizeAdvisorTeamContext("anything-else"), "pre_founder");
  assert.equal(normalizeAdvisorTeamContext(undefined), "pre_founder");
});
