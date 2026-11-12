import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const shell = readFileSync(
  join("src", "features", "navigation", "ProductShell.tsx"), "utf8");

test("die zweite Reihe unter Align liest sich als Weg", () => {
  // Erst das eigene Bild, dann der Test, dann die anderen, dann das
  // Nachlesen. Vorher stand "Verbindungen" vorn - man faengt aber bei sich
  // selbst an.
  const reihenfolge = [...shell.matchAll(/label: t\("(align[A-Za-z]+)"\)/g)].map((m) => m[1]);
  // Seit 12.11.2026 (Entwurf Align): Uebersicht -> Ich -> Wir -> Unser Vorhaben. Das Programm ist kein
  // eigener Reiter mehr, sondern liegt im Raum "Wir" (die Uebersicht verlinkt es dort). "alignTeam" steht nur
  // noch im Rueckfall fuer Menschen ohne Founder-Rolle.
  assert.deepEqual(reihenfolge, ["alignOverview", "alignMe", "alignWe", "alignVenture", "alignTeam"]);
  assert.doesNotMatch(shell, /t\("alignProgram"\)/);
});

test("Verbindungen steht auch ohne Founder-Rolle da", () => {
  // Wer nur Advisor oder Connect ist, hat kein Gesamtbild und keinen Test -
  // aber Verbindungen. Stuende es im selben hasFounder-Block, waere die
  // zweite Reihe fuer diese Menschen leer.
  const zweiteReihe = shell.slice(
    shell.indexOf("DREI RAEUME, EIN WEG"),
    shell.indexOf("const findItem"),
  );
  const founderZweig = zweiteReihe.indexOf("subItems: hasFounder");
  const rueckfall = zweiteReihe.indexOf(": [", zweiteReihe.indexOf('label: t("alignVenture")'));
  const verbindungen = zweiteReihe.indexOf('label: t("alignTeam")');

  assert.ok(founderZweig > 0, "die drei Raeume haengen nicht an der Founder-Rolle");
  assert.ok(verbindungen > rueckfall && rueckfall > 0, "Verbindungen steht im Founder-Zweig statt im Rueckfall");
  assert.match(zweiteReihe.slice(rueckfall), /href: "\/connections"/);
});

test("die neue Fassung bleibt unter Fragebögen aktiv, egal auf welcher ihrer Seiten man steht", () => {
  // Ein Reiter, der sich beim Anklicken aufloest, war hier schon einmal das Problem. Seit 19.10.2026 liegen
  // die Fragebogen-Seiten unter „Fragebögen“ (Align) - die Ergebnisse unter „Profil".
  const bereich = shell.slice(shell.indexOf("const isQuestionnairesArea"), shell.indexOf("const isTeamsArea"));
  assert.match(bereich, /startsWith\("\/research\/workstyle-pretest"\)/);
  assert.match(bereich, /currentPathname === "\/fragebogen"/);
});

test("historical workbook is not labeled as the current workstyle", () => {
  const bereich = shell.slice(shell.indexOf("const isQuestionnairesArea"), shell.indexOf("const isTeamsArea"));
  assert.doesNotMatch(bereich, /workbook/);
});

test("„So willst du gründen“ steht unter Fragebögen, nicht unter Team", () => {
  const bereich = shell.slice(shell.indexOf("const isQuestionnairesArea"), shell.indexOf("const isTeamsArea"));
  assert.match(bereich, /currentPathname\.startsWith\("\/founder-alignment\/vorhaben"\)/);
  // Der Vergleich bleibt Teamkontext.
  assert.match(shell, /\(currentPathname\.startsWith\("\/founder-alignment"\) && !isQuestionnairesArea\(currentPathname\)\)/);
});
