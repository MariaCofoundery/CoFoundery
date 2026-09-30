import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getItemV22, getItemsV22, SCOPES } from "@/features/instruments/align/registries";

test("jede Zahlenfrage sagt, worin gezählt wird", () => {
  // GEMELDET AM 30.09.2026: Bei B04 stand „Stunden pro Woche" neben dem
  // Zahlenfeld - bei einer Frage nach einer finanziellen Reserve. Die Einheit
  // war im Eingabefeld fest verdrahtet, weil es sie zuerst nur fuer eine
  // Frage gab.
  for (const scope of SCOPES) {
    for (const item of getItemsV22(scope)) {
      if (item.answerFormat !== "number_range") continue;
      assert.ok(item.unit, `${item.itemId} sagt nicht, worin gezaehlt wird`);
    }
  }

  assert.equal(getItemV22("R01")!.unit, "Stunden pro Woche");
  // GEAENDERT AM 30.09.2026: "Monate" und nicht "Monate laufender Ausgaben".
  // WOVON die Monate handeln, steht jetzt in der Frage - eine Einheit ist die
  // Beschriftung eines Zahlenfeldes und kein Platz fuer eine Erklaerung.
  assert.equal(getItemV22("B04")!.unit, "Monate");
  assert.match(getItemV22("B04")!.prompt, /Wie viele Monate/);
  assert.match(getItemV22("B04")!.hint!, /finanzielle Reserve des Vorhabens/);
});

test("das Eingabefeld nimmt die Einheit vom Item", () => {
  const feld = readFileSync(
    join("src", "features", "instruments", "v21", "AnswerFieldV21.tsx"), "utf8");
  const block = feld.slice(feld.indexOf("function NumberRange()"));
  assert.match(block, /const unit = item\.unit/);
  assert.ok(
    !/const unit = "Stunden pro Woche"/.test(block),
    "die Einheit steht wieder fest im Feld",
  );

  // Und der freiwillige Zusatz steht nur, wo er hingehoert.
  assert.match(block, /item\.conditionHint &&/);
});

test("eine Frage mit Anschlussfragen sagt, dass welche folgen", () => {
  // „In der aktuellen gerenderten Fassung endet der Bereich nach L01." Das
  // stimmt und ist so gewollt - L02 fragt zu jeder einzelnen Grenze. Nur
  // weiss das niemand, der davorsitzt.
  const l02 = getItemV22("L02")!;
  const l03 = getItemV22("L03")!;
  assert.equal(l02.showAfter, "L01");
  assert.equal(l03.showAfter, "L01");

  const fragebogen = readFileSync(
    join("src", "features", "instruments", "align", "Questionnaire.tsx"), "utf8");
  assert.match(fragebogen, /wartendeAnschlussfragen/);
  assert.match(fragebogen, /Ohne Eintrag gibt es dazu nichts zu fragen/);
});

// ---------------------------------------------------------------------------
// Was beim Durchklicken am 30.09.2026 aufgefallen ist
// ---------------------------------------------------------------------------

test("bei erreichter Höchstzahl sind die übrigen aus, nicht rot", () => {
  // GEMELDET: „Bei ,welche ein oder zwei davon stehen weit oben' sollten die
  // anderen nicht mehr anklickbar sein, wenn 2 gewählt wurden. Steht zwar dann
  // als Fehler, aber das wäre eine bessere Erfahrung."
  const feld = readFileSync(
    join("src", "features", "instruments", "v21", "AnswerFieldV21.tsx"), "utf8");
  assert.match(feld, /disabled=\{disabled \|\| \(voll && !chosen\.includes\(option\.optionId\)\)\}/);

  // Was schon angehakt ist, bleibt anklickbar - sonst käme man aus der vollen
  // Auswahl nicht mehr heraus.
  assert.match(feld, /const voll =\s*\n?\s*item\.maxChoices !== null/);

  // Und die Grenze steht weiterhin auch in der Prüfung: Eine Grenze, die nur
  // die Oberfläche durchsetzt, ist keine.
  assert.equal(getItemV22("S01_top")!.maxChoices, 2);
});

test("beim Schrittwechsel geht es nach oben", () => {
  // GEMELDET: „Wenn man weiter klickt, sollte man immer im nächsten Bereich
  // oben landen." Der Knopf steht unten; ohne den Sprung beginnt der nächste
  // Schritt mitten in seinen Fragen.
  const fragebogen = readFileSync(
    join("src", "features", "instruments", "align", "Questionnaire.tsx"), "utf8");
  assert.match(fragebogen, /const zuSchritt = \(naechster: number\) => \{/);
  assert.match(fragebogen, /window\.scrollTo\(\{ top: 0, behavior: "auto" \}\)/);
  // Und kein Weg daran vorbei: `setStep` wird nur noch dort aufgerufen.
  assert.equal((fragebogen.match(/setStep\(/g) ?? []).length, 1);
});

test("beim Tippen wird später gespeichert - und beim Verlassen sofort", () => {
  // GEMELDET: „Bei ,Was sollte dieses Vorhaben erreichen' speichert es immer
  // nach einem Buchstaben, das ist etwas lästig."
  const fragebogen = readFileSync(
    join("src", "features", "instruments", "align", "Questionnaire.tsx"), "utf8");
  assert.match(fragebogen, /TIPPEN\.has\(answerable\[itemId\]\?\.answerFormat \?\? ""\) \? 2000 : 600/);
  assert.match(fragebogen, /onBlur=\{\(\) => jetztSpeichern\(item\.itemId\)\}/);

  // Beides gilt für beide Darstellungen - einzelne Karte und Block.
  assert.equal((fragebogen.match(/onBlur=\{\(\) => jetztSpeichern/g) ?? []).length, 2);

  // Und `structured_text` gehört dazu: Das war die Frage, bei der es auffiel.
  assert.equal(getItemV22("S04")!.answerFormat, "structured_text");
  assert.match(fragebogen, /"structured_text",/);
});
