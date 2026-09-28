import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  REGISTRY_V21,
  getItemsV21,
  getItemV21,
  getSectionsV21,
  assertRegistryV21,
  type RegistryV21,
} from "@/features/instruments/v21/registryV21";

/**
 * Diese Tests halten die Registratur gegen ihre Quelle.
 *
 * Das Quelldokument `docs/CoFoundery_Align_v2_1_Items.json` ist die fachlich
 * geprüfte Fassung. Die Registratur ist daraus erzeugt - erzeugt heißt: ein
 * Skript hat einmal gelaufen, und danach kann jeder die Datei von Hand ändern,
 * ohne dass es auffällt. Genau das soll hier auffallen.
 *
 * Deshalb wird nicht gegen einen Schnappschuss geprüft (der ginge beim
 * Ändern einfach mit), sondern gegen das Dokument selbst.
 */

const sourcePath = join(process.cwd(), "..", "docs", "CoFoundery_Align_v2_1_Items.json");
const source = JSON.parse(readFileSync(sourcePath, "utf8")) as {
  version: string;
  item_count: number;
  overall_score: boolean;
  dimension_scores: boolean;
  items: {
    id: string; section: string; text: string; options?: string[];
    format: string; hint: string; missing: string; note: string;
    reverse_coding: boolean; scoring: string;
  }[];
};

test("jeder Fragetext steht wörtlich so im Quelldokument", () => {
  for (const item of getItemsV21()) {
    const origin = source.items.find((entry) => entry.id === item.itemId);
    assert.ok(origin, `${item.itemId} steht nicht in der Quelle`);
    assert.equal(
      item.prompt,
      origin.text,
      `${item.itemId}: der Fragetext weicht von der Quelle ab`,
    );
  }
});

test("die Registratur erfindet keine Items und lässt keines weg", () => {
  const inRegistry = getItemsV21().map((item) => item.itemId).sort();
  const inSource = source.items.map((item) => item.id).sort();
  assert.deepEqual(inRegistry, inSource);
  assert.equal(inRegistry.length, source.item_count);
});

test("jede Antwortoption steht wörtlich so in der Quelle", () => {
  for (const item of getItemsV21()) {
    const origin = source.items.find((entry) => entry.id === item.itemId)!;
    if (!origin.options) continue;
    assert.deepEqual(
      item.options.map((option) => option.label),
      origin.options,
      `${item.itemId}: die Optionen weichen ab`,
    );
  }
});

test("Abschnitt, Begründung und Scoring-Hinweis stammen aus der Quelle", () => {
  for (const item of getItemsV21()) {
    const origin = source.items.find((entry) => entry.id === item.itemId)!;
    assert.equal(item.section, origin.section, `${item.itemId}: Abschnitt`);
    assert.equal(item.note, origin.note, `${item.itemId}: Begründung`);
    assert.equal(item.scoring, origin.scoring, `${item.itemId}: Scoring-Hinweis`);
  }
});

test("kein Item ist umgepolt - die Quelle schließt Reverse Coding aus", () => {
  for (const origin of source.items) {
    assert.equal(origin.reverse_coding, false, `${origin.id}`);
  }
});

test("weder Gesamtwert noch Dimensionswerte, so wie die Quelle es sagt", () => {
  // Das ist keine Geschmacksfrage: Zwei Items unter einer Überschrift sind
  // keine Skala. Sobald hier irgendwo eine Zahl entsteht, behauptet sie
  // Messgenauigkeit, die das Instrument nicht hat.
  assert.equal(source.overall_score, false);
  assert.equal(source.dimension_scores, false);
  const asText = JSON.stringify(REGISTRY_V21);
  assert.ok(!/"weight"|"score"\s*:\s*\d|"points"/.test(asText),
    "in der Registratur steht ein Gewicht oder ein Punktwert");
});

test("die fünf ordinalen Stufen sind als ordinal gekennzeichnet, nicht als beliebige Wahl", () => {
  // Die fachliche Durchsicht unterscheidet ausdrücklich: A01/A02/U04, I01/I03,
  // X01/X06 und E01 sind geordnete Stufen; K01/K02/T03/D01/G01/G02a sind
  // Kategorien ohne Rangfolge. Wer das vermischt, rechnet später mit Abständen,
  // die es bei einer Handlungswahl nicht gibt.
  const ordinal = ["A01", "A02", "U04", "I01", "I03", "X01", "X06", "E01"];
  const nominal = ["K01", "K02", "T03", "D01", "G01", "G02a"];
  for (const id of ordinal) {
    assert.equal(getItemV21(id)?.answerFormat, "ordinal_choice", `${id} ist ordinal`);
  }
  for (const id of nominal) {
    assert.equal(getItemV21(id)?.answerFormat, "single_choice", `${id} ist nominal`);
  }
});

