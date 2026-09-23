import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ADVISOR_SCOPES } from "@/features/advisor/personAccessData";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const sqlCodeOnly = (path: string) => source(path).replace(/^\s*--.*$/gm, "");

const MIGRATION = "../supabase/migrations/20261040120000_advisor_person_grants.sql";
const VIEW = "src/features/advisor/PersonAccessSection.tsx";
const ACTIONS = "src/features/advisor/personAccessActions.ts";
const ACCOUNT = "src/app/(product)/account/page.tsx";

// ---------------------------------------------------------------------------
// Ein Advisor begleitet auch einzelne Menschen
// ---------------------------------------------------------------------------
//
// GEMELDET AM 23.09.2026: "Ein Accelerator hätte das gerne so, dass man auch
// mit den einzelnen Foundern sprechen kann - nicht nur mit Teams."
//
// Die Grenzen selbst stehen in `supabase/tests/advisor_person_grants.sql`.
// Hier steht, was der Code zusagt.

test("die Umfänge im Code und in der Datenbank sind dieselben", () => {
  const migration = sqlCodeOnly(MIGRATION);
  const start = migration.indexOf("advisor_person_grants_scope_check");
  const block = migration.slice(start, migration.indexOf("))", start));
  const inDatabase = [...block.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort();
  assert.deepEqual(inDatabase, [...ADVISOR_SCOPES].sort());
});

test("Erzählungen sind kein Umfang - und werden es nicht", () => {
  // DIE GRENZE, die beim Teamzugang schon gilt: Ein Advisor sieht bestätigte
  // Ergebnisse, nie den Rohtext. Frage 3 des Fähigkeits-Interviews fragt nach
  // dem Leben außerhalb der Erwerbsarbeit; dort stehen Pflege, Ehrenamt,
  // Familie.
  assert.ok(!(ADVISOR_SCOPES as readonly string[]).includes("interview_answers"));
  assert.ok(!(ADVISOR_SCOPES as readonly string[]).includes("narratives"));
  // Und es steht auf der Seite, statt geglaubt werden zu müssen.
  assert.match(codeOnly(VIEW), /neverShared/);
  for (const locale of ["de", "en"]) {
    const copy = (
      JSON.parse(source(`messages/${locale}/account.json`)) as {
        personAccess: Record<string, string>;
      }
    ).personAccess;
    assert.match(copy.neverShared!, /Erz(ä|ae)hlungen|stories/i, `${locale}`);
  }
});

test("je Umfang eine Entscheidung, nicht alles oder nichts", () => {
  // Wer nur die Richtung wieder verbergen will, nimmt eine Zeile zurück. Bei
  // einem Feld mit allen Umfängen wäre derselbe Vorgang ein Schreibzugriff auf
  // die Freigabe, die bestehen bleibt.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(
    migration,
    /unique index advisor_person_grants_once[\s\S]{0,120}\(subject_user_id, advisor_user_id, scope\)/
  );
  assert.doesNotMatch(migration, /scopes text\[\]|scope_mask|jsonb/);
});

test("zwischen Anfrage und Sichtbarkeit steht ein Mensch", () => {
  // DIE ZUSAGE, auf der alles andere steht - und die Stelle, an der später
  // auch ein bezahlter Sitz nichts anderes tun wird: Der Kauf erzeugt eine
  // Anfrage, nie einen Zugang.
  const migration = sqlCodeOnly(MIGRATION);
  const request = migration.slice(
    migration.indexOf("function public.request_advisor_person_access"),
    migration.indexOf("function public.decide_advisor_person_access")
  );
  assert.doesNotMatch(request, /status = 'active'|approved_at = pg_catalog\.now\(\)/);
  // Aktiv heißt zugestimmt - ohne Zeitpunkt wäre "aktiv" eine Behauptung ohne
  // Beleg.
  assert.match(migration, /\(status = 'active'\) = \(approved_at is not null\)/);
});

test("widerrufen steht neben dem Zugang, nicht zwei Ebenen tiefer", () => {
  // Ein Widerruf, den man suchen muss, ist einer, den man nicht ausübt.
  const view = codeOnly(VIEW);
  assert.match(view, /revokePersonAccessAction/);
  assert.match(view, /activeTitle/);
  // Und die Seite zeigt beides: offene Anfragen und geltende Zugänge.
  assert.match(view, /requestedTitle/);
  assert.match(codeOnly(ACCOUNT), /<PersonAccessSection grants=\{personAccessGrants\}/);
});

test("wer was entscheiden darf, steht in der Datenbank und nicht im Formular", () => {
  // Eine zweite Kopie dieser Regel im Code wäre die erste, die ausläuft - und
  // auslaufen hieße hier, dass jemand zustimmt, der nicht gefragt war.
  const actions = codeOnly(ACTIONS);
  assert.match(actions, /decide_advisor_person_access/);
  assert.doesNotMatch(actions, /\.update\(|\.insert\(|status:/);
});
