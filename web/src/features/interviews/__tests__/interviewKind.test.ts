import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { INTERVIEW_KINDS } from "@/features/interviews/interviewKinds";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const sqlCodeOnly = (path: string) => source(path).replace(/^\s*--.*$/gm, "");

const DATA = "src/features/capability/capabilityInterviewData.ts";
const ACTIONS = "src/features/capability/capabilityInterviewActions.ts";

// ---------------------------------------------------------------------------
// Ein Gespräch hat eine Art
// ---------------------------------------------------------------------------
//
// SCHRITT S1 aus `web/docs/direction-interview-technical-brief.md`: Die
// Gesprächsmechanik wird geteilt, die Auswertung bleibt getrennt. Die
// Grenzen in der Datenbank stehen in `supabase/tests/interview_kind.sql`;
// hier steht, was der Code zusagt.

test("die Liste der Arten im Code und in der Datenbank ist dieselbe", () => {
  // Wäre sie im Code länger, liefe ein Gespräch in einen Constraint-Fehler.
  // Wäre sie kürzer, gäbe es eine Art, die niemand starten kann.
  //
  // Gelesen werden ALLE Migrationen: Die Werteliste kann später erweitert
  // werden (problem_discovery, venture_reflection stehen im Brief), und ein
  // Test, der nur eine Datei liest, prüft ab dann eine Fassung, die es nicht
  // mehr gibt.
  const dir = "../supabase/migrations";
  const blocks = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .flatMap((name) => {
      const sql = sqlCodeOnly(`${dir}/${name}`);
      const start = sql.indexOf("capability_interview_sessions_kind_check");
      return start === -1 ? [] : [sql.slice(start, sql.indexOf(")", sql.indexOf("check (kind in (", start) + 16))];
    });
  assert.ok(blocks.length > 0, "die Werteliste steht in keiner Migration");
  const inDatabase = [...blocks[blocks.length - 1]!.matchAll(/'([a-z_]+)'/g)]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(inDatabase, [...INTERVIEW_KINDS].sort());
});

test("jeder Leser des Capability-Interviews filtert auf seine Art", () => {
  // DER EINE WEG, AUF DEM DIESES TEILEN SCHADEN ANRICHTET: `getActiveInterview`
  // holte "das" aktive Gespräch mit `maybeSingle()`. Sobald jemand zwei
  // Gespräche verschiedener Art offen hat, liefert das einen Fehler - und der
  // wird als "kein Gespräch" gelesen. Das Capability-Interview wäre nicht
  // falsch geworden, sondern verschwunden.
  const data = codeOnly(DATA);
  const queries = data.split("await client").slice(1);
  const onInterviewTables = queries.filter((query) =>
    /from\("capability_interview_(sessions|turns)"\)/.test(query)
  );
  assert.ok(onInterviewTables.length >= 5, "die Leser wurden nicht gefunden");
  for (const query of onInterviewTables) {
    const chain = query.slice(0, query.includes(";") ? query.indexOf(";") : 400);
    // ZWEI GÜLTIGE EINGRENZUNGEN, und beide reichen für sich:
    //
    //   `.eq("kind", ...)` - die Art steht direkt an der Abfrage.
    //
    //   `.eq("session_id", ...)` - die Zeilen EINER Sitzung. Die Sitzung wurde
    //   oben nach Art geholt, und eine Zeile kann der Art ihrer Sitzung nicht
    //   widersprechen (zusammengesetzter Fremdschlüssel auf (id, kind) in der
    //   Migration 20261035120000). Ein zusätzlicher Filter wäre hier keine
    //   Sicherheit, sondern eine zweite Stelle, an der dieselbe Regel steht.
    assert.ok(
      /\.eq\("kind", CAPABILITY_INTERVIEW\)/.test(chain) || /\.eq\("session_id"/.test(chain),
      `eine Abfrage auf die Interviewtabellen ohne Eingrenzung: ${chain.slice(0, 90)}`
    );
  }
});

test("die Art wird beim Schreiben ausdrücklich gesetzt", () => {
  // Der Vorgabewert der Spalte ist für die BESTEHENDEN Zeilen gedacht, damit
  // keine wandern mussten. Wer neu schreibt, sagt, was er meint.
  const actions = codeOnly(ACTIONS);
  const inserts = actions.split(".insert({").slice(1);
  const onInterviewTables = inserts.filter((_, index) =>
    /capability_interview_(sessions|turns)/.test(actions.split(".insert({")[index]!.slice(-160))
  );
  assert.ok(onInterviewTables.length >= 4, `nur ${onInterviewTables.length} Schreibstellen gefunden`);
  for (const insert of onInterviewTables) {
    assert.match(
      insert.slice(0, insert.indexOf("})")),
      /kind: CAPABILITY_INTERVIEW/,
      "eine Schreibstelle ohne Art"
    );
  }
});

test("die Tabellen behalten ihre Namen", () => {
  // Ein `capability_interview_turns` mit Direction-Zeilen ist ein unschöner
  // Name - aber ein Name ist billiger als ein Umzug von Zeilen durch zwanzig
  // Policies, drei Funktionen und sechzehn Testdateien. Wer das später doch
  // umbaut, soll hier vorbeikommen und die Entscheidung sehen.
  const migration = sqlCodeOnly("../supabase/migrations/20261035120000_interview_kind.sql");
  assert.doesNotMatch(migration, /rename to|create table/i);
  // Die Policies wurden nicht angefasst: Sie prüfen user_id = auth.uid(), und
  // das gilt für jede Art.
  assert.doesNotMatch(migration, /create policy|drop policy|alter policy/i);
});

test("die Art der Zeile kann der Sitzung nicht widersprechen", () => {
  // Eine denormalisierte Spalte ist nur dann keine Kopie, die auseinanderläuft,
  // wenn sie es nicht kann: zusammengesetzter Fremdschlüssel auf (id, kind).
  const migration = sqlCodeOnly("../supabase/migrations/20261035120000_interview_kind.sql");
  assert.match(migration, /unique \(id, kind\)/);
  assert.match(migration, /foreign key \(session_id, kind\)/);
  // Und Evidenz gehört zu Capability: Für "mich treibt an, komplizierte
  // Systeme verständlicher zu machen" gibt es keinen Fähigkeitsbereich.
  assert.match(migration, /kind = 'capability' or evidence_id is null/);
});