test("die zehn vorgestellten Fälle kommen in keinem Fragetext mehr vor", () => {
  // Der Fehler, den die Durchsicht gefunden hat: „bei wie vielen von zehn“
  // klingt nach Zählung, ist aber geraten - und die Stufen ließen drei oder
  // vier von zehn ohne Feld. Beides ist in v2.1 ersetzt.
  for (const item of getItemsV21()) {
    assert.ok(!/von zehn|zehn (vorgestellten|solcher)/i.test(item.prompt),
      `${item.itemId}: der Zehnerrahmen steht wieder im Text`);
    for (const option of item.options) {
      assert.ok(!/von zehn/i.test(option.label),
        `${item.itemId}: der Zehnerrahmen steht in einer Option`);
    }
  }
});

test("jedes Item bietet mindestens einen ehrlichen Ausweg", () => {
  // Wer eine Frage nicht beantworten kann, muss das sagen dürfen. Sonst
  // erzwingt der Fragebogen eine Antwort und misst danach eine Erfindung.
  for (const item of getItemsV21()) {
    assert.ok(item.missing.length >= 1, `${item.itemId}: kein Auslassungsgrund`);
    for (const entry of item.missing) {
      assert.ok(entry.label.length > 3, `${item.itemId}: Grund ohne Satz`);
    }
  }
});

test("derselbe Auslassungsgrund trägt je nach Frage einen anderen Satz", () => {
  // Das ist Absicht und muss es bleiben: „habe ich noch nicht entschieden“
  // (eigener Plan, G01), „kann ich noch nicht entscheiden“ (erfundener Fall)
  // und „dazu habe ich noch keine konkrete Angabe“ (eigene Grenze) sind
  // derselbe Code undecided und drei verschiedene Sätze. Eine Beschriftung je
  // Code hätte zwei davon falsch gemacht - deshalb hängt sie am Item.
  const labels = new Set(
    getItemsV21().flatMap((item) =>
      item.missing.filter((entry) => entry.code === "undecided").map((entry) => entry.label)),
  );
  assert.equal(labels.size, 3, `undecided hat ${labels.size} statt 3 Formulierungen`);
  assert.ok(labels.has("habe ich noch nicht entschieden"));
  assert.ok(labels.has("kann ich noch nicht entscheiden"));
  assert.ok(labels.has("dazu habe ich noch keine konkrete Angabe"));
});

test("die ausschließenden Optionen sind genau die zwei aus der Quelle", () => {
  const exclusive = getItemsV21().flatMap((item) =>
    item.options.filter((option) => option.exclusive).map((option) => item.itemId));
  assert.deepEqual(exclusive.sort(), ["B05", "G02b"]);
});

test("Wertefälle haben beide Anliegen und fünf Wichtigkeitsstufen", () => {
  const cases = getItemsV21().filter((item) => item.answerFormat === "value_case");
  assert.ok(cases.length >= 5, "die Wertefälle fehlen");
  for (const item of cases) {
    assert.equal(item.concerns?.length, 2, `${item.itemId}: zwei Anliegen`);
    assert.equal(item.ratingOptions?.length, 5, `${item.itemId}: fünf Stufen`);
  }
});

test("jede Abweichung von der Quelle ist begründet und namentlich verantwortet", () => {
  for (const deviation of REGISTRY_V21.deviationsFromSource) {
    assert.ok(deviation.reason.length > 20, "Abweichung ohne Begründung");
    assert.ok(deviation.decidedBy.length > 0, "Abweichung ohne Verantwortlichen");
    assert.ok(deviation.source.length > 0, "Abweichung ohne Quellenstelle");
  }
});

test("die Abschnitte decken alle Items ab und keiner ist leer", () => {
  const sections = getSectionsV21();
  assert.equal(sections.reduce((sum, s) => sum + s.items.length, 0), getItemsV21().length);
  for (const section of sections) {
    assert.ok(section.items.length > 0, `Abschnitt ohne Items: ${section.section}`);
  }
});

test("die Prüfung beim Laden schlägt an, wenn etwas fehlt", () => {
  // Ohne diesen Test wäre nicht belegt, dass assertRegistryV21 überhaupt etwas
  // tut - eine Prüffunktion, die nie auslöst, sieht aus wie eine, die schützt.
  const broken = JSON.parse(JSON.stringify(REGISTRY_V21)) as RegistryV21;
  broken.items[0].missing = [];
  assert.throws(() => assertRegistryV21(broken), /kein Auslassungsgrund/);

  const doppelt = JSON.parse(JSON.stringify(REGISTRY_V21)) as RegistryV21;
  doppelt.items[1].itemId = doppelt.items[0].itemId;
  assert.throws(() => assertRegistryV21(doppelt), /doppelte Kennung/);

  const zweiExklusiv = JSON.parse(JSON.stringify(REGISTRY_V21)) as RegistryV21;
  const b05 = zweiExklusiv.items.find((item) => item.itemId === "B05")!;
  b05.options[0].exclusive = true;
  b05.options[1].exclusive = true;
  assert.throws(() => assertRegistryV21(zweiExklusiv), /ausschliessende Option/);
});
