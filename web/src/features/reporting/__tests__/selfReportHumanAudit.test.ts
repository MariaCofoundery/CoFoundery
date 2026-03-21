import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHumanReadableAuditReport,
  runFullAuditDemo,
} from "@/features/reporting/selfReportHumanAudit";
import { SELF_REPORT_SELECTION_DEBUG_CASES } from "@/features/reporting/selfReportSelection";

test("human readable audit report exposes the expected top-level sections", () => {
  const balancedCase = SELF_REPORT_SELECTION_DEBUG_CASES.find(
    (entry) => entry.name === "komplett_balanciertes_profil"
  );

  assert.ok(balancedCase);

  const report = buildHumanReadableAuditReport(balancedCase.scores);

  assert.equal(report.meta.balancedProfile, true);
  assert.equal(report.scoreOverview.length, 6);
  assert.equal(report.frictionOverview.length, 6);
  assert.equal(report.textLinking.hero.length, 4);
  assert.equal(report.renderedText.patterns.length, 3);
  assert.equal(report.renderedText.challenges.length, 3);
  assert.ok(report.renderedText.complements.length >= 2);
});

test("full audit demo returns the three tracked demo cases", () => {
  const demo = runFullAuditDemo();

  assert.deepEqual(
    demo.map((entry) => entry.name),
    ["stark_ausgepraegtes_profil", "komplett_balanciertes_profil", "gemischtes_profil"]
  );
});
