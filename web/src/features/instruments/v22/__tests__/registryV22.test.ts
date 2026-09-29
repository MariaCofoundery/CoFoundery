import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  REGISTRY_V22,
  getItemsV22,
  getItemV22,
  getSectionsV22,
  assertRegistryV22,
  type RegistryV22,
} from "@/features/instruments/v22/registryV22";

/**
 * Die Registratur wird gegen ihre Quelle gehalten.
 *
 * Erzeugte Dateien kann man danach von Hand ändern, ohne dass es auffällt.
 * Deshalb wird nicht gegen einen Schnappschuss geprüft - der ginge beim Ändern
 * einfach mit -, sondern gegen die Master-Arbeitsfassung selbst.
 */

const quelle = readFileSync(
  join(process.cwd(), "..", "docs", "CoFoundery_ALIGN_Master_Arbeitsfassung_v0.2.md"),
  "utf8",
);
/** Zeilenumbrüche zusammenziehen: Im Dokument sind Sätze umbrochen. */
const flach = quelle.replace(/\s+/g, " ");

test("jeder Fragetext steht so im Quelldokument", () => {
  for (const item of getItemsV22()) {
    assert.ok(
      flach.includes(item.prompt),
      `${item.itemId}: der Fragetext steht nicht in der Quelle:\n${item.prompt}`,
    );
  }
});

test("jede Antwortmöglichkeit steht so in der Quelle - oder ist als Abweichung verzeichnet", () => {
  // Der Waechter hat beim Bauen meine eigene Umformulierung gefangen (R12,
  // „Datum“ → „an einem bestimmten Datum“). Genau so soll er arbeiten: Was
  // nicht in der Quelle steht, muss begruendet dastehen - nicht am Test
  // vorbei.
  const begruendet = JSON.stringify(REGISTRY_V22.deviationsFromSource);

  for (const item of getItemsV22()) {
    for (const option of item.options) {
      if (flach.includes(option.label)) continue;
      assert.ok(
        begruendet.includes(item.itemId),
        `${item.itemId}/${option.optionId}: „${option.label}“ steht weder in der Quelle ` +
          "noch in den dokumentierten Abweichungen",
      );
    }
  }
});

test("die Gegenprobe: eine unbegründete Umformulierung fällt auf", () => {
  // Ohne diesen Test koennte der Test oben alles durchlassen, sobald es
  // ueberhaupt eine Abweichung gibt.
  const erfunden = "eine Antwort, die so niemand geschrieben hat";
  assert.ok(!flach.includes(erfunden));
  assert.ok(!JSON.stringify(REGISTRY_V22.deviationsFromSource).includes(erfunden));
});

test("die Registratur erfindet keine Fragen", () => {
  const inQuelle = new Set(
    [...quelle.matchAll(/^\*\*([A-Z][0-9]{2})\*\*/gm)].map((match) => match[1]),
  );
  assert.ok(inQuelle.size >= 50, `zu wenige Items in der Quelle gefunden: ${inQuelle.size}`);
  for (const item of getItemsV22()) {
    assert.ok(inQuelle.has(item.itemId), `${item.itemId} steht nicht in der Quelle`);
  }
  assert.equal(getItemsV22().length, inQuelle.size, "es fehlen Fragen aus der Quelle");
});

test("weder Gesamtwert noch Dimensionswerte", () => {
  // Die Quelle sagt es selbst, Abschnitt 8.1: geordnete Kategorien duerfen
  // intern codiert, aber nicht als Messwerte ausgegeben werden.
  assert.equal(REGISTRY_V22.overallScore, false);
  assert.equal(REGISTRY_V22.dimensionScores, false);
  const asText = JSON.stringify(REGISTRY_V22);
  assert.ok(!/"weight"|"score"\s*:\s*\d|"points"|"mean"/.test(asText));
});

test("A und I stehen nebeneinander, nicht gegeneinander", () => {
  // "A und I niemals zu einem Analytisch-vs.-Intuitiv-Gesamtwert
  // verschmelzen" - Abschnitt 8.1 der Quelle. Beide koennen gleichzeitig hoch
  // sein; eine Achse dazwischen waere eine erfundene Gegensaetzlichkeit.
  const a = getItemsV22().filter((item) => item.itemId.startsWith("A"));
  const i = getItemsV22().filter((item) => item.itemId.startsWith("I"));
  assert.ok(a.length >= 2 && i.length >= 3);
  assert.notEqual(a[0].section, i[0].section, "A und I liegen im selben Abschnitt");
});

