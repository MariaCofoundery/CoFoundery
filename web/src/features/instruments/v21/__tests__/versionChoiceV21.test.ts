import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  versionFacts,
  CHOICE_CONSEQUENCES,
  VERSIONS,
  MIXED_COMPARISON_WARNING,
} from "@/features/instruments/v21/versionChoiceV21";
import { getItemsV21, REGISTRY_V21 } from "@/features/instruments/v21/registryV21";
import { CURRENT_INSTRUMENT_ID, ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";

/**
 * Die Zahlen im Vergleich der beiden Fassungen stimmen mit den Registraturen
 * überein.
 *
 * Ich hatte dort zuerst „39 in zwei Teilen“ für v1 stehen - eine Zahl aus der
 * Durchsicht der v2, nicht aus v1. Nachgezählt sind es 36, genau wie in v2.1.
 * „36 statt 39“ wäre ein Verkaufsargument gewesen, das nicht stimmt.
 */

const facts = versionFacts();
const fact = (aspect: string) => facts.find((entry) => entry.aspect === aspect)!;

test("die Zahl der Fragen stimmt mit beiden Registraturen überein", () => {
  const v1 = JSON.parse(
    readFileSync(join(process.cwd(), "docs", "founder-compatibility-item-registry-v1.json"), "utf8"),
  ) as { items: { isActive: boolean }[] };
  const activeV1 = v1.items.filter((item) => item.isActive).length;

  const werte = JSON.parse(
    readFileSync(join(process.cwd(), "..", "docs", "values-instrument-v1.json"), "utf8"),
  ) as { counts: { values_questions_found: number } };

  const zeile = fact("Fragen");
  assert.match(zeile.previous, new RegExp(`\\b${activeV1}\\b`), "die Zahl fuer v1 stimmt nicht");
  assert.match(
    zeile.previous,
    new RegExp(`\\b${werte.counts.values_questions_found}\\b`),
    "die Zahl der Wertefragen stimmt nicht",
  );
  assert.match(zeile.next, new RegExp(`\\b${getItemsV21().length}\\b`));
});

test("die Zahl der Bereiche kommt aus der Registratur", () => {
  assert.match(fact("Bereiche").next, new RegExp(`\\b${REGISTRY_V21.sections.length}\\b`));
});

test("keine Zeile verspricht eine Verbesserung", () => {
  // Der Vergleich soll Unterschiede benennen, nicht werben. „Besser“,
  // „genauer“ oder „präziser“ waeren Behauptungen ueber ein Instrument, das
  // ausdruecklich noch nicht validiert ist.
  const asText = JSON.stringify(facts).toLowerCase();
  for (const wort of ["besser", "genauer", "präziser", "praeziser", "verbessert", "optimiert"]) {
    assert.ok(!asText.includes(wort), `„${wort}“ steht im Vergleich`);
  }
});

test("bei beiden Wahlmöglichkeiten steht, dass nichts verloren geht", () => {
  // Die haeufigste stille Sorge ist, dass „neu machen“ das Alte ueberschreibt.
  for (const key of ["keep_previous", "retake"] as const) {
    const consequence = CHOICE_CONSEQUENCES[key];
    assert.ok(consequence.keeps.length > 0, key);
    assert.ok(consequence.costs.length > 0, `${key}: eine Wahl ohne Preis ist eine Werbung`);
    assert.ok(
      consequence.keeps.some((line) => /bleibt|bleiben|erhalten/.test(line)),
      `${key}: es steht nicht da, was bleibt`,
    );
  }
});

test("der unangenehme Satz ist vorhanden und benennt beide Richtungen", () => {
  assert.match(MIXED_COMPARISON_WARNING, /dieselbe Fassung/);
  assert.match(MIXED_COMPARISON_WARNING, /zwei verschiedene Fragebögen/);
  // Und er steht auch bei der Wahl „bleiben“ - nicht nur bei „wechseln“.
  assert.ok(
    CHOICE_CONSEQUENCES.keep_previous.costs.some((line) => /kein Vergleich/.test(line)),
    "wer bleibt, erfaehrt die Folge nicht",
  );
});

test("beide Fassungen stehen nebeneinander, und die neue ist als Test gekennzeichnet", () => {
  assert.deepEqual(
    VERSIONS.map((version) => version.id),
    [CURRENT_INSTRUMENT_ID, ALIGNMENT_V21_INSTRUMENT_ID],
  );
  const neu = VERSIONS[1];
  assert.match(neu.note, /Test/);
  // Und dass die Auswertung fehlt - das darf niemand erst hinterher merken.
  assert.match(neu.note, /Auswertung/);
});
