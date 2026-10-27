import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  TEST_PROJECT_LIMITS,
  activeTestProjectItems,
  hasAgreedToCurrentDraft,
  isTestProjectDraftComplete,
  isTestProjectPhaseComplete,
  normalizeTestProjectItems,
  sanitizeTestProjectItems,
  testProjectDaysLeft,
  testProjectHref,
} from "@/features/testProject/testProjectModel";
import {
  TEST_PROJECT_CLOSING_QUESTIONS,
  TEST_PROJECT_INTERIM_QUESTIONS,
  TEST_PROJECT_RIGHTS_QUESTIONS,
  TEST_PROJECT_TEMPLATES,
} from "@/features/testProject/testProjectTemplates";

const source = (path: string) => readFileSync(path, "utf8");
const copy = (locale: string) =>
  JSON.parse(source(`messages/${locale}/teams.json`)).testProject as Record<string, unknown>;
const flatten = (value: unknown, prefix = ""): string[] =>
  value && typeof value === "object"
    ? Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) => flatten(inner, `${prefix}${key}.`))
    : [prefix];

test("Listen aus der Datenbank: Unerwartetes faellt weg, Texte werden gekuerzt", () => {
  assert.deepEqual(normalizeTestProjectItems(null), []);
  assert.deepEqual(normalizeTestProjectItems([{ t: "a", on: true }, { t: 3, on: true }, { t: "b" }, "x"]), [{ t: "a", on: true }]);
  const long = normalizeTestProjectItems([{ t: "x".repeat(500), on: false }]);
  assert.equal(long[0].t.length, TEST_PROJECT_LIMITS.itemText);
  assert.equal(normalizeTestProjectItems(Array.from({ length: 40 }, () => ({ t: "a", on: true }))).length, TEST_PROJECT_LIMITS.items);
});

test("Formulareingabe: leere Punkte fallen weg, Schalter bleibt", () => {
  assert.deepEqual(
    sanitizeTestProjectItems([{ t: "  Eins ", on: true }, { t: "   ", on: true }, { t: "Zwei", on: false }]),
    [{ t: "Eins", on: true }, { t: "Zwei", on: false }]
  );
});

test("ein Entwurf ist vollstaendig mit Name, Aufgabe und einem AKTIVEN Fertig-Punkt", () => {
  const base = { title: "T", task: "A", doneItems: [{ t: "fertig", on: true }] };
  assert.equal(isTestProjectDraftComplete(base), true);
  assert.equal(isTestProjectDraftComplete({ ...base, title: " " }), false);
  assert.equal(isTestProjectDraftComplete({ ...base, task: "" }), false);
  // Ein ausgeschalteter Punkt zaehlt nicht: die Plattform legt nicht fest, was fertig ist.
  assert.equal(isTestProjectDraftComplete({ ...base, doneItems: [{ t: "fertig", on: false }] }), false);
  assert.deepEqual(activeTestProjectItems([{ t: "a", on: false }, { t: "b", on: true }, { t: " ", on: true }]), [{ t: "b", on: true }]);
});

test("zugestimmt hat nur, wer dem AKTUELLEN Stand zugestimmt hat", () => {
  const agreements = [{ userId: "a", draftVersion: 1 }, { userId: "b", draftVersion: 2 }];
  assert.equal(hasAgreedToCurrentDraft({ draftVersion: 2 }, agreements, "b"), true);
  assert.equal(hasAgreedToCurrentDraft({ draftVersion: 2 }, agreements, "a"), false);
  assert.equal(hasAgreedToCurrentDraft({ draftVersion: 2 }, agreements, "c"), false);
});

test("eine Phase ist erst vollstaendig, wenn alle des Paares abgegeben haben", () => {
  const responses = [{ userId: "a", phase: "closing" as const, answers: [], outcome: null }];
  assert.equal(isTestProjectPhaseComplete(responses, "closing", ["a", "b"]), false);
  assert.equal(isTestProjectPhaseComplete([...responses, { userId: "b", phase: "closing", answers: [], outcome: null }], "closing", ["a", "b"]), true);
  assert.equal(isTestProjectPhaseComplete(responses, "interim", ["a"]), false);
});