test("die fünf Stufen sind als ordinal gekennzeichnet, Handlungswahlen nicht", () => {
  // Die Quelle sagt es bei einigen selbst ("Nominal; keine Rangfolge"). Wer
  // beides gleich behandelt, hat die Information verloren, bevor die erste
  // Auswertung beginnt.
  for (const id of ["A01", "A02", "I01", "I02", "I03", "X01", "X04", "U01", "D02"]) {
    assert.equal(getItemV22(id)?.answerFormat, "ordinal_choice", `${id} ist ordinal`);
  }
  for (const id of ["K01", "K04", "D01", "G01", "T01"]) {
    assert.equal(getItemV22(id)?.answerFormat, "single_choice", `${id} ist nominal`);
  }
});

test("jede Frage lässt sich auslassen", () => {
  // Ohne Ausweg muss jemand eine Stufe ankreuzen, die er nicht meint. Daran
  // ist v1 gescheitert.
  for (const item of getItemsV22()) {
    assert.ok(item.missing.length >= 1, `${item.itemId}: kein Auslassungsgrund`);
    for (const entry of item.missing) {
      assert.ok(entry.label.length > 3, `${item.itemId}: Grund ohne Satz`);
    }
  }
});

test("kein Auslassungsgrund ist als Antwortmöglichkeit stehen geblieben", () => {
  // In der Quelle stehen "nicht angeben" und "noch nicht entschieden" in
  // derselben Zeile wie die Antworten. Als Wert gespeichert wuerden sie
  // mitgemittelt - genau so sind sie in v1 unsichtbar geworden.
  const verraeter = [
    "nicht angeben", "noch nicht entschieden", "noch offen",
    "noch nicht einschätzbar", "zunächst vertraulich klären",
  ];
  for (const item of getItemsV22()) {
    for (const option of item.options) {
      assert.ok(
        !verraeter.includes(option.label),
        `${item.itemId}: „${option.label}“ ist ein Auslassungsgrund und keine Antwort`,
      );
    }
  }
});

test("jede Abweichung von der Quelle ist begründet und verantwortet", () => {
  assert.ok(REGISTRY_V22.deviationsFromSource.length >= 1);
  for (const abweichung of REGISTRY_V22.deviationsFromSource) {
    assert.ok(abweichung.reason.length > 30, "Abweichung ohne Begründung");
    assert.ok(abweichung.decidedBy.length > 0, "Abweichung ohne Verantwortlichen");
  }
});

test("die Wertefälle haben beide Anliegen und beide Wege", () => {
  const faelle = getItemsV22().filter((item) => item.answerFormat === "value_case");
  assert.equal(faelle.length, 6);
  for (const fall of faelle) {
    assert.equal(fall.concerns?.length, 2, `${fall.itemId}: Anliegen`);
    assert.equal(fall.paths?.length, 2, `${fall.itemId}: Wege`);
    for (const text of [...(fall.concerns ?? []), ...(fall.paths ?? [])]) {
      assert.ok(text.length > 10, `${fall.itemId}: „${text}“`);
    }
  }
});

test("eine Anschlussfrage hängt an einer Frage, die es gibt", () => {
  const anschluss = getItemsV22().filter((item) => item.showAfter);
  assert.ok(anschluss.length >= 2, "keine Anschlussfragen gefunden");
  for (const item of anschluss) {
    assert.ok(getItemV22(item.showAfter!), `${item.itemId} → ${item.showAfter}`);
  }
});

test("die Abschnitte decken alle Fragen ab und keiner ist leer", () => {
  const sections = getSectionsV22();
  assert.equal(sections.reduce((sum, s) => sum + s.items.length, 0), getItemsV22().length);
  for (const section of sections) {
    assert.ok(section.items.length > 0, `Abschnitt ohne Fragen: ${section.section}`);
  }
});

test("die Prüfung beim Laden schlägt an, wenn etwas fehlt", () => {
  // Ohne diesen Test waere nicht belegt, dass assertRegistryV22 ueberhaupt
  // etwas tut - eine Pruefung, die nie ausloest, sieht aus wie eine, die
  // schuetzt.
  const ohneAusweg = JSON.parse(JSON.stringify(REGISTRY_V22)) as RegistryV22;
  ohneAusweg.items[0].missing = [];
  assert.throws(() => assertRegistryV22(ohneAusweg), /kein Auslassungsgrund/);

  const mitWert = JSON.parse(JSON.stringify(REGISTRY_V22)) as RegistryV22;
  (mitWert as unknown as { dimensionScores: boolean }).dimensionScores = true;
  assert.throws(() => assertRegistryV22(mitWert), /Dimensionswert/);

  const verwaist = JSON.parse(JSON.stringify(REGISTRY_V22)) as RegistryV22;
  verwaist.items[0].showAfter = "Z99";
  assert.throws(() => assertRegistryV22(verwaist), /das es nicht gibt/);
});
