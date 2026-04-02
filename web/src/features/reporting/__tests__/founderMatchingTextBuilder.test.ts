import assert from "node:assert/strict";
import test from "node:test";
import { compareFounders } from "@/features/reporting/founderMatchingEngine";
import {
  detectMatchingInteractionPatterns,
  getPrimaryMatchingInteractionPattern,
} from "@/features/reporting/founderMatchingTextBlocks";
import {
  buildFounderMatchingAgreements,
  buildFounderMatchingDailyDynamics,
  buildFounderMatchingFullText,
  buildFounderMatchingHero,
  buildFounderMatchingIntroBlocks,
  buildFounderMatchingTextExamples,
  buildStableBaseBlock,
} from "@/features/reporting/founderMatchingTextBuilder";
import {
  buildFounderMatchingSelection,
  runFounderMatchingSelectionExamples,
} from "@/features/reporting/founderMatchingSelection";

test("founder matching hero is deterministic for complementary builders", () => {
  const selection = runFounderMatchingSelectionExamples().complementary_builders;
  const hero = buildFounderMatchingHero(selection);

  assert.match(hero, /Chance in einem Unterschied|Von selbst traegt er nicht/i);
  assert.match(hero, /zwischen zwei Wegen entscheiden muesst|zwischen zwei Wegen entscheiden müsst/i);
  assert.match(hero, /Commitment nicht jedes Mal neu aufgerollt werden muss/);
  assert.match(hero, /wann etwas angesprochen wird|eng ihr dazu im Austausch bleiben wollt/i);
  assert.match(hero, /traegt er nicht von selbst|nicht von selbst/i);
});

test("founder matching intro blocks are direct and tension-led for misaligned pairs", () => {
  const selection = runFounderMatchingSelectionExamples().misaligned_pressure_pair;
  const blocks = buildFounderMatchingIntroBlocks(selection);

  assert.match(blocks.hero, /beginnt Reibung nicht spaet|beginnt Reibung nicht spät/i);
  assert.match(blocks.hero, /verschiedene Ziele|Richtungsfrage|Prioritaeten setzt/i);
  assert.match(blocks.hero, /Unterschied in Entscheidungslogik nicht sofort wie Widerspruch/);
  assert.match(blocks.hero, /Einsatz und Arbeitsweise|getrennt besprechen/i);
  assert.equal(blocks.stableBase.title, "Keine klare Basislinie");
  assert.equal(blocks.strongestComplement.title, "Prüfung trifft Zuspitzung");
  assert.equal(blocks.biggestTension.title, "Wenn Richtung strittig wird");
});

test("founder matching builder handles high-similarity blind spot pairs", () => {
  const selection = runFounderMatchingSelectionExamples().highly_similar_but_blind_spot_pair;
  const blocks = buildFounderMatchingIntroBlocks(selection);

  assert.match(blocks.hero, /anfangs vieles erstaunlich glatt/);
  assert.equal(blocks.strongestComplement.title, "Keine klare Ergänzungsachse");
  assert.equal(blocks.biggestTension.title, "Was ihr leicht überseht");
});

test("strongest complement text becomes context-sensitive across duo types", () => {
  const examples = runFounderMatchingSelectionExamples();
  const complementary = buildFounderMatchingIntroBlocks(examples.complementary_builders);
  const misaligned = buildFounderMatchingIntroBlocks(examples.misaligned_pressure_pair);

  assert.notEqual(
    complementary.strongestComplement.body,
    misaligned.strongestComplement.body
  );
  assert.match(complementary.strongestComplement.body, /breiter machen|früher klärt/);
  assert.match(misaligned.strongestComplement.body, /wenig still trägt|nicht automatisch zur Stärke/);
});

test("daily dynamics simulates interaction instead of restating dimensions", () => {
  const selection = runFounderMatchingSelectionExamples().complementary_builders;
  const text = buildFounderMatchingDailyDynamics(selection);

  assert.match(text, /Wenn Arbeit nicht nur weiterlaufen, sondern für beide sichtbar bleiben soll/);
  assert.match(
    text,
    /frueher sehen|früher sehen|mehr Mitsicht|nicht denselben Takt/
  );
  assert.match(text, /Dann muss klar sein|muesst ihr trennen/i);
});

test("agreement builder returns direct rule sentences", () => {
  const selection = runFounderMatchingSelectionExamples().misaligned_pressure_pair;
  const agreements = buildFounderMatchingAgreements(selection);

  assert.equal(agreements.length >= 3, true);
  assert.match(agreements[0] ?? "", /Ihr braucht|Ihr solltet|Es sollte eindeutig sein/);
  assert.match(agreements.join(" "), /Einsatzniveau|Zwischenstände|Spannung|priorisiert/);
});

