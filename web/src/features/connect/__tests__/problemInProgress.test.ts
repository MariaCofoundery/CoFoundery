import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { CONNECT_PROBLEM_STATUSES } from "@/features/connect/connectTypes";

const root = join(import.meta.dirname, "..", "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("'In Arbeit' ist ein eigener Zustand, mit demselben Wortlaut in Typ und Datenbank", () => {
  assert.ok((CONNECT_PROBLEM_STATUSES as readonly string[]).includes("in_progress"));
  const sql = read("../supabase/migrations/20270112120000_problem_in_progress.sql");
  assert.match(sql, /check \(status in \('draft', 'active', 'in_progress', 'withdrawn', 'resolved'\)\)/);
});

test("Die Migration aendert nur die Pruefung und den Wechsel, keine Sichtbarkeitsregel", () => {
  const sql = read("../supabase/migrations/20270112120000_problem_in_progress.sql");
  // Fremde sehen nur 'active'; dass 'in_progress' ausgeblendet ist, folgt aus den
  // bestehenden Regeln. Eine neue oder geaenderte Regel waere eine Aufweichung.
  assert.doesNotMatch(sql, /create policy|alter policy|drop policy/i);
  assert.match(sql, /p_action='in_progress' and p\.status='active'/);
  assert.match(sql, /p_action in \('withdrawn','resolved'\) and p\.status in \('active','in_progress'\)/);
});

test("Die Auswahl der Autorin fuehrt 'Wir arbeiten daran' vorn und hat den Weg zurueck", () => {
  const controls = read("src/features/connect/ProblemLifecycleControls.tsx");
  assert.match(controls, /\["in_progress", "withdrawn", "resolved", "delete"\]/);
  assert.match(controls, /\["active", "resolved", "withdrawn", "delete"\]/);
  const action = read("src/features/connect/connectProblemActions.ts");
  assert.match(action, /next !== "in_progress"/);
  // Der Weg zurueck hat einen eigenen Namen und eigene Folgen.
  assert.match(controls, /action === "active" && problem\.status === "in_progress" \? "back_on_board"/);
});

test("Alle Texte zum Zustand gibt es in beiden Sprachen", () => {
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(read(`messages/${locale}/connect.json`));
    assert.ok(messages.lifecycle.problem.in_progress, `${locale}: Knopf`);
    assert.ok(messages.lifecycle.problemConsequences.in_progress, `${locale}: Folgen`);
    assert.ok(messages.problems.statuses.in_progress, `${locale}: Statuszeile`);
    assert.ok(messages.problems.shortStatuses.in_progress, `${locale}: Kurzform`);
    assert.ok(messages.lifecycle.problem.back_on_board, `${locale}: Weg zurueck`);
    assert.ok(messages.lifecycle.problemConsequences.back_on_board, `${locale}: Folgen des Wegs zurueck`);
  }
});

test("Die Folgen sagen, was bleibt und was nicht", () => {
  const de = JSON.parse(read("messages/de/connect.json")).lifecycle.problemConsequences.in_progress as string;
  assert.match(de, /nicht mehr auf dem Brett/);
  assert.match(de, /keine neuen Meldungen/);
  assert.match(de, /Gespräch|Arbeitsraum/);
  assert.match(de, /wieder aufs Brett/);
});
