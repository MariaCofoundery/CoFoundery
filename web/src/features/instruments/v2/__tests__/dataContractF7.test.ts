import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { allBlockIds, answerModeOfBlock } from "@/features/instruments/v2/alignmentAnswersV2";

/**
 * Der Datenvertrag aus Teil F7 des Gutachtens.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS EIN TEST IST UND KEINE CHECKLISTE IM DOKUMENT
 * ---------------------------------------------------------------------------
 *
 * F7 zaehlt auf, was jede Antwort mitfuehren muss. Eine Liste in einem
 * Dokument wird beim Bauen einmal gelesen und danach nie wieder. Ein Test
 * meldet sich, wenn eine Spalte verschwindet - und haelt vor allem fest, WAS
 * NOCH FEHLT, statt dass es in Vergessenheit geraet.
 *
 * Zwei Forderungen sind bewusst offen (Team und Rolle). Sie stehen unten mit
 * Begruendung; wer sie schliesst, loescht dort eine Zeile.
 */

const MIGRATIONS = "../supabase/migrations";

const schema = (() => {
  const parts: string[] = [];
  for (const file of readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    if (sql.includes("alignment_answers") || sql.includes("public.assessments")) parts.push(sql);
  }
  return parts.join("\n");
})();

test("was F7 verlangt, wird gespeichert", () => {
  const stored: [string, RegExp][] = [
    ["Item-ID", /block_id text not null/],
    ["Instrumentversion", /instrument_id text references public\.instruments/],
    ["Sprachversion", /add column language text not null default 'de'/],
    ["Person", /user_id uuid not null/],
    ["Missinggrund", /missing_code text/],
    ["Zeitstempel", /answered_at timestamptz not null/],
    ["Antwortformat mit der Antwort", /answer_format text not null/],
  ];

  const absent = stored.filter(([, pattern]) => !pattern.test(schema)).map(([label]) => label);
  assert.deepEqual(absent, [], "Diese Angaben aus F7 fehlen im Schema:\n" + absent.join("\n"));

  // GEGENPROBE: Der Leser hat wirklich Migrationen gefunden.
  assert.ok(schema.length > 5000, `zu wenig Schema gelesen: ${schema.length}`);
});

test("Optionen werden über ihre Kennung gespeichert, nicht über ihren Text", () => {
  // „Randomisierte Optionen werden vor Interpretation auf ihre stabilen IDs
  // zurueckgefuehrt" - das geht nur, wenn der Text gar nicht erst in die
  // Zeile kommt.
  assert.match(schema, /alignment_answers_choice_uses_ids/);
  assert.match(schema, /not \(value \? 'option'\) and not \(value \? 'options'\)/);
});

test("Geld hat Währung und Bezug, Stunden haben ihre Einheit", () => {
  // „Geldbetraege brauchen Waehrung und Monats-/Brutto-/Nettobezug; Stunden
  // sind Stunden pro Woche im definierten Zeitraum."
  assert.match(schema, /alignment_answers_money_needs_currency/);
  assert.match(schema, /alignment_answers_number_needs_unit/);
});

test("Erwartungen führen ihren Empfänger mit", () => {
  // „Erwartungen speichern zusaetzlich den Empfaenger." R02 ist die gerichtete
  // Frage: A→B und B→A sind getrennte Beziehungen.
  const validator = readFileSync("src/features/instruments/v2/validateAlignmentAnswer.ts", "utf8");
  assert.match(validator, /recipient_missing/);
  assert.match(validator, /no_recipient/);
});

test("jede Antwort kennt ihren Antwortmodus", () => {
  // Abgeleitet statt gespeichert - eine abgeleitete Angabe kann nicht von der
  // Wirklichkeit abweichen.
  assert.equal(answerModeOfBlock("A01"), "intended_practice");
  assert.equal(answerModeOfBlock("R01"), "actual_resource");
  assert.equal(answerModeOfBlock("W01"), "hypothetical_case");
  assert.equal(answerModeOfBlock("L01"), "intended_practice");

  const modes = new Set(allBlockIds().map(answerModeOfBlock));
  assert.deepEqual([...modes].sort(), ["actual_resource", "hypothetical_case", "intended_practice"]);
});

test("was aus F7 noch offen ist, steht hier und nicht in einer Schublade", () => {
  // KEIN TEST, DER ETWAS PRUEFT - EINER, DER ETWAS FESTHAELT. Wer eine dieser
  // Zeilen schliesst, loescht sie hier.
  const open = {
    Team:
      "Eine Antwort gehoert heute zu einer Person, nicht zu einem Team. Das ist " +
      "richtig so: Dieselben Antworten koennen in mehreren Konstellationen " +
      "verglichen werden, und sie dem ersten Team fest zuzuordnen waere falsch. " +
      "Der Teambezug entsteht beim Vergleich - Schritt 6.",
    Rolle:
      "Die geplante Rolle steht in S06 als Antwort, nicht als Merkmal der " +
      "Antwortzeile. Fuer die gerichtete Erwartung (R02) reicht das: Dort wird " +
      "der Empfaenger frei benannt, 'Person oder Rolle'. Eine eigene " +
      "Rollenzuordnung braucht erst der Teamvergleich.",
    Referenzzeitraum:
      "Steht im Fragetext selbst ('in den naechsten zwoelf Wochen') und ist je " +
      "Block konstant. Eine zweite, freie Angabe koennte davon abweichen - " +
      "dann stuenden zwei Zeitraeume in derselben Zeile.",
  };

  for (const [label, reason] of Object.entries(open)) {
    assert.ok(reason.length > 80, `${label}: Begruendung zu duenn`);
  }
  assert.deepEqual(Object.keys(open).sort(), ["Referenzzeitraum", "Rolle", "Team"]);
});
