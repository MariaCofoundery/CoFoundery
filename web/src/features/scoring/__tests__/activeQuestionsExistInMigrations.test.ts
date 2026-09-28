import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getOrderedActiveRegistryItems } from "@/features/scoring/founderCompatibilityRegistry";
import {
  getFounderCompatibilityBasePersistedChoiceValue,
  getFounderCompatibilityBasePersistenceQuestionId,
} from "@/features/questionnaire/founderCompatibilityBaseQuestionnaire";

/**
 * Die Datenbank muss die Fragen kennen, die der Code ausliefert.
 *
 * ---------------------------------------------------------------------------
 * WARUM ES DIESEN TEST GIBT
 * ---------------------------------------------------------------------------
 *
 * Am 28.09.2026 bekam Maria beim Durchklicken einen Serverfehler
 * (`founder_base_question_contract_mismatch`). Der Befund dahinter war
 * groesser als die Meldung: Eine Datenbank, die ausschliesslich aus den
 * Migrationen dieses Repos gebaut wird, enthielt in `questions` nur die alten
 * Kennungen D1_Q1 bis D6_Q6 - keine einzige der 36 Kennungen, unter denen der
 * aktuelle Fragebogen seine Antworten speichert.
 *
 * Auf so einer Datenbank liess sich keine einzige Antwort speichern:
 * `assessment_answers` hat einen Fremdschluessel auf `questions`, und ein
 * Trigger prueft zusaetzlich den Auswahlwert.
 *
 * Produktiv lief es trotzdem - also sind die Zeilen dort auf einem anderen Weg
 * hineingekommen als ueber dieses Repo. Das ist das eigentliche Problem, und
 * es faellt niemandem auf, solange niemand die Datenbank neu baut.
 *
 * DIESER TEST BRAUCHT KEINE DATENBANK. Er liest die Migrationen als Text -
 * dieselbe Sorte Klammer wie bei den Instrumentkennungen und den
 * Discovery-Themen.
 */

const MIGRATIONS = "../supabase/migrations";

const migrationText = (() => {
  const parts: string[] = [];
  for (const name of readdirSync(MIGRATIONS).filter((file) => file.endsWith(".sql")).sort()) {
    parts.push(readFileSync(join(MIGRATIONS, name), "utf8"));
  }
  return parts.join("\n");
})();

test("jede ausgelieferte Frage wird von einer Migration angelegt", () => {
  const items = getOrderedActiveRegistryItems();
  assert.ok(items.length >= 30, `zu wenige aktive Items: ${items.length}`);

  const missing: string[] = [];
  for (const item of items) {
    const questionId = getFounderCompatibilityBasePersistenceQuestionId(item.itemId);
    assert.ok(questionId, `${item.itemId}: keine Speicherkennung`);
    // Die Kennung muss als Zeichenkette in einer Migration vorkommen - dort
    // steht sie nur in einem `insert into public.questions`.
    if (!migrationText.includes(`'${questionId}'`)) missing.push(`${item.itemId} -> ${questionId}`);
  }

  assert.deepEqual(
    missing,
    [],
    "Diese Fragen liefert der Code aus, aber keine Migration legt sie an. Auf " +
      "einer frisch gebauten Datenbank kann darauf keine Antwort gespeichert " +
      "werden:\n" + missing.join("\n")
  );
});

test("und jede Auswahlmöglichkeit ebenfalls", () => {
  // Der Trigger `enforce_base_choice_value_matches_choice` prueft nicht nur
  // die Frage, sondern auch den Wert. Eine Frage ohne ihre Auswahlzeilen
  // waere genauso unbrauchbar - nur mit einer anderen Fehlermeldung.
  const sample = getOrderedActiveRegistryItems().slice(0, 5);
  const missing: string[] = [];

  for (const item of sample) {
    const questionId = getFounderCompatibilityBasePersistenceQuestionId(item.itemId)!;
    for (const choice of item.choices) {
      const value = getFounderCompatibilityBasePersistedChoiceValue(item.itemId, String(choice.value));
      assert.ok(value, `${item.itemId}: kein gespeicherter Wert fuer ${choice.value}`);
      // Frage und Wert muessen in derselben Einfuegezeile stehen.
      if (!migrationText.includes(`('${questionId}', '${choice.label.replace(/'/g, "''")}', '${value}'`)) {
        missing.push(`${questionId} / ${choice.label}`);
      }
    }
  }

  assert.deepEqual(missing, [], "Fehlende Auswahlzeilen:\n" + missing.join("\n"));
});

test("der Wächter würde die Lücke wirklich bemerken", () => {
  // GEGENPROBE. Ein Test, der Migrationen als Text liest, ist gruen, sobald er
  // nichts findet - deshalb hier der Nachweis, dass er sucht UND dass eine
  // erfundene Kennung durchfaellt.
  assert.ok(migrationText.length > 100000, "die Migrationen wurden gelesen");
  assert.ok(migrationText.includes("'q01_vision_l1'"), "eine echte Kennung wird gefunden");
  assert.ok(!migrationText.includes("'q99_gibt_es_nicht'"), "eine erfundene nicht");

  // Und die alten Kennungen bleiben unangetastet - an ihnen koennen alte
  // Antworten haengen (`on delete restrict`).
  assert.ok(migrationText.includes("D1_Q1"), "die alten Fragen sind weiterhin da");
});
