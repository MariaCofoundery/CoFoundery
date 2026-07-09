import assert from "node:assert/strict";
import test from "node:test";

import {
  getLegacyReportAccessState,
  getReportAccessMode,
  isLegacyReportUnlockedForCurrentMode,
} from "@/features/reporting/reportAccess";

test("report access mode defaults to locked-compatible behavior", () => {
  assert.equal(getReportAccessMode(undefined), "default");
  assert.equal(getReportAccessMode(""), "default");
  assert.equal(getReportAccessMode("paid"), "default");
});

test("free_beta mode unlocks legacy reports without changing the payload contract", () => {
  assert.equal(getReportAccessMode("free_beta"), "free_beta");
  assert.equal(isLegacyReportUnlockedForCurrentMode({ isLocked: true, mode: "free_beta" }), true);

  assert.deepEqual(getLegacyReportAccessState({ isLocked: true, mode: "free_beta" }), {
    mode: "free_beta",
    isUnlocked: true,
    reason: "free_beta",
  });
});

test("legacy reports can remain locked without free_beta", () => {
  assert.equal(isLegacyReportUnlockedForCurrentMode({ isLocked: true, mode: "default" }), false);
  assert.deepEqual(getLegacyReportAccessState({ isLocked: true, mode: "default" }), {
    mode: "default",
    isUnlocked: false,
    reason: "locked",
  });
});
