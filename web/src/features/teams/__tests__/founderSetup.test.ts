import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FOUNDER_SETUP_CATALOG,
  FOUNDER_SETUP_CATEGORY_KEYS,
  FOUNDER_SETUP_ITEM_KEYS,
} from "@/features/teams/founderSetupCatalog";
import {
  buildFounderSetupReadModel,
  countFounderSetupStatuses,
  safeDocumentationHref,
} from "@/features/teams/founderSetupModel";

const members = [
  { userId: "alice", displayName: "Alice" },
  { userId: "bob", displayName: "Bob" },
  { userId: "cara", displayName: "Cara" },
];

test("catalog contains exactly 18 typed items across four categories", () => {
  assert.equal(FOUNDER_SETUP_ITEM_KEYS.length, 18);
  assert.equal(FOUNDER_SETUP_CATALOG.length, 18);
  assert.deepEqual(new Set(FOUNDER_SETUP_CATALOG.map((item) => item.key)), new Set(FOUNDER_SETUP_ITEM_KEYS));
  assert.deepEqual(new Set(FOUNDER_SETUP_CATALOG.map((item) => item.category)), new Set(FOUNDER_SETUP_CATEGORY_KEYS));
});

test("read model keeps confirmed and pending snapshots separate for three founders", () => {
  const model = buildFounderSetupReadModel({
    teamId: "team",
    currentUserId: "alice",
    members,
    itemRows: [{
      id: "item",
      team_id: "team",
      item_key: "time_commitment",
      work_status: "discussing",
      working_note: "Arbeitsnotiz bleibt Usercontent",
      current_confirmed_revision_id: "confirmed",
      pending_revision_id: "pending",
    }],
    revisionRows: [
      { id: "confirmed", setup_item_id: "item", resolution_status: "clarified", note: "Bisherige Fassung", documentation_reference: null, proposed_by_user_id: "alice", created_at: "2026-01-01", confirmed_at: "2026-01-02" },
      { id: "pending", setup_item_id: "item", resolution_status: "documented", note: "Neue Fassung", documentation_reference: "Dokument vom 14.08.", proposed_by_user_id: "alice", created_at: "2026-02-01", confirmed_at: null },
    ],
    confirmationRows: [
      { revision_id: "pending", user_id: "alice", confirmed_at: "2026-02-01" },
      { revision_id: "pending", user_id: "bob", confirmed_at: "2026-02-02" },
    ],
  });
  const item = model.items.find((entry) => entry.key === "time_commitment");
  assert.ok(item);
  assert.equal(item.displayStatus, "confirmation_pending");
  assert.equal(item.currentConfirmedRevision?.note, "Bisherige Fassung");
  assert.equal(item.pendingRevision?.note, "Neue Fassung");
  assert.equal(item.pendingRevision?.confirmations.length, 2);
  assert.equal(model.members.length, 3);
  assert.equal(countFounderSetupStatuses(model).confirmation_pending, 1);
});

test("empty setup remains unstarted and does not manufacture persisted rows", () => {
  const model = buildFounderSetupReadModel({
    teamId: "team",
    currentUserId: "alice",
    members: members.slice(0, 2),
    itemRows: [],
    revisionRows: [],
    confirmationRows: [],
  });
  assert.equal(model.started, false);
  assert.equal(model.items.length, 18);
  assert.ok(model.items.every((item) => !item.persisted && item.displayStatus === "open"));
});

test("documentation links allow only http and https", () => {
  assert.equal(safeDocumentationHref("javascript:alert(1)"), null);
  assert.equal(safeDocumentationHref("data:text/plain,test"), null);
  assert.equal(safeDocumentationHref("Gesellschaftervereinbarung vom 14.08."), null);
  assert.equal(safeDocumentationHref("https://example.com/doc"), "https://example.com/doc");
});

test("DE and EN provide all setup content while usercontent remains model data", () => {
  const de = JSON.parse(readFileSync("messages/de/teams.json", "utf8")) as { setup: { categories: Record<string, string>; items: Record<string, { title: string; question: string }> } };
  const en = JSON.parse(readFileSync("messages/en/teams.json", "utf8")) as typeof de;
  assert.deepEqual(Object.keys(de.setup.categories).sort(), Object.keys(en.setup.categories).sort());
  assert.deepEqual(Object.keys(de.setup.items).sort(), [...FOUNDER_SETUP_ITEM_KEYS].sort());
  assert.deepEqual(Object.keys(de.setup.items).sort(), Object.keys(en.setup.items).sort());
  for (const key of FOUNDER_SETUP_ITEM_KEYS) {
    assert.ok(de.setup.items[key].title && de.setup.items[key].question);
    assert.ok(en.setup.items[key].title && en.setup.items[key].question);
    assert.notEqual(de.setup.items[key].question, en.setup.items[key].question);
  }
  const activeCopy = JSON.stringify({ de: de.setup, en: en.setup }).toLowerCase();
  for (const forbidden of ["team health", "readiness score", "hohes konfliktrisiko", "belastbare basis", "gute passung"]) {
    assert.doesNotMatch(activeCopy, new RegExp(forbidden));
  }
});

test("routes authorize server-side and homebase links into setup without exposing email", () => {
  const listPage = readFileSync("src/app/(product)/teams/[teamId]/setup/page.tsx", "utf8");
  const detailPage = readFileSync("src/app/(product)/teams/[teamId]/setup/[itemKey]/page.tsx", "utf8");
  const homebase = readFileSync("src/app/(product)/teams/[teamId]/page.tsx", "utf8");
  assert.match(listPage, /getFounderSetup\(teamId, user\.id, supabase\)/);
  assert.match(detailPage, /getFounderSetup\(teamId, user\.id, supabase\)/);
  assert.match(listPage, /if \(!setup\) notFound\(\)/);
  assert.match(detailPage, /if \(!setup\) notFound\(\)/);
  assert.match(homebase, /href=\{`\/teams\/\$\{teamId\}\/setup`\}/);
  assert.doesNotMatch(`${listPage}${detailPage}`, /\.email\b|user_id/);
});
