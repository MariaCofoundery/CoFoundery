import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  ALIGNMENT_V2_INSTRUMENT_ID,
  ALIGNMENT_V21_INSTRUMENT_ID,
  CURRENT_INSTRUMENT_ID,
  INSTRUMENT_IDS,
} from "@/features/instruments/instruments";
import { ALIGNMENT_REGISTRY_V2 } from "@/features/instruments/v2/alignmentRegistryV2";
import { CONTEXT_REGISTRY_V2 } from "@/features/instruments/v2/contextRegistryV2";
import { REGISTRY_V21 } from "@/features/instruments/v21/registryV21";
import { BEHAVIOUR_SET_V21 } from "@/features/instruments/align/behaviourItems";
import { getItemsV22, SCOPES } from "@/features/instruments/align/registries";

/**
 * Die Liste der Fassungen steht an drei Orten. Sie darf nicht auseinanderlaufen.
 *
 * Im Code (`INSTRUMENT_IDS`), in den Migrationen (Zeilen in `instruments`) und
 * in den Registraturen (`instrumentId`). Das ist eine bewusste Doppelung - der
 * Code braucht die Liste zur Übersetzungszeit, die Datenbank für den
 * Fremdschlüssel. Doppelungen laufen auseinander, also liest dieser Test die
 * Migrationen, statt ihren Inhalt ein zweites Mal zu behaupten.
 *
 * Was sonst passiert: Die Anwendung schreibt eine Kennung, die es als Zeile
 * nicht gibt, und der Fremdschlüssel schlägt zu - beim ersten Menschen, der
 * den Fragebogen abschickt.
 */

const MIGRATIONS = "../supabase/migrations";

function instrumentIdsInMigrations(): string[] {
  const found = new Set<string>();
  for (const file of readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql"))) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    let at = sql.indexOf("into public.instruments");
    while (at !== -1) {
      const end = sql.indexOf(";", at);
      for (const match of sql.slice(at, end).matchAll(/\('([a-z0-9][a-z0-9-]{2,62})',/g)) {
        found.add(match[1]);
      }
      at = sql.indexOf("into public.instruments", at + 1);
    }
  }
  return [...found].sort();
}

test("Code und Migrationen kennen dieselben Fassungen", () => {
  const inMigrations = instrumentIdsInMigrations();
  // GEGENPROBE: Ein Leser, der nichts findet, verträgt sich mit allem.
  assert.ok(inMigrations.length >= 2, `zu wenige gefunden: ${inMigrations.join(", ")}`);
  assert.deepEqual([...INSTRUMENT_IDS].sort(), inMigrations);
});

test("die Registraturen nennen dieselbe Fassung, und der Code kennt sie", () => {
  assert.equal(ALIGNMENT_REGISTRY_V2.instrumentId, CONTEXT_REGISTRY_V2.instrumentId);
  assert.equal(ALIGNMENT_REGISTRY_V2.registryVersion, CONTEXT_REGISTRY_V2.registryVersion);
  assert.equal(ALIGNMENT_REGISTRY_V2.instrumentId, ALIGNMENT_V2_INSTRUMENT_ID);
});

test("v2 wird noch niemandem vorgelegt", () => {
  // Solange das zwei verschiedene Konstanten sind, kann nichts versehentlich
  // die Neufassung ausliefern - wer v2 meint, muss es hinschreiben.
  assert.notEqual(CURRENT_INSTRUMENT_ID, ALIGNMENT_V2_INSTRUMENT_ID);
  assert.equal(CURRENT_INSTRUMENT_ID, "founder-compatibility-v1");

  // Und beide Registraturen stehen auf `draft`.
  assert.equal(ALIGNMENT_REGISTRY_V2.status, "draft");
  assert.equal(CONTEXT_REGISTRY_V2.status, "draft");
});

test("die Registratur v2.1 nennt die Fassung, die der Code kennt", () => {
  assert.equal(REGISTRY_V21.instrumentId, ALIGNMENT_V21_INSTRUMENT_ID);
  assert.notEqual(REGISTRY_V21.instrumentId, ALIGNMENT_V2_INSTRUMENT_ID);
});

test("auch v2.1 wird noch niemandem vorgelegt", () => {
  assert.notEqual(CURRENT_INSTRUMENT_ID, ALIGNMENT_V21_INSTRUMENT_ID);
  assert.equal(REGISTRY_V21.status, "draft");
});

test("die Verhaltensfragen werden niemandem vorgelegt", () => {
  // UEBERARBEITET, ABER NICHT VORGELEGT. Die Gutachterin hat sie am
  // 29.09.2026 auf `revise` gesetzt, ueberarbeitet und ausdruecklich
  // entschieden, dass sie danach NICHT automatisch in den Fragebogen wandern.
  // Erst ein Pretest entscheidet, wohin sie gehoeren.
  //
  // Solange das hier `candidate_for_pretest` ist, kann niemand sie fuer
  // freigegeben halten, nur weil sie im selben Ordner liegen.
  assert.equal(BEHAVIOUR_SET_V21.status, "candidate_for_pretest");

  // Und sie stehen wirklich in keinem Bogen.
  const kennungen = new Set(BEHAVIOUR_SET_V21.items.map((item) => item.itemId));
  for (const scope of SCOPES) {
    for (const item of getItemsV22(scope)) {
      assert.ok(!kennungen.has(item.itemId), `${item.itemId} steht im Fragebogen`);
    }
  }
});

test("die Migration archiviert v2 und laesst genau eine Fassung aktiv", () => {
  // Gelesen statt behauptet: Der Test liest die Migrationen, damit er nicht
  // ein zweites Mal aufschreibt, was dort steht.
  const sql = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => readFileSync(join(MIGRATIONS, name), "utf8"))
    .join("\n");
  assert.match(sql, /set status = 'archived'\s*\n?\s*where id = 'founder-alignment-v2'/,
    "keine Migration archiviert v2");
  assert.ok(!/delete from public\.instruments/.test(sql),
    "eine Fassung, die es gab, wird nicht geloescht - Antworten wuerden heimatlos");
});
