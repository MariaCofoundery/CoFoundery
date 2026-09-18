import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const MIGRATIONS = "../supabase/migrations";

/**
 * Kein Verweis auf auth.users darf eine Kontoloeschung verbieten.
 *
 * Am 18.09.2026 schlug die Loeschung fuer jeden fehl, der das Produkt wirklich
 * benutzt hatte - "Dein Account konnte gerade nicht vollstaendig geloescht
 * werden". Der Grund war kein Fehler im Loeschcode, sondern acht
 * Fremdschluessel auf auth.users, die seit dem Schreiben der Loeschung
 * dazugekommen waren und ein Loeschen verbieten (on delete restrict,
 * beziehungsweise der Default no action).
 *
 * Es gibt dazu eine pgTAP-Pruefung, die den echten Zustand der Datenbank
 * ansieht. Sie ist die genauere - aber sie laeuft nur, wenn jemand sie
 * startet. Diese hier laeuft bei jedem `npm test` und liest die Migrationen.
 *
 * Sie zaehlt bewusst keine bekannten Faelle auf: Genau das ist die Fehlerart,
 * bei der die naechste neue Tabelle unbemerkt durchrutscht.
 */

type Reference = { table: string; column: string; file: string; clause: string };

function collectAuthUserReferences(): Reference[] {
  const found: Reference[] = [];

  for (const file of readdirSync(MIGRATIONS).sort()) {
    if (!file.endsWith(".sql")) continue;
    const sql = readFileSync(path.join(MIGRATIONS, file), "utf8");

    // Tabellenkoerper mit Klammerzaehlung - eine Regex bricht am ersten
    // inneren "(" ab, und davon gibt es in jedem check() eins.
    const pattern = /create table (?:if not exists )?public\.([a-z_]+)\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(sql)) !== null) {
      const table = match[1];
      let depth = 0;
      let end = match.index + match[0].length - 1;
      for (let index = end; index < sql.length; index += 1) {
        if (sql[index] === "(") depth += 1;
        else if (sql[index] === ")") {
          depth -= 1;
          if (depth === 0) {
            end = index;
            break;
          }
        }
      }

      for (const line of sql.slice(match.index, end).split("\n")) {
        if (!line.includes("auth.users")) continue;
        const column = /^\s*([a-z_]+)\s/.exec(line)?.[1] ?? /\(([a-z_]+)\)/.exec(line)?.[1] ?? "?";
        const clause = /on delete (cascade|set null|restrict|set default|no action)/.exec(line)?.[1] ?? "no action";
        found.push({ table, column, file, clause });
      }
    }
  }

  return found;
}

const REPAIR = path.join(MIGRATIONS, "20261004120000_fix_account_deletion_blockers.sql");

test("jeder blockierende Verweis auf auth.users ist benannt und aufgeloest", () => {
  const references = collectAuthUserReferences();
  assert.ok(references.length > 15, `zu wenige Verweise gefunden (${references.length}) - die Suche greift nicht`);

  // Erlaubt ohne weiteres Zutun ist nur, was eine Entscheidung ausdrueckt: Die
  // Zeile geht mit (cascade) oder sie bleibt und verliert die Verknuepfung
  // (set null).
  const blocking = references.filter(
    (reference) => reference.clause !== "cascade" && reference.clause !== "set null"
  );

  // Diese Pruefung liest Text, keine Datenbank - eine spaetere ALTER-Anweisung
  // sieht sie nicht. Genauer prueft das pgTAP
  // (supabase/tests/account_deletion_has_no_blockers.sql), aber das laeuft nur,
  // wenn jemand es startet.
  //
  // Was Text gut kann: verlangen, dass jeder blockierende Verweis in der
  // Reparatur BENANNT ist, samt der Entscheidung dazu. Eine neue Tabelle
  // faellt damit auf, bevor sie jemandem das Loeschen verbietet.
  const repair = readFileSync(REPAIR, "utf8");
  const unnamed = blocking
    .map((reference) => `${reference.table}.${reference.column}`)
    .filter((name, index, all) => all.indexOf(name) === index)
    .filter((name) => !repair.includes(name));

  assert.deepEqual(
    unnamed,
    [],
    "diese Verweise verbieten eine Kontoloeschung und stehen nirgends - bitte in der Reparatur-Migration eintragen und entscheiden, was mit den Zeilen passiert"
  );
});

test("was bleibt, verliert die Verknuepfung - und darf das auch", () => {
  const migrations = readdirSync(MIGRATIONS)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(MIGRATIONS, file), "utf8"))
    .join("\n");

  // Ein "set null" auf einer not-null-Spalte waere ein Constraint-Fehler
  // mitten in der Loeschung - derselbe Fehlschlag, nur an anderer Stelle.
  // Die Reparatur macht die fuenf Spalten deshalb ausdruecklich nullable.
  assert.match(migrations, /alter column %I drop not null/);
  for (const table of [
    "founder_team_setup_items",
    "founder_team_setup_revisions",
    "founder_team_advisor_setup_grants",
    "founder_team_setup_discussion_entries",
    "commitment_lab_discussion_entries",
  ]) {
    assert.match(migrations, new RegExp(`'${table}'`), `${table} wird nicht entkoppelt`);
  }
});

test("eine gespielte Lab-Runde geht mit dem Konto", () => {
  const migrations = readdirSync(MIGRATIONS)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(MIGRATIONS, file), "utf8"))
    .join("\n");

  // Eine Runde besteht aus den Antworten beider. Sie zu anonymisieren hiesse,
  // die Antworten der gehenden Person stehen zu lassen - und die sind das
  // Persoenlichste, was diese Labs erheben.
  assert.match(
    migrations,
    /delete from public\.collaboration_experience_rounds round_row\s*\n\s*where round_row\.created_by_user_id = old\.id/
  );
  assert.match(migrations, /before delete on auth\.users/);
});
