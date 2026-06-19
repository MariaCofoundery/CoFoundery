import assert from "node:assert/strict";
import test from "node:test";
import { isMatchingReportRunPayload } from "@/features/matchingCore/matchingCoreReportTypes";

test("accepts only founder alignment report payloads for matching report runs", () => {
  assert.equal(isMatchingReportRunPayload({ reportType: "founder_alignment_v1" }), true);
  assert.equal(isMatchingReportRunPayload({ reportType: "classic_compare_v1" }), false);
  assert.equal(isMatchingReportRunPayload({}), false);
  assert.equal(isMatchingReportRunPayload(null), false);
  assert.equal(isMatchingReportRunPayload([]), false);
});
