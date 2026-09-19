import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const COMPONENT = "src/features/questionnaire/ForcedChoiceQuestion.tsx";
const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

test("die Antwortskala zerfällt auf dem Telefon nicht", () => {
  // GEFUNDEN AM 20.09.2026 bei der Handy-Durchsicht, und das ist die
  // Kernfläche des Produkts - hier beantworten Menschen die Fragen.
  //
  // Rechnung für 360 Pixel Breite: 320 nach dem Innenabstand, minus vier
  // Lücken, geteilt durch fünf sind 57 Pixel je Knopf; davon gehen 32 für px-4
  // ab. Bleiben 25 Pixel für "beide gleich" - zwölf Zeichen.
  const code = codeOnly(COMPONENT);
  assert.doesNotMatch(
    code,
    /className="grid grid-cols-5/,
    "fünf Spalten ohne Umbruchpunkt - auf dem Telefon zerfällt die Beschriftung"
  );
  assert.match(code, /grid-cols-1 gap-2 sm:grid-cols-5/);
  // Und die Knöpfe sind mit dem Daumen zu treffen.
  assert.match(code, /min-h-11 rounded-lg border px-4 py-3/);
});

test("beim Stapeln bleibt erkennbar, welche Aussage A und welche B ist", () => {
  // DAS WÄRE DER FEHLER IM FEHLER GEWESEN: Welche Aussage A und welche B ist,
  // stand allein in der POSITION - links und rechts. Übereinander ist diese
  // Angabe weg, und die Knöpfe darüber heißen "A deutlich" und "B deutlich".
  // Ein Umbruch ohne Kennung hätte die Frage unbeantwortbar gemacht.
  const code = codeOnly(COMPONENT);
  assert.match(code, /grid-cols-1 gap-4 border-t[^"]*sm:grid-cols-2/);
  assert.match(code, /scale\.statementA/);
  assert.match(code, /scale\.statementB/);
  // Nur auf dem Telefon: Ab sm trägt die Position die Zuordnung, und eine
  // funktionierende Ansicht wird nicht umgebaut.
  assert.match(code, /sm:hidden/);

  for (const locale of ["de", "en"]) {
    const scale = (
      JSON.parse(readFileSync(`messages/${locale}/assessment.json`, "utf8")) as {
        forcedChoice: { scale: Record<string, string> };
      }
    ).forcedChoice.scale;
    assert.ok(scale.statementA, `${locale}: die Kennung für A fehlt`);
    assert.ok(scale.statementB, `${locale}: die Kennung für B fehlt`);
    assert.notEqual(scale.statementA, scale.statementB);
  }
});

test("die Reihenfolge der Frage ist unangetastet", () => {
  // Skala vor Aussagen ist eine Entscheidung des Fragebogens, nicht ein
  // Layoutfehler - und in welcher Folge jemand liest, kann Antworten
  // beeinflussen. Ein Umbruch darf daran nichts ändern.
  const code = codeOnly(COMPONENT);
  const scaleAt = code.indexOf("sm:grid-cols-5");
  const statementsAt = code.indexOf("sm:grid-cols-2");
  assert.ok(scaleAt > 0 && statementsAt > 0);
  assert.ok(scaleAt < statementsAt, "die Aussagen stehen jetzt vor der Skala");
});
