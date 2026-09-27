import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { ALIGNMENT_REGISTRY_V2 } from "@/features/instruments/v2/alignmentRegistryV2";
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
    const start = sql.indexOf(`constraint ${name}`);
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

test("die Datenbank erlaubt genau die Auslassungsgründe der Registratur", () => {
  const inDatabase = constraintValues("alignment_answers_missing_code_check").sort();
  const inRegistry = ALIGNMENT_REGISTRY_V2.missingCodes.map((entry) => entry.code).sort();
  assert.deepEqual(inDatabase, inRegistry);

  // GEGENPROBE: Der Leser findet wirklich etwas und gibt nicht nur eine
  // leere Liste zurück, die sich mit allem verträgt.
  assert.ok(inDatabase.length >= 6, `zu wenige gefunden: ${inDatabase.length}`);
  assert.ok(inDatabase.includes("undecided"));
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
