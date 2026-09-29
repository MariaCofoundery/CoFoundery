import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { ALIGNMENT_REGISTRY_V2 } from "@/features/instruments/v2/alignmentRegistryV2";
import { getItemsV21 } from "@/features/instruments/v21/registryV21";
import { getItemsV22, SCOPES } from "@/features/instruments/align/registries";
import {
  allBlockIds,
  answerFormatOfBlock,
  moduleOfBlock,
} from "@/features/instruments/v2/alignmentAnswersV2";

const MIGRATIONS = "../supabase/migrations";

/**
 * Datenbank und Registratur müssen dieselben Wörter benutzen.
 *
 * Diese Tests LESEN DIE MIGRATION, statt ihre Inhalte ein zweites Mal
 * hinzuschreiben. Zwei Listen desselben Sachverhalts laufen auseinander -
 * und zwar lautlos: Die Anwendung schriebe ein Format, das die Datenbank
 * ablehnt, und der Fehler fiele erst bei einem echten Menschen auf, der
 * gerade seinen Fragebogen ausfüllt.
 */
function constraintValues(name: string): string[] {
  const files = readdirSync(MIGRATIONS).filter((file) => file.endsWith(".sql")).sort();
  for (const file of [...files].reverse()) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    // DIE DEFINITION, NICHT DIE ERWAEHNUNG. Am 29.09.2026 bekam eine Regel in
    // derselben Migration erst ein `drop constraint` und dann ein `add
    // constraint`. Die Suche nach "constraint <name>" fand das Loeschen, und
    // die Klammer danach gehoerte zu irgendetwas anderem - der Test las
    // Unsinn und meldete trotzdem ein Ergebnis.
    const start = sql.indexOf(`add constraint ${name}`) !== -1
      ? sql.indexOf(`add constraint ${name}`)
      : sql.indexOf(`constraint ${name}`);
    if (start === -1) continue;
    const open = sql.indexOf("(", sql.indexOf(" in ", start));
    const close = sql.indexOf(")", open);
    return sql
      .slice(open + 1, close)
      .split(",")
      .map((entry) => entry.trim().replace(/^'|'$/g, ""))
      .filter(Boolean);
  }
  throw new Error(`Constraint ${name} steht in keiner Migration`);
}

/**
 * Codes, die die Datenbank erlaubt, ohne dass ein Bogen sie ANBIETET.
 *
 * `technical` ist kein Wort eines Menschen, sondern ein Fehlschlag bei uns -
 * anzubieten wäre absurd, speichern können muss man ihn trotzdem.
 * `not_relevant` ist Altbestand: Die frühere Liste erlaubte ihn, also kann es
 * Zeilen damit geben, und die müssen lesbar bleiben.
 */
const ERLAUBT_OHNE_ANGEBOT = new Set(["technical", "not_relevant"]);

test("jeder angebotene Auslassungsgrund lässt sich auch speichern", () => {
  // UMGEBAUT AM 29.09.2026. Vorher stand hier, die Datenbankliste sei
  // GLEICH der v2-Registratur. Seit es drei Fassungen mit eigenen
  // Auslassungsgründen gibt, ist das nicht mehr dieselbe Frage: Die Datenbank
  // trägt alle drei.
  //
  // Die Regel, auf die es ankommt, ist eine Richtung - was ein Bogen anbietet,
  // muss sich speichern lassen. Sonst drückt jemand auf einen Knopf und
  // bekommt einen Fehler.
  const inDatabase = new Set(constraintValues("alignment_answers_missing_code_check"));

  const angeboten = new Set<string>([
    ...ALIGNMENT_REGISTRY_V2.missingCodes.map((entry) => entry.code),
    ...getItemsV21().flatMap((item) => item.missing.map((entry) => entry.code)),
    ...SCOPES.flatMap((scope) =>
      getItemsV22(scope).flatMap((item) => item.missing.map((entry) => entry.code)),
    ),
  ]);

  for (const code of angeboten) {
    assert.ok(inDatabase.has(code), `${code} wird angeboten, aber nicht gespeichert`);
  }

  // Und umgekehrt nichts Ueberzaehliges: Ein erlaubter Code, den niemand
  // anbietet und niemand begruendet hat, ist ein Rest von gestern.
  for (const code of inDatabase) {
    assert.ok(
      angeboten.has(code) || ERLAUBT_OHNE_ANGEBOT.has(code),
      `${code} ist erlaubt, wird aber nirgends angeboten und steht in keiner Begruendung`,
    );
  }

  // GEGENPROBE: Der Leser findet wirklich etwas und gibt nicht nur eine
  // leere Liste zurück, die sich mit allem verträgt.
  assert.ok(inDatabase.size >= 6, `zu wenige gefunden: ${inDatabase.size}`);
  assert.ok(inDatabase.has("not_clarified"), "der neue Grund fehlt in der Datenbank");
});

test("die Datenbank erlaubt genau die Antwortformate des Instruments", () => {
  const inDatabase = new Set(constraintValues("alignment_answers_format_check"));
  assert.ok(inDatabase.size >= 13, `zu wenige gefunden: ${inDatabase.size}`);

  const unknown: string[] = [];
  for (const blockId of allBlockIds()) {
    const format = answerFormatOfBlock(blockId);
    assert.ok(format, `${blockId}: kein Format`);
    if (!inDatabase.has(format!)) unknown.push(`${blockId}: ${format}`);
  }
  assert.deepEqual(unknown, [], "Diese Formate kennt die Datenbank nicht:\n" + unknown.join("\n"));
});

test("jede Kennung passt in die Form, die die Datenbank verlangt", () => {
  // `block_id ~ '^[A-Z][0-9]{2}$'` steht als Check in der Migration.
  for (const blockId of allBlockIds()) {
    assert.match(blockId, /^[A-Z][0-9]{2}$/, blockId);
  }
  assert.equal(allBlockIds().length, 107);
  assert.equal(new Set(allBlockIds()).size, 107, "keine Kennung doppelt");
});

test("die Wertefälle und die Grenzfragen liegen im Wertemodul", () => {
  // Beide sind Teil E der Quelle. Deshalb braucht v2 keinen neuen Modulwert.
  assert.equal(moduleOfBlock("W01"), "values");
  assert.equal(moduleOfBlock("L01"), "values");
  assert.equal(moduleOfBlock("A01"), "base");
  assert.equal(moduleOfBlock("R12"), "base");

  const modules = new Set(allBlockIds().map(moduleOfBlock));
  assert.deepEqual([...modules].sort(), ["base", "values"]);
});
