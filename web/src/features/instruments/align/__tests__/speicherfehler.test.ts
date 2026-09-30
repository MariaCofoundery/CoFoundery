import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const aktionen = readFileSync(
  join("src", "features", "instruments", "align", "answerActions.ts"), "utf8");
const fragebogen = readFileSync(
  join("src", "features", "instruments", "align", "Questionnaire.tsx"), "utf8");

/**
 * GEMELDET AM 30.09.2026: Speichern geht nicht, „Erneut versuchen“ hilft
 * nicht. Die Ursache lag nicht im Code — die Migrationen waren in der
 * Produktionsdatenbank nie eingespielt.
 *
 * Geprüft wird deshalb nicht das Speichern selbst, sondern ob der Fall einen
 * Namen hat und ob der Knopf die Wahrheit sagt.
 */

test("eine Datenbank ohne die Fassung hat einen eigenen Fehlergrund", () => {
  // 22P02: unbekannter Wert in einer Aufzaehlung (module = 'founder_profile').
  // 23503: Fremdschluessel ins Leere (instrument_id gibt es nicht).
  // Beides heisst: Diese Datenbank kennt den Fragebogen nicht.
  assert.match(aktionen, /case "22P02":/);
  assert.match(aktionen, /case "23503":/);
  assert.match(aktionen, /return "setup_missing"/);

  // Und "konnte nicht gespeichert werden" ist nicht mehr die Antwort auf
  // alles.
  assert.match(aktionen, /case "42501":\s*\n\s*return "no_permission"/);
});

test("der Wiederholen-Knopf steht nur, wo Wiederholen helfen kann", () => {
  // Ein Knopf, der nie Erfolg haben kann, laesst jemanden zehnmal klicken und
  // dann glauben, er habe etwas falsch gemacht.
  assert.match(fragebogen, /kannWiederholen\(errors\[item\.itemId\]\) &&/);
  // GEAENDERT AM 30.09.2026. Vorher stand der Knopf bei allem ausser zwei
  // Faellen - auch bei einer Antwort, die die Pruefung ablehnt. Dort kann ein
  // zweiter Versuch nie Erfolg haben: dieselbe Antwort, dieselbe Ablehnung.
  // Jetzt nur noch bei der unterbrochenen Leitung.
  assert.match(fragebogen, /return reason === "unreachable";/);
});

test("jeder Grund hat einen Satz, der etwas sagt", () => {
  // Kein Grund darf im Sammelbecken landen und dort "Das konnte nicht
  // gespeichert werden" bekommen - das ist keine Auskunft, sondern ein
  // Achselzucken.
  for (const grund of ["setup_missing", "no_permission", "unreachable", "venture_ambiguous"]) {
    assert.ok(fragebogen.includes(`case "${grund}":`), grund);
  }
});
