import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
/** Ohne Kommentare - sonst findet die Pruefung Begriffe in ihrer Begruendung. */
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Der Anzeigename hat genau einen Schreibweg.
 *
 * ---------------------------------------------------------------------------
 * WAS VORHER WAR
 * ---------------------------------------------------------------------------
 *
 * Fünf Stellen schrieben `profiles.display_name`, und ein Trigger trug ihn in
 * den Kern. Damit konnte eine Nebentabelle die kanonische Identität ändern —
 * dieselbe Bauart, die bei Connect die Bio von 1200 auf 800 Zeichen gekürzt
 * hat.
 *
 * Seit dem 01.10.2026 schreiben alle fünf in `person_core`, und die
 * Propagation trägt den Namen in die Kopien. Migration 20261093120000 hat den
 * Trigger entfernt.
 */

// Seit 03.11.2026 ohne die beiden Aktionen des alten v1-Fragebogens
// (questionnaire/actions.ts, actionsB.ts): nirgends mehr verwendet, entfernt.
const SCHREIBWEGE = [
  join("src", "features", "profile", "actions.ts"),
  join("src", "app", "(product)", "dashboard", "actions.ts"),
];

test("alle Aktionen schreiben den Namen in den Kern", () => {
  for (const datei of SCHREIBWEGE) {
    const code = codeOnly(datei);
    assert.match(code, /writeDisplayNameToCore\(/, `${datei}: schreibt nicht in den Kern`);
  }
});

test("nur die Profilaktion fasst profiles noch an", () => {
  // `upsertProfileBasicsAction` ist die Ausnahme: Sie trägt Rollen, Avatar,
  // Schwerpunkt und Absicht, und die liegen auf `profiles`. Sie schreibt den
  // Namen dort mit, damit eine frisch angelegte Zeile nicht ohne ihn dasteht
  // — kanonisch ist trotzdem der Kern, den sie danach schreibt.
  for (const datei of SCHREIBWEGE.slice(1)) {
    const code = codeOnly(datei);
    // Nur SCHREIBVORGAENGE. Ein `select("display_name")` auf `profiles` ist
    // etwas anderes - und wo er noch steht, ist es eine Lesestelle auf einer
    // Kopie, kein zweiter Schreibweg.
    assert.ok(
      !/from\("profiles"\)\s*\.?(upsert|update|insert)[\s\S]{0,200}display_name/.test(code),
      `${datei}: schreibt den Namen noch direkt nach profiles`,
    );
  }
});

test("der Einstieg schreibt erst die Zeile, dann den Kern", () => {
  // Die Propagation legt keine `profiles`-Zeile an. Wer gerade erst anfängt,
  // hat noch keine — in der anderen Reihenfolge stünde dort kein Name.
  const code = codeOnly(join("src", "features", "profile", "actions.ts"));
  const upsert = code.indexOf("upsertProfileBasicsRow");
  const kern = code.indexOf("writeDisplayNameToCore");
  assert.ok(upsert > 0 && kern > upsert, "der Kern wird vor der Zeile geschrieben");
});

test("leer loescht den Namen nicht", () => {
  // Die Regel stammt aus dem Trigger, den der Helfer ablöst. Ohne sie würde
  // ein leer abgeschicktes Feld im Fragebogen den Namen überall entfernen —
  // auch dort, wo andere Menschen ihn sehen.
  const helfer = codeOnly(join("src", "features", "profile", "displayNameWrite.ts"));
  assert.match(helfer, /name\.length === 0/);
  assert.match(helfer, /return \{ ok: true \}/);

  // Und ein Schreibvorgang ohne Treffer meldet nicht "gespeichert".
  assert.match(helfer, /count: "exact"/);
  assert.match(helfer, /count === 0/);
});

test("der Seed laeuft denselben Weg", () => {
  const seed = codeOnly(join("scripts", "dev-seed.ts"));
  assert.ok(
    !/from\("profiles"\)[\s\S]{0,160}display_name/.test(seed),
    "der Seed schreibt den Namen noch nach profiles",
  );
  assert.match(seed, /from\("person_core"\)[\s\S]{0,200}display_name/);

  // Erst die Zeile, dann der Kern - sonst propagiert nichts.
  const rolle = seed.indexOf("await seedProfile(admin, founder");
  const kern = seed.indexOf("await seedPersonCore(admin, founder");
  assert.ok(rolle > 0 && kern > rolle, "der Seed schreibt den Kern vor der profiles-Zeile");
});

test("die Migration entfernt Trigger und Funktion", () => {
  const migration = source(
    join("..", "supabase", "migrations", "20261093120000_identity_flows_one_way.sql"),
  );
  assert.match(migration, /drop trigger if exists sync_person_core_after_profiles_write/);
  assert.match(migration, /drop function if exists public\.sync_person_core_from_profiles/);
});
