import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  getDiscoveryTopics,
  compareCandidates,
  type TopicVerdict,
} from "@/features/instruments/align/discoveryTopics";
import { getItemV22, getItemsV22 } from "@/features/instruments/align/registries";

const topics = getDiscoveryTopics();

test("die Themen kommen aus dem Arbeitsprofil, nicht aus dem Vorhaben", () => {
  // Discovery zeigt Menschen, die man noch nicht kennt. Mit ihnen gibt es kein
  // gemeinsames Vorhaben - also auch keine gemeinsamen Zusagen.
  const profil = new Set(getItemsV22("founder_profile").map((item) => item.itemId));
  assert.ok(topics.length >= 4);
  for (const topic of topics) {
    for (const itemId of topic.itemIds) {
      assert.ok(profil.has(itemId), `${topic.key}: ${itemId} gehört nicht zum Arbeitsprofil`);
    }
  }
});

test("die Überschriften tragen kein Buchstabenkürzel mehr", () => {
  // Im Quelldokument heissen sie "A – Analytische Pruefung". Der Buchstabe ist
  // eine Ordnungshilfe fuer uns; auf dem Bildschirm waere er eine Abkuerzung,
  // die niemand aufloesen kann.
  for (const topic of topics) {
    assert.ok(!/^[A-Z]\/?[A-Z]?\s+–/.test(topic.label), `${topic.key}: „${topic.label}“`);
    assert.ok(topic.label.length > 5);
  }
});

test("die Kennung hängt nicht an der Überschrift", () => {
  // Der Text darf sich aendern, die gespeicherte Themenwahl soll es nicht.
  for (const topic of topics) {
    assert.match(topic.key, /^P\d{2}$/, topic.label);
  }
});

test("keine Frage steckt in zwei Themen", () => {
  const seen = new Map<string, string>();
  for (const topic of topics) {
    for (const itemId of topic.itemIds) {
      assert.equal(seen.get(itemId), undefined, `${itemId} steckt in zwei Themen`);
      seen.set(itemId, topic.key);
    }
  }
});

test("jedes Thema sagt, was „ähnlich“ bei ihm heißt", () => {
  for (const topic of topics) {
    assert.ok(topic.rule.trim().length > 10, `${topic.key}: ${topic.rule}`);
  }
});

test("Code und Migration kennen dieselben Themen", () => {
  // Die Urteilsfunktion laeuft in der Datenbank und kann den Code nicht lesen.
  // Eine Doppelung laeuft auseinander, wenn sie niemand zusammenhaelt.
  const dir = join("..", "supabase", "migrations");
  const sql = readdirSync(dir)
    .filter((name) => name.includes("discovery_profile_topics"))
    .map((name) => readFileSync(join(dir, name), "utf8"))
    .join("\n");
  assert.ok(sql.length > 0, "die Migration wurde nicht gefunden");

  const inMigration = [...sql.matchAll(/\('founder-profile-v1', '(P\d{2})', '([A-Z]\d{2})'\)/g)]
    .map((match) => `${match[1]}/${match[2]}`)
    .sort();
  const inCode = topics
    .flatMap((topic) => topic.itemIds.map((itemId) => `${topic.key}/${itemId}`))
    .sort();

  assert.ok(inMigration.length >= 12, `zu wenige Zeilen gelesen: ${inMigration.length}`);
  assert.deepEqual(inMigration, inCode);
});

test("nur vergleichbare Fragen werden zu Themen", () => {
  for (const topic of topics) {
    for (const itemId of topic.itemIds) {
      const format = getItemV22(itemId)!.answerFormat;
      assert.ok(
        ["ordinal_choice", "single_choice"].includes(format),
        `${topic.key}: ${itemId} ist ${format}`,
      );
    }
  }
});

// ---------------------------------------------------------------------------

const verdict = (topicKey: string, matches: boolean | null): TopicVerdict => ({
  topicKey, rank: null, wish: "similar", matches, basis: 2, of: 2,
});

test("dein wichtigstes Thema entscheidet zuerst", () => {
  const order = ["P01", "P02"];
  assert.ok(
    compareCandidates(
      [verdict("P01", true), verdict("P02", false)],
      [verdict("P01", false), verdict("P02", true)],
      order,
    ) < 0,
  );
});

test("kein Stapel kleiner Treffer wiegt das erste Thema auf", () => {
  // Genau das waere ein Passungswert: 3 von 4 sieht besser aus als 1 von 4,
  // auch wenn der eine Treffer der ist, auf den es ankommt.
  const order = ["P01", "P02", "P03", "P04"];
  const nurDasWichtigste = [
    verdict("P01", true), verdict("P02", false), verdict("P03", false), verdict("P04", false),
  ];
  const allesAndere = [
    verdict("P01", false), verdict("P02", true), verdict("P03", true), verdict("P04", true),
  ];
  assert.ok(compareCandidates(nurDasWichtigste, allesAndere, order) < 0);
});

test("unbekannt steht zwischen „passt“ und „passt nicht“", () => {
  const order = ["P01"];
  assert.ok(compareCandidates([verdict("P01", true)], [verdict("P01", null)], order) < 0);
  assert.ok(compareCandidates([verdict("P01", null)], [verdict("P01", false)], order) < 0);
});

test("es entsteht keine Zahl über alle Themen", () => {
  const ergebnis = compareCandidates(
    [verdict("P01", true), verdict("P02", true)],
    [verdict("P01", true), verdict("P02", false)],
    ["P01", "P02"],
  );
  assert.ok(Math.abs(ergebnis) <= 2, "der Rückgabewert sieht aus wie eine Punktzahl");
});