test("verbleibende Tage: aufgerundet, nie negativ", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  assert.equal(testProjectDaysLeft(null, now), null);
  assert.equal(testProjectDaysLeft("2026-11-03T11:00:00Z", now), 2);
  assert.equal(testProjectDaysLeft("2026-10-30T12:00:00Z", now), 0);
});

test("Link zum Testprojekt eines Paares", () => {
  assert.equal(testProjectHref("t 1", "r1"), "/teams/t%201/test-project/r1");
  assert.equal(testProjectHref("t", "r", "saved"), "/teams/t/test-project/r?result=saved");
});

test("Vorlagen: sechs, je mit Fertig-Punkten, hoechstens vier Wochen, beide Sprachen", () => {
  assert.equal(TEST_PROJECT_TEMPLATES.length, 6);
  for (const template of TEST_PROJECT_TEMPLATES) {
    assert.ok(template.weeks >= 1 && template.weeks <= TEST_PROJECT_LIMITS.weeksMax, template.key);
    assert.ok(template.done.length > 0, template.key);
    for (const text of [template.title, template.task, template.roles, ...template.done]) {
      assert.ok(text.de.trim() && text.en.trim(), `${template.key}: Text fehlt`);
      assert.ok(text.de.length <= TEST_PROJECT_LIMITS.task, template.key);
    }
  }
  for (const list of [TEST_PROJECT_RIGHTS_QUESTIONS, TEST_PROJECT_CLOSING_QUESTIONS, TEST_PROJECT_INTERIM_QUESTIONS]) {
    for (const q of list) assert.ok(q.de.trim() && q.en.trim());
  }
});

test("die Vorlagen sind Vorschlaege, keine Rechtsklauseln und keine Bewertung", () => {
  const all = JSON.stringify([TEST_PROJECT_TEMPLATES, TEST_PROJECT_RIGHTS_QUESTIONS, TEST_PROJECT_CLOSING_QUESTIONS]);
  assert.doesNotMatch(all, /Punkte|Score|Bewertung|passt nicht|compatible|incompatible/i);
  // Rechte-Fragen sind Fragen.
  for (const q of TEST_PROJECT_RIGHTS_QUESTIONS) assert.match(q.de, /\?/);
});

test("DE und EN haben dieselben Texte, und der Hinweis 'keine Rechtsberatung' steht in beiden", () => {
  assert.deepEqual(flatten(copy("de")).sort(), flatten(copy("en")).sort());
  assert.match(String(copy("de").disclaimer), /Keine Rechtsberatung/);
  assert.match(String(copy("en").disclaimer), /Not legal advice/);
});

test("die Seite zeigt den Hinweis, keine Punkte und keine Gesamtbewertung", () => {
  const page = source("src/app/(product)/teams/[teamId]/test-project/[relationshipId]/page.tsx");
  assert.match(page, /t\("disclaimer"\)/);
  assert.doesNotMatch(page, /score|percent|ranking|compatib/i);
  // Die Antworten der anderen Person kommen aus der Datenbank erst nach Abgabe beider; die Seite
  // verlaesst sich darauf, filtert aber zusaetzlich auf "beide da" (ResultsBlock).
  assert.match(page, /isTestProjectPhaseComplete\(responses, phase/);
});

test("die Migration: beide stimmen zu, Version, Antworten erst nach beiden, kein Direktschreiben", () => {
  const sql = source("../supabase/migrations/20270102120000_relationship_test_projects.sql");
  assert.match(sql, /p_version is distinct from v_project\.draft_version/);
  assert.match(sql, /test_project_phase_complete\(project_id, phase\)/);
  assert.match(sql, /revoke all on public\.relationship_test_project_responses from public, anon, authenticated/);
  assert.doesNotMatch(sql, /grant (insert|update|delete)[^;]*to authenticated/i);
});

test("Export und Team-Seite kennen das Testprojekt", () => {
  assert.match(source("src/features/account/accountExport.ts"), /relationship_test_project_responses/);
  assert.match(source("src/app/(product)/teams/[teamId]/page.tsx"), /testProjectHref\(teamId, entry\.relationshipId\)/);
});
