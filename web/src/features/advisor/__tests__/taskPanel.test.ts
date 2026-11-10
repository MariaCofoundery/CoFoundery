import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("Aufgaben-Panel: Aufgabe oeffnet neben der Liste, Stand und Haken speichern sofort ueber gebundene Funktionen", () => {
  const board = read("src/features/advisor/Teamraum.tsx");
  assert.match(board, /async function TaskPanel/);
  assert.doesNotMatch(board, /async function TaskDetail/);
  assert.match(board, /<SidePanel\s+variant="column"/);
  // Ein Knopf mit Serverfunktion als formAction schickt seinen eigenen Namen/Wert nicht mit: der Handgriff wird gebunden.
  assert.match(board, /formAction=\{saveOrgTaskWithAction\.bind\(null, \{ status \}\)\}/);
  assert.match(board, /saveOrgTaskWithAction\.bind\(null, \{ toggle: index \}\)/);
  assert.match(board, /saveOrgTaskWithAction\.bind\(null, \{ remove: index \}\)/);
  assert.doesNotMatch(board, /formAction=\{[A-Za-z.()\s,{}:]+\}[^>]*\bname="(status|toggleItem|removeItem)"/);
  // Im Formular steht der aktuelle Stand, damit ein Haken ihn nicht auf "offen" zuruecksetzt.
  assert.match(board, /<input type="hidden" name="status" value=\{task\.status\} \/>/);
  // Kommentare und Loeschen sind eigene Formulare ausserhalb des Hauptformulars.
  assert.match(board, /form=\{formId\}/);
});

test("Kein Knopf mit formAction und eigenem name/value (React ueberschreibt den Namen)", () => {
  for (const file of ["src/features/advisor/Teamraum.tsx", "src/features/advisor/calendar/PostSheet.tsx"]) {
    for (const line of read(file).split("\n")) {
      if (/<button[^>]*formAction=\{/.test(line)) assert.doesNotMatch(line, /\bname="/, `${file}: ${line.trim().slice(0, 80)}`);
    }
  }
});

test("Checkliste im Panel: Haken, Entfernen und neuer Punkt aus den Formularfeldern; das alte Formular schickt weiter einen Text", () => {
  const actions = read("src/features/advisor/teamraumActions.ts");
  assert.match(actions, /function checklistOf/);
  assert.match(actions, /formData\.get\("checkPanel"\) !== "1"\) return parseChecklist/);
  assert.match(actions, /back_view/);
});
