import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { savedPublicationStatus } from "@/features/connect/connectLifecycle";

test("intermediate saves preserve active publications and never restore inactive content", () => {
  for (const status of [
    "active",
    "withdrawn",
    "resolved",
    "paused",
    "completed",
  ]) {
    assert.equal(savedPublicationStatus(status, false), status);
    assert.equal(savedPublicationStatus(status, true), status);
  }
  assert.equal(savedPublicationStatus(null, false), "draft");
  assert.equal(savedPublicationStatus("draft", false), "draft");
  assert.equal(savedPublicationStatus("draft", true), "active");
});
test("DE/EN explain separate lifecycle consequences and retained conversations", () => {
  for (const locale of ["de", "en"]) {
    const c = JSON.parse(
      readFileSync(`messages/${locale}/connect.json`, "utf8"),
    );
    for (const key of [
      "leaveConsequences",
      "returnConsequences",
      "historyOnly",
      "confirmConsequences",
    ])
      assert.ok(c.lifecycle[key]);
    for (const action of ["withdrawn", "resolved", "active", "delete"])
      assert.ok(c.lifecycle.problemConsequences[action]);
    for (const action of ["pause", "complete", "publish", "renew", "delete"])
      assert.ok(c.lifecycle.listingConsequences[action]);
    assert.notEqual(
      c.lifecycle.leaveConsequences,
      c.lifecycle.returnConsequences,
    );
    assert.equal(
      new Set(Object.values(c.lifecycle.problemConsequences)).size,
      4,
    );
  }
});
