import test from "node:test";
import assert from "node:assert/strict";

import { offeredItemsV22, SCOPES } from "@/features/instruments/align/registries";

/**
 * Sprachreview v0.1, Grundregeln: `du/dein` wird kleingeschrieben.
 *
 * ---------------------------------------------------------------------------
 * GEMEINT IST DIE HÖFLICHKEITSFORM, NICHT DER SATZANFANG
 * ---------------------------------------------------------------------------
 *
 * „Du musst zwischen mehreren Möglichkeiten entscheiden" ist richtig — am
 * Satzanfang wird jedes Wort groß geschrieben. Falsch wäre „Wie häufig
 * vergleichst Du", und genau danach wird hier gesucht: die Anrede mitten im
 * Satz.
 *
 * Die Prüfung steht hier, weil die Regel sonst nur so lange gilt, wie jemand
 * daran denkt — und die nächste Frage kommt aus einem Dokument, das jemand
 * anderes geschrieben hat.
 */
const MITTEN_IM_SATZ = /[a-zß,;)] (Du|Dein|Deine|Deinem|Deinen|Deiner|Deines|Dir|Dich)\b/;

test("die Anrede steht nur am Satzanfang groß", () => {
  for (const scope of SCOPES) {
    // Zurueckgezogene Fragen werden niemandem mehr vorgelegt - die alte S01
    // traegt weiter den Wortlaut der Master-Fassung, und ihn zu glaetten
    // hiesse, an einer abgegebenen Auskunft zu drehen.
    for (const item of offeredItemsV22(scope)) {
      for (const [was, text] of [
        ["Frage", item.prompt],
        ["Hinweis", item.hint ?? ""],
        ["gemeinsame Frage", item.groupPrompt ?? ""],
        ...item.options.map((option) => ["Antwort", option.label] as const),
        ...item.missing.map((entry) => ["Auslassungsgrund", entry.label] as const),
      ] as const) {
        const treffer = MITTEN_IM_SATZ.exec(text);
        assert.ok(
          !treffer,
          `${item.itemId} (${was}): „${treffer?.[1]}" mitten im Satz\n${text}`,
        );
      }
    }
  }
});

test("die Gegenprobe: der Wächter würde es merken", () => {
  assert.ok(MITTEN_IM_SATZ.test("Wie häufig vergleichst Du die Möglichkeiten?"));
  // Und am Satzanfang laesst er es in Ruhe.
  assert.ok(!MITTEN_IM_SATZ.test("Du musst zwischen mehreren entscheiden."));
  assert.ok(!MITTEN_IM_SATZ.test("Etwas ändert sich. Dein Plan gilt weiter."));
});