test("full text builder exposes daily dynamics and agreements", () => {
  const selection = runFounderMatchingSelectionExamples().balanced_but_manageable_pair;
  const full = buildFounderMatchingFullText(selection);

  assert.match(full.dailyDynamics, /Alltag/);
  assert.equal(full.agreements.length >= 3, true);
});

test("stable base block returns fallback when no stable base exists", () => {
  const block = buildStableBaseBlock(null);
  assert.equal(block.title, "Keine klare Basislinie");
});

test("founder matching text examples expose all four demo cases", () => {
  const examples = buildFounderMatchingTextExamples();

  assert.deepEqual(Object.keys(examples), [
    "complementary_builders",
    "misaligned_pressure_pair",
    "balanced_but_manageable_pair",
    "highly_similar_but_blind_spot_pair",
  ]);
});

test("interaction pattern detection makes commitment x workmode explicit", () => {
  const selection = buildFounderMatchingSelection(
    compareFounders(
      {
        Unternehmenslogik: 58,
        Entscheidungslogik: 28,
        Risikoorientierung: 61,
        "Arbeitsstruktur & Zusammenarbeit": 78,
        Commitment: 88,
        Konfliktstil: 44,
      },
      {
        Unternehmenslogik: 55,
        Entscheidungslogik: 66,
        Risikoorientierung: 45,
        "Arbeitsstruktur & Zusammenarbeit": 34,
        Commitment: 42,
        Konfliktstil: 57,
      }
    )
  );

  const patterns = detectMatchingInteractionPatterns(selection);
  assert.equal(patterns[0]?.id, "commitment_workmode_pressure");

  const daily = buildFounderMatchingDailyDynamics(selection);
  assert.match(daily, /Verfügbarkeit|Mitsicht|Loop/);
});

test("interaction pattern detection makes risk x direction explicit", () => {
  const selection = buildFounderMatchingSelection(
    compareFounders(
      {
        Unternehmenslogik: 84,
        Entscheidungslogik: 49,
        Risikoorientierung: 79,
        "Arbeitsstruktur & Zusammenarbeit": 53,
        Commitment: 68,
        Konfliktstil: 47,
      },
      {
        Unternehmenslogik: 31,
        Entscheidungslogik: 58,
        Risikoorientierung: 38,
        "Arbeitsstruktur & Zusammenarbeit": 51,
        Commitment: 66,
        Konfliktstil: 52,
      }
    )
  );

  const pattern = getPrimaryMatchingInteractionPattern(selection);
  assert.equal(pattern?.id, "risk_direction_tradeoff");

  const hero = buildFounderMatchingHero(selection);
  assert.match(hero, /Wagnis|Richtung|einzahlen soll/);
});

test("high similarity with one clear fault line stays cautious instead of blind-spot heavy", () => {
  const selection = buildFounderMatchingSelection(
    compareFounders(
      {
        Unternehmenslogik: 73,
        Entscheidungslogik: 65,
        Risikoorientierung: 70,
        "Arbeitsstruktur & Zusammenarbeit": 68,
        Commitment: 79,
        Konfliktstil: 24,
      },
      {
        Unternehmenslogik: 77,
        Entscheidungslogik: 61,
        Risikoorientierung: 66,
        "Arbeitsstruktur & Zusammenarbeit": 72,
        Commitment: 82,
        Konfliktstil: 79,
      }
    )
  );

  const patterns = detectMatchingInteractionPatterns(selection).map((entry) => entry.id);
  assert.equal(patterns.includes("blind_spot_similarity_drift"), false);
  assert.equal(patterns.includes("alignment_edge_guard"), true);
});

test("good alignment with hidden daily risk gets edge-guard pattern", () => {
  const selection = buildFounderMatchingSelection(
    compareFounders(
      {
        Unternehmenslogik: 61,
        Entscheidungslogik: 54,
        Risikoorientierung: 58,
        "Arbeitsstruktur & Zusammenarbeit": 44,
        Commitment: 67,
        Konfliktstil: 41,
      },
      {
        Unternehmenslogik: 65,
        Entscheidungslogik: 57,
        Risikoorientierung: 55,
        "Arbeitsstruktur & Zusammenarbeit": 61,
        Commitment: 72,
        Konfliktstil: 60,
      }
    )
  );

  assert.equal(selection.heroSelection.mode, "alignment_led");
  assert.equal(getPrimaryMatchingInteractionPattern(selection)?.id, "alignment_edge_guard");

  const daily = buildFounderMatchingDailyDynamics(selection);
  assert.match(daily, /stabil|spät/);
});
