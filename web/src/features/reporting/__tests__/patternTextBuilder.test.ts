import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPatternExamples,
  buildPatternsFromScores,
} from "@/features/reporting/patternTextBuilder";
import { SELF_REPORT_SELECTION_DEBUG_CASES } from "@/features/reporting/selfReportSelection";

test("pattern text builder returns deterministic cards for the tracked audit cases", () => {
  assert.deepEqual(buildPatternExamples(), [
    {
      name: "stark_ausgepraegtes_profil",
      patterns: [
        {
          title: "Alles auf Fokus",
          description:
            "Du behandelst das Startup klar als Schwerpunkt und liest Zusammenarbeit auch über dieses Fokusniveau. Im Alltag zeigt sich das an hoher Verfügbarkeit, viel Präsenz und einem deutlichen Ernst in der Sache. Wer Intensität anders taktet, merkt das schnell an deinem Anspruch auf Verbindlichkeit und Präsenz.",
        },
        {
          title: "Im Loop bleiben",
          description:
            "Du arbeitest lieber mit engem Austausch als im stillen Nebeneinander. Im Alltag willst du wissen, wo Dinge stehen, was entschieden ist und wo etwas noch hakt. Für autonomere Menschen wird Abstimmung damit schnell zur Daueraufgabe, auch wenn du eigentlich nur Verbindung halten willst.",
        },
        {
          title: "Chancen aktiv spielen",
          description:
            "Du gehst schneller in Tests, Wetten und Bewegung, wenn du darin echten Spielraum siehst. Im Alltag merkt man das daran, dass du Unsicherheit eher als Preis für Fortschritt liest als als Grund zu warten. Für vorsichtigere Mitgründer entsteht dabei schnell Druck, weil du deutlich früher bereit bist, etwas zu riskieren.",
        },
      ],
    },
    {
      name: "komplett_balanciertes_profil",
      patterns: [
        {
          title: "Wirkung und Aufbau",
          description:
            "Du schaltest sichtbar zwischen Hebel und Aufbau um, je nachdem, was die Lage gerade verlangt. In einem Moment zählt für dich Marktwirkung, im nächsten eher Tragfähigkeit und saubere Substanz. Entscheidend ist dann, dass im Team klar bleibt, woran ihr euch gerade orientiert.",
        },
        {
          title: "Prüfen und entscheiden",
          description:
            "Du schaltest zwischen genauer Prüfung und entschlossenem Setzen eines Punkts, je nachdem, was die Lage braucht. Im Alltag bleibst du damit weder in Analyse hängen noch gehst du blind nach vorn. Kritisch wird es erst dann, wenn im Team niemand klar markiert, wann wirklich entschieden wird.",
        },
        {
          title: "Nähe bewusst dosieren",
          description:
            "Du wechselst im Arbeiten zwischen Eigenraum und enger Rückkopplung, je nachdem, worum es gerade geht. Dabei suchst du nicht automatisch Distanz oder Nähe, sondern steuerst beides bewusst. Wenn das im Team nicht ausgesprochen wird, arbeitet ihr leicht mit unterschiedlichen Erwartungen an denselben Prozess.",
        },
      ],
    },
    {
      name: "gemischtes_profil",
      patterns: [
        {
          title: "Tragfähig statt schnell",
          description:
            "Du gibst Themen Raum, die das Unternehmen belastbarer machen und später noch tragen. Bei Wachstum, Struktur oder Produktfragen schaust du früh auf Fundament statt nur auf Beschleunigung. Für andere fühlt sich das oft solide an, kann schnelle Hebel aber spürbar abbremsen.",
        },
        {
          title: "Spannungen früh aufmachen",
          description:
            "Du sprichst Spannungen lieber an, als sie lange mitlaufen zu lassen. Im Alltag macht sich das dort bemerkbar, wo du Dinge eher direkt auf den Tisch legst als sie vorsichtig zu umkreisen. Sensiblere Gegenüber fühlen sich davon schnell unter Zug, auch wenn du nur rasch klären willst.",
        },
        {
          title: "Mut mit Augenmaß",
          description:
            "Du liest Risiko situativ und gehst mal vorsichtiger, mal offensiver vor. Im Alltag wechselst du zwischen Absicherung und Vorwärtsgang, statt immer dieselbe Schwelle anzulegen. Das bleibt gut lesbar, solange für andere sichtbar ist, wo deine Grenze gerade liegt.",
        },
      ],
    },
  ]);
});

test("pattern text builder always returns exactly three cards for the tracked example cases", () => {
  const trackedCases = SELF_REPORT_SELECTION_DEBUG_CASES.filter((entry) =>
    ["stark_ausgepraegtes_profil", "komplett_balanciertes_profil", "gemischtes_profil"].includes(
      entry.name
    )
  );

  for (const testCase of trackedCases) {
    const patterns = buildPatternsFromScores(testCase.scores);
    assert.equal(patterns.length, 3, testCase.name);
  }
});
