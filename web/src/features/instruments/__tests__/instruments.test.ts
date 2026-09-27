import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assertInstrument,
  CURRENT_INSTRUMENT_ID,
  INSTRUMENT_IDS,
  isInstrumentId,
} from "@/features/instruments/instruments";

const sqlCodeOnly = (path: string) => readFileSync(path, "utf8").replace(/^\s*--.*$/gm, "");
const MIGRATION = "../supabase/migrations/20261053120000_instrument_versions.sql";

// ---------------------------------------------------------------------------
// Schritt 0: Jede Antwort weiß, zu welchem Instrument sie gehört
// ---------------------------------------------------------------------------
//
// Bis zur Migration 20261053120000 wusste das keine. Ein Wechsel wäre damit
// keine neue Fassung gewesen, sondern eine stille Umdeutung aller bisherigen
// Antworten - und drei Dinge, die ausdrücklich gewünscht sind, wären
// unmöglich gewesen: die alte Fassung behalten, das Alte archivieren, und
// dass jede Auswertung weiß, ob sie zuständig ist.

test("Code und Datenbank kennen dieselben Fassungen", () => {
  const migration = sqlCodeOnly(MIGRATION);

  // EINE BEWUSSTE DOPPELUNG: Der Code braucht die Liste zur Übersetzungszeit,
  // die Datenbank für den Fremdschlüssel. Dieser Test ist die Klammer.
  for (const id of INSTRUMENT_IDS) {
    assert.ok(migration.includes(`'${id}'`), `${id} fehlt in der Migration`);
  }
  assert.ok(isInstrumentId(CURRENT_INSTRUMENT_ID));
});

test("eine fremde Fassung wird abgewiesen, nicht umgedeutet", () => {
  // Eine Auswertung, die auf eine unbekannte Fassung trifft, hat zwei
  // Möglichkeiten: abbrechen oder so tun, als wäre es die eigene. Das Zweite
  // ist genau die stille Umdeutung, gegen die das hier gebaut ist.
  assert.doesNotThrow(() => assertInstrument(CURRENT_INSTRUMENT_ID, CURRENT_INSTRUMENT_ID));
  assert.throws(() => assertInstrument("founder-alignment-v2", CURRENT_INSTRUMENT_ID), /instrument_mismatch/);
  assert.throws(() => assertInstrument(null, CURRENT_INSTRUMENT_ID), /instrument_mismatch/);
  assert.throws(() => assertInstrument(undefined, CURRENT_INSTRUMENT_ID), /instrument_mismatch/);

  assert.equal(isInstrumentId("founder-alignment-v2"), false);
  assert.equal(isInstrumentId(null), false);
});

test("die Spalte ist verpflichtend und hat einen Vorgabewert", () => {
  const migration = sqlCodeOnly(MIGRATION);

  // Nachträglich hinzugefügt, rückgefüllt, dann verpflichtend - in dieser
  // Reihenfolge, sonst scheitert die Migration an vorhandenen Zeilen.
  assert.match(migration, /add column instrument_id text references public\.instruments/);
  assert.match(migration, /update public\.assessments set instrument_id = 'founder-compatibility-v1'/);
  assert.match(migration, /alter column instrument_id set not null/);

  // Auch das Abbild, aus dem der Advisor liest. Sonst stünden v1- und
  // v2-Werte unbemerkt in derselben Spalte mit derselben Beschriftung.
  assert.match(migration, /alter table public\.person_alignment_snapshots[\s\S]{0,200}add column instrument_id/);
});

test("ein Instrument mit Antworten kann nicht gelöscht werden", () => {
  const migration = sqlCodeOnly(MIGRATION);

  // Archivieren ja, löschen nein - sonst wären die Antworten von Menschen
  // plötzlich herrenlos.
  assert.equal([...migration.matchAll(/on delete restrict/g)].length, 2);
  assert.match(migration, /status in \('draft', 'active', 'archived'\)/);
});

test("das Archiv ist ein Status und kein zweiter Speicher", () => {
  const migration = sqlCodeOnly(MIGRATION);

  // Eine Tabelle "alte_antworten" wäre ein zweiter Speicher, und der läuft
  // irgendwann auseinander. Eine archivierte Fassung bleibt vollständig
  // lesbar und rechenbar; sie wird nur niemandem mehr neu vorgelegt.
  // Genauer als beim ersten Versuch: Geprüft wird der NAME einer Tabelle.
  // `[^;]*` lief über die ganze `create table` hinweg und fand das zulässige
  // `'archived'` in der Statusbedingung.
  assert.ok(
    !/create table\s+(public\.)?[a-z_]*archiv/i.test(migration),
    "keine Archivtabelle"
  );
  assert.match(migration, /'archived'/);
});

test("Fassungen entstehen in Migrationen, nicht zur Laufzeit", () => {
  const migration = sqlCodeOnly(MIGRATION);
  // Lesen dürfen alle, schreiben niemand über die Anwendung.
  assert.match(migration, /grant select on public\.instruments/);
  assert.ok(
    !/grant (insert|update|delete)[^;]*public\.instruments/.test(migration),
    "kein Schreibrecht auf die Fassungen"
  );
});
