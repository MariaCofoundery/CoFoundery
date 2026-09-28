import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  getDiscoveryTopicsV21,
  compareCandidatesByTopics,
  type TopicVerdictV21,
} from "@/features/instruments/v21/discoveryTopicsV21";
import { getItemV21, getItemsV21, REGISTRY_V21 } from "@/features/instruments/v21/registryV21";

const topics = getDiscoveryTopicsV21();

test("jedes Thema besteht aus Fragen, die es gibt", () => {
  for (const topic of topics) {
    assert.ok(topic.itemIds.length > 0, topic.key);
    for (const itemId of topic.itemIds) {
      assert.ok(getItemV21(itemId), `${topic.key}: ${itemId} gibt es nicht`);
    }
  }
});

test("die Kennung eines Themas hängt nicht an seiner Überschrift", () => {
  // Der Text darf sich aendern, ohne dass gespeicherte Themenwahlen ins Leere
  // zeigen. Deshalb T01 und nicht ENTSCHEIDUNGEN_VORBEREITEN.
  for (const topic of topics) {
    assert.match(topic.key, /^T\d{2}$/, topic.label);
  }
});

test("keine Frage steckt in zwei Themen", () => {
  const seen = new Map<string, string>();
  for (const topic of topics) {
    for (const itemId of topic.itemIds) {
      const already = seen.get(itemId);
      assert.equal(already, undefined, `${itemId} steckt in ${already} und ${topic.key}`);
      seen.set(itemId, topic.key);
    }
  }
});

test("nur vergleichbare Fragen werden zu Themen", () => {
  // „Aehnliche Grenzen“ liesse sich aus zwei geschriebenen Saetzen nicht
  // feststellen, und es zu behaupten waere schlimmer, als das Thema
  // wegzulassen.
  const freitext = new Set([
    "structured_text", "free_text_repeatable", "free_text_per_entry",
    "time_windows", "person_number_range",
  ]);
  for (const topic of topics) {
    for (const itemId of topic.itemIds) {
      assert.ok(
        !freitext.has(getItemV21(itemId)!.answerFormat),
        `${topic.key}: ${itemId} ist nicht vergleichbar`,
      );
    }
  }
});

test("jedes Thema sagt, was „ähnlich“ bei ihm heißt", () => {
  for (const topic of topics) {
    assert.ok(topic.rule.trim().length > 10, `${topic.key}: ${topic.rule}`);
  }
});

test("die sechs Wertefälle sind EIN Thema, nicht sechs", () => {
  // Sechs Kaestchen mit fast demselben Namen - niemand kann sagen, welches
  // ihm wichtiger ist.
  const wertefaelle = getItemsV21()
    .filter((item) => item.answerFormat === "value_case")
    .map((item) => item.itemId);
  const topicsWithCases = topics.filter((topic) =>
    topic.itemIds.some((itemId) => wertefaelle.includes(itemId)));
  assert.equal(topicsWithCases.length, 1);
  assert.deepEqual(topicsWithCases[0].itemIds.sort(), wertefaelle.sort());
});

test("Code und Migration kennen dieselben Themen", () => {
  // Eine Doppelung laeuft auseinander, wenn sie niemand zusammenhaelt. Die
  // Urteilsfunktion laeuft in der Datenbank und kann den Code nicht lesen -
  // also liest dieser Test die Migration, statt ihren Inhalt zu behaupten.
  const dir = join("..", "supabase", "migrations");
  const sql = readdirSync(dir)
    .filter((name) => name.includes("discovery_topic_blocks_v2_1"))
    .map((name) => readFileSync(join(dir, name), "utf8"))
    .join("\n");

  assert.ok(sql.length > 0, "die Migration wurde nicht gefunden");

  const inMigration = [...sql.matchAll(/\('founder-alignment-v2-1', '(T\d{2})', '([A-Z]\d{2}[a-z]?)'\)/g)]
    .map((match) => `${match[1]}/${match[2]}`)
    .sort();
  const inCode = topics
    .flatMap((topic) => topic.itemIds.map((itemId) => `${topic.key}/${itemId}`))
    .sort();

  assert.ok(inMigration.length >= 25, `zu wenige Zeilen gelesen: ${inMigration.length}`);
  assert.deepEqual(inMigration, inCode);
});

test("die Themen decken die Abschnitte ab, die sich vergleichen lassen", () => {
  const abgedeckt = new Set(
    topics.flatMap((topic) => topic.itemIds.map((itemId) => getItemV21(itemId)!.section)),
  );
  // Nicht alle: Abschnitte mit nur Freitext fallen bewusst weg.
  assert.ok(abgedeckt.size >= 10, `nur ${abgedeckt.size} Abschnitte abgedeckt`);
  assert.ok(abgedeckt.size <= REGISTRY_V21.sections.length);
});

// ---------------------------------------------------------------------------
// Die Reihenfolge der Kandidaten
// ---------------------------------------------------------------------------

const verdict = (
  topicKey: string,
  matches: boolean | null,
): TopicVerdictV21 => ({ topicKey, rank: null, wish: "similar", matches, basis: 2, of: 2 });

test("dein wichtigstes Thema entscheidet zuerst", () => {
  const order = ["T01", "T05"];
  const passtBeimErsten = [verdict("T01", true), verdict("T05", false)];
  const passtBeimZweiten = [verdict("T01", false), verdict("T05", true)];
  assert.ok(compareCandidatesByTopics(passtBeimErsten, passtBeimZweiten, order) < 0);
});

test("kein Stapel kleiner Treffer wiegt das erste Thema auf", () => {
  // Genau das waere ein Passungswert: 3 von 4 sieht besser aus als 1 von 4,
  // auch wenn der eine Treffer der ist, auf den es ankommt.
  const order = ["T01", "T05", "T08", "T09"];
  const nurDasWichtigste = [
    verdict("T01", true), verdict("T05", false), verdict("T08", false), verdict("T09", false),
  ];
  const allesAusserDemWichtigsten = [
    verdict("T01", false), verdict("T05", true), verdict("T08", true), verdict("T09", true),
  ];
  assert.ok(compareCandidatesByTopics(nurDasWichtigste, allesAusserDemWichtigsten, order) < 0);
});

test("unbekannt steht zwischen „passt“ und „passt nicht“, nicht hinten", () => {
  // Wer zu wenig beantwortet hat, ist nicht schlechter, sondern unbekannt.
  const order = ["T01"];
  assert.ok(compareCandidatesByTopics([verdict("T01", true)], [verdict("T01", null)], order) < 0);
  assert.ok(compareCandidatesByTopics([verdict("T01", null)], [verdict("T01", false)], order) < 0);
});

test("es gibt keine Zahl über alle Themen", () => {
  const order = ["T01", "T05"];
  const ergebnis = compareCandidatesByTopics(
    [verdict("T01", true), verdict("T05", true)],
    [verdict("T01", true), verdict("T05", false)],
    order,
  );
  // Die Funktion gibt eine Ordnung zurueck, keine Punktzahl - -1/0/1, nie
  // eine Trefferzahl.
  assert.ok([-1, 0, 1].includes(Math.sign(ergebnis)));
  assert.ok(Math.abs(ergebnis) <= 2, "der Rueckgabewert sieht aus wie eine Punktzahl");
});
