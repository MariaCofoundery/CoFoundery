import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FOUNDER_SETUP_CATALOG,
  FOUNDER_SETUP_CATEGORY_KEYS,
  FOUNDER_SETUP_ITEM_KEYS,
} from "@/features/teams/founderSetupCatalog";
import {
  FOUNDER_SETUP_STAGES,
  buildFounderSetupReadModel,
  countFounderSetupStatuses,
  safeDocumentationHref,
} from "@/features/teams/founderSetupModel";

const members = [
  { userId: "alice", displayName: "Alice" },
  { userId: "bob", displayName: "Bob" },
  { userId: "cara", displayName: "Cara" },
];

test("catalog and key list stay in step across four categories", () => {
  // GEAENDERT am 18.09.2026: Die Zahl stand hier fest (18) und musste beim
  // Hinzufuegen von Nachfolge und Wettbewerbsverbot mitgezogen werden. Eine
  // feste Zahl prueft nichts - dass Liste und Katalog dasselbe enthalten,
  // schon.
  assert.ok(FOUNDER_SETUP_ITEM_KEYS.length >= 18, "Themen sind verschwunden");
  assert.equal(FOUNDER_SETUP_CATALOG.length, FOUNDER_SETUP_ITEM_KEYS.length);
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

// ---------------------------------------------------------------------------
// Stufe und Ergebnis sind zwei Fragen, nicht eine Liste
// ---------------------------------------------------------------------------
/** Ein Thema mit genau einer bestaetigten Fassung. */
function settledWith(resolution: string) {
  const model = buildFounderSetupReadModel({
    teamId: "team",
    currentUserId: "alice",
    members,
    itemRows: [{
      id: "item",
      team_id: "team",
      item_key: "equity",
      work_status: "discussing",
      working_note: "",
      current_confirmed_revision_id: "confirmed",
      pending_revision_id: null,
    }],
    revisionRows: [
      { id: "confirmed", setup_item_id: "item", resolution_status: resolution, note: "Fassung", documentation_reference: null, proposed_by_user_id: "alice", created_at: "2026-01-01", confirmed_at: "2026-01-02" },
    ],
    confirmationRows: [
      { revision_id: "confirmed", user_id: "alice", confirmed_at: "2026-01-02" },
      { revision_id: "confirmed", user_id: "bob", confirmed_at: "2026-01-02" },
    ],
  });
  const item = model.items.find((entry) => entry.key === "equity");
  assert.ok(item);
  return item;
}

test("wie weit ihr seid und wie es endet sind getrennt", () => {
  // NEU am 18.09.2026. Vorher gab es EINE Liste aus sechs Werten, in der
  // "Offen", "In Klaerung", "Bestaetigung offen", "Geklaert", "Dokumentiert"
  // und "Nicht relevant" nebeneinanderstanden - obwohl die ersten drei den
  // Fortschritt meinen und die letzten drei das Ergebnis. Niemand konnte
  // sagen, ob "Dokumentiert" weiter ist als "Geklaert".
  for (const resolution of ["clarified", "documented", "not_relevant"]) {
    const item = settledWith(resolution);
    assert.equal(item.stage, "settled", `${resolution} ist ein Ergebnis, keine eigene Stufe`);
    assert.equal(item.outcome, resolution);
  }
});

test("ein Ergebnis gibt es erst, wenn etwas bestaetigt ist", () => {
  const model = buildFounderSetupReadModel({
    teamId: "team",
    currentUserId: "alice",
    members,
    itemRows: [
      { id: "a", team_id: "team", item_key: "equity", work_status: "open", working_note: "", current_confirmed_revision_id: null, pending_revision_id: null },
      { id: "b", team_id: "team", item_key: "vesting", work_status: "discussing", working_note: "", current_confirmed_revision_id: null, pending_revision_id: null },
      { id: "c", team_id: "team", item_key: "communication", work_status: "discussing", working_note: "", current_confirmed_revision_id: null, pending_revision_id: "pending" },
    ],
    revisionRows: [
      { id: "pending", setup_item_id: "c", resolution_status: "documented", note: "Vorschlag", documentation_reference: null, proposed_by_user_id: "alice", created_at: "2026-02-01", confirmed_at: null },
    ],
    confirmationRows: [{ revision_id: "pending", user_id: "alice", confirmed_at: "2026-02-01" }],
  });
  const stageOf = (key: string) => model.items.find((item) => item.key === key)?.stage;
  assert.equal(stageOf("equity"), "open");
  assert.equal(stageOf("vesting"), "discussing");
  assert.equal(stageOf("communication"), "awaiting_confirmation");

  // Ein Vorschlag, den erst eine Person bestaetigt hat, ist noch kein
  // Ergebnis - sonst stuende "Dokumentiert" da, bevor es stimmt.
  assert.ok(
    model.items.every((item) => item.outcome === null || item.stage === "settled"),
    "ein Ergebnis ohne bestaetigte Fassung"
  );
});

test("die Stufen sind eine Reihenfolge und die Oberflaeche erklaert sie", () => {
  assert.deepEqual([...FOUNDER_SETUP_STAGES], ["open", "discussing", "awaiting_confirmation", "settled"]);

  // Die Trennung hilft nur, wenn sie irgendwo steht. Der Unterschied zwischen
  // "Geklaert" und "Dokumentiert" war der eigentliche Stolperstein.
  const overview = readFileSync("src/app/(product)/teams/[teamId]/setup/page.tsx", "utf8");
  assert.match(overview, /legendStages/);
  assert.match(overview, /outcomeHelp\./);
  for (const locale of ["de", "en"]) {
    const setup = (JSON.parse(readFileSync(`messages/${locale}/teams.json`, "utf8")) as {
      setup: Record<string, Record<string, string>>;
    }).setup;
    for (const stage of FOUNDER_SETUP_STAGES) {
      assert.ok(setup.stages?.[stage], `${locale}: stages.${stage} fehlt`);
    }
    for (const outcome of ["clarified", "documented", "not_relevant"]) {
      assert.ok(setup.outcomes?.[outcome], `${locale}: outcomes.${outcome} fehlt`);
      assert.ok(
        (setup.outcomeHelp?.[outcome] ?? "").length > 30,
        `${locale}: outcomeHelp.${outcome} erklaert den Unterschied nicht`
      );
    }
    assert.ok(setup.legendTitle && setup.legendStages && setup.legendOutcomes, `${locale}: Legende fehlt`);
  }
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
  assert.equal(model.items.length, FOUNDER_SETUP_ITEM_KEYS.length);
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
