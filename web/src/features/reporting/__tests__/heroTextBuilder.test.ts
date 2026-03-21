import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHeroTextExamples,
  buildHeroTextFromScores,
} from "@/features/reporting/heroTextBuilder";
import { SELF_REPORT_SELECTION_DEBUG_CASES } from "@/features/reporting/selfReportSelection";

test("hero text builder returns deterministic examples for the main audit cases", () => {
  assert.deepEqual(buildHeroTextExamples(), [
    {
      name: "stark_ausgepraegtes_profil",
      heroText:
        "Für dich steht das Startup klar im Zentrum; Zeit, Energie und Aufmerksamkeit ordnen sich stark darum herum. Im täglichen Arbeiten willst du laufend wissen, wo Dinge stehen, was entschieden ist und wo noch etwas offen bleibt. Schwierig wird es, wenn im Team zuerst Sicherheit gesucht wird und du längst eine echte Chance siehst. Für die Zusammenarbeit bringt das Richtung, doch ohne gemeinsames Verständnis von Risiko und Entscheidung bleibt Tempo liegen oder kippt dauernd.",
    },
    {
      name: "komplett_balanciertes_profil",
      heroText:
        "Je nach Aufgabe suchst du mehr Eigenraum oder mehr Rückkopplung, statt dich auf einen festen Arbeitsmodus festzulegen. Im Alltag wechselst du spürbar zwischen Marktfenster und Aufbaufrage, je nachdem, was gerade Vorrang braucht. Dann wird es schnell zäh, wenn offenbleibt, wann ihr prüft und wann ihr euch wirklich festlegen wollt. Im Miteinander macht dich das beweglich; fehlen klare Absprachen, bleibt schnell offen, wer woran zieht und welches Tempo gerade gilt.",
    },
    {
      name: "gemischtes_profil",
      heroText:
        "Substanz, Aufbau und langfristige Tragfähigkeit sind für dich kein Nebenthema, sondern der Maßstab für unternehmerische Entscheidungen. Im Alltag merkt man das daran, dass du Spannungen eher früh sichtbar machst, statt sie länger im Hintergrund laufen zu lassen. Schwierig wird es, wenn Chancen im Raum stehen, aber offenbleibt, welches Risiko ihr gemeinsam wirklich tragen wollt. Für die Zusammenarbeit bringt das Richtung, doch ohne gemeinsames Verständnis von Risiko und Entscheidung bleibt Tempo liegen oder kippt dauernd.",
    },
  ]);
});

test("hero text always contains exactly four sentences for the tracked example cases", () => {
  const trackedCases = SELF_REPORT_SELECTION_DEBUG_CASES.filter((entry) =>
    ["stark_ausgepraegtes_profil", "komplett_balanciertes_profil", "gemischtes_profil"].includes(
      entry.name
    )
  );

  for (const testCase of trackedCases) {
    const hero = buildHeroTextFromScores(testCase.scores);
    const sentenceCount = hero
      .split(". ")
      .filter(Boolean)
      .length;

    assert.equal(sentenceCount, 4, testCase.name);
  }
});
