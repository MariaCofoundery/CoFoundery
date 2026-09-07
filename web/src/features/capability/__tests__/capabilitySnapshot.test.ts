import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = () =>
  readFileSync("../supabase/migrations/20260907160000_create_capability_snapshot_v01.sql", "utf8");
const brief = () => readFileSync("docs/capability-model-technical-brief.md", "utf8");

const FAMILIES = [
  "customer_market",
  "product_value",
  "strategy_business_model",
  "technology_delivery",
  "commercial_growth",
  "finance_funding",
  "operations_people",
  "legal_governance",
];

const OWNERSHIP_WISHES = ["own", "contribute", "grow_into", "prefer_other", "prefer_external", "unclear"];

// Die harten Mengenaussagen prueft supabase/tests/capability_snapshot_v01.sql
// gegen die echte Datenbank. Hier geht es um etwas anderes: dass Migration und
// Modell-Dokument nicht auseinanderlaufen. Genau diese Luecke hat im Juli den
// Schema-Drift zwischen angewendeter Migration und Anwendung erzeugt.

test("families in the migration match the eight documented in the brief", () => {
  const sql = migration();
  const doc = brief();
  for (const family of FAMILIES) {
    assert.match(sql, new RegExp(`'${family}'`), `${family} fehlt in der Migration`);
    assert.match(doc, new RegExp(`\`${family}\``), `${family} fehlt im Modell-Dokument`);
  }
  assert.match(doc, /42 Bereiche/, "das Dokument nennt die Bereichszahl nicht mehr");
});

test("the six ownership states are the documented ones and nothing else", () => {
  const sql = migration();
  const clause = sql.match(/ownership_wish in \(([\s\S]*?)\)/)?.[1] ?? "";
  assert.notEqual(clause, "", "der Ownership-Check fehlt in der Migration");
  for (const wish of OWNERSHIP_WISHES) {
    assert.match(clause, new RegExp(`'${wish}'`), `${wish} fehlt`);
  }
  const declared = clause.match(/'[a-z_]+'/g) ?? [];
  assert.equal(
    declared.length,
    OWNERSHIP_WISHES.length,
    "der Check enthaelt mehr oder weniger Zustaende als die sechs dokumentierten"
  );
});

test("application level carries five stages and rejects a zero", () => {
  assert.match(migration(), /application_level between 1 and 5/);
});

test("capability data is owner-only and never granted to anon", () => {
  const sql = migration();
  assert.doesNotMatch(sql, /to anon/, "Capability-Daten duerfen anonym nicht erreichbar sein");
  assert.match(sql, /revoke all on public\.person_capability_entries from public, anon, authenticated/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  // Belege erben die Zugehoerigkeit ueber den Eintrag, nicht ueber eine eigene
  // user_id - sonst koennten die beiden auseinanderlaufen.
  assert.match(sql, /person_capability_evidence[\s\S]*entry\.user_id = auth\.uid\(\)/);
});

test("the vocabulary lives in the database rather than as a second list in code", () => {
  const sql = migration();
  assert.match(sql, /create table public\.capability_areas/);
  assert.match(sql, /references public\.capability_areas\(area_id\)/);
  // Keine Labels in der Tabelle: Anzeigetexte gehoeren nach i18n, sonst
  // entstehen zwei Uebersetzungsorte.
  assert.doesNotMatch(sql, /capability_areas[\s\S]{0,400}label/);
});
