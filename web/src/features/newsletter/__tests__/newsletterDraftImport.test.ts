import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDraftJson } from "@/features/newsletter/newsletterDraftImport";

const good = { title: "Ausgabe 1", subject: "Sympathie ist nicht alles", preheader: "Eine Geschichte", look: "light", blocks: [{ id: "a", type: "text", text: "Hallo" }, { id: "b", type: "button", label: "Zu Align", href: "/dashboard" }] };

test("draft import: valid JSON becomes a cleaned issue, also inside a code fence", () => {
  for (const text of [JSON.stringify(good), "```json\n" + JSON.stringify(good) + "\n```"]) {
    const r = parseDraftJson(text);
    assert.equal(r.ok, true);
    if (r.ok) { assert.equal(r.issue.subject, "Sympathie ist nicht alles"); assert.equal(r.issue.look, "light"); assert.equal(r.issue.blocks.length, 2); }
  }
});

test("draft import: missing look comes from the last issue, unknown values fall back", () => {
  const { look: _look, ...rest } = good;
  const r = parseDraftJson(JSON.stringify({ ...rest, accent: "javascript:1" }), { look: "plain", accent: "#0a88c2" });
  assert.equal(r.ok && r.issue.look, "plain");
  assert.equal(r.ok && r.issue.accent, "#5b3df5"); // an invalid color never comes through
});

test("draft import: unsafe blocks and entries without real IDs are dropped", () => {
  const r = parseDraftJson(JSON.stringify({ ...good, blocks: [{ type: "script", text: "x" }, { type: "entries", title: "Netz", items: [{ kind: "listing", id: "not-an-id", title: "x" }] }, { type: "text", text: "<script>1</script>" }] }));
  assert.equal(r.ok, true);
  if (r.ok) { assert.equal(r.issue.blocks.length, 2); const e = r.issue.blocks[0]; assert.equal(e.type === "entries" && e.items.length, 0); }
});

test("draft import: errors are named, nothing is guessed", () => {
  assert.deepEqual(parseDraftJson("   "), { ok: false, error: "empty" });
  assert.deepEqual(parseDraftJson("nope"), { ok: false, error: "invalid" });
  assert.deepEqual(parseDraftJson("[1,2]"), { ok: false, error: "invalid" });
  assert.deepEqual(parseDraftJson(JSON.stringify({ subject: "", blocks: [] })), { ok: false, error: "no_content" });
  assert.deepEqual(parseDraftJson("x".repeat(100_001)), { ok: false, error: "too_big" });
});
