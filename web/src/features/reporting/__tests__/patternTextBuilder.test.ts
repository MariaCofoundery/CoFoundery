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
            "Du behandelst das Startup klar als Schwerpunkt und liest Zusammenarbeit auch ueber dieses Fokusniveau. Im Alltag zeigt sich das an hoher Verfuegbarkeit, viel Praesenz und einem klaren Fokus auf die Sache. Wer Intensitaet anders taktet, merkt das schnell an deinem Anspruch auf Verbindlichkeit und Praesenz. Im Team zeigt sich das vor allem dann, wenn du in einer Phase sofort mehr Einsatz hochziehst und andere ihren Rahmen nicht in gleichem Mass mitbewegen.",
        },
        {
          title: "Im Loop bleiben",
          description:
            "Du arbeitest lieber mit engem Austausch als im stillen Nebeneinander. Im Alltag willst du wissen, wo Dinge stehen, was entschieden ist und wo etwas noch hakt. Fuer autonomere Menschen wird Abstimmung damit schnell zur Daueraufgabe, auch wenn du eigentlich nur Verbindung halten willst. Im Team zeigt sich das vor allem dann, wenn du frueh Zwischenstaende sehen willst und andere dieselbe Arbeit lieber erst spaeter teilen.",
        },
        {
          title: "Chancen aktiv spielen",
          description:
            "Du gehst schneller in Tests, Wetten und Bewegung, wenn du darin echten Spielraum siehst. Im Alltag liest du Unsicherheit eher als Preis fuer Fortschritt als als Grund zu warten. Fuer vorsichtigere Mitgruender entsteht dabei schnell Druck, weil du frueher bereit bist, etwas zu riskieren. Im Team zeigt sich das vor allem dann, wenn du in einem offenen Marktfenster schon handeln willst und andere erst die Downside sauber begrenzen wollen.",
        },
      ],
    },
    {
      name: "komplett_balanciertes_profil",
      patterns: [
        {
          title: "Wirkung und Aufbau",
          description:
            "Du wechselst sichtbar zwischen Aufbau und Hebel. Bei einer Chance zaehlt fuer dich zuerst die Tragfaehigkeit, bei der naechsten zuerst das Marktfenster. Deine Staerke ist diese Beweglichkeit, fuer andere bleibt aber nicht immer sofort klar, welche Logik gerade fuehrt. Im Team zeigt sich das vor allem dann, wenn du in einem Meeting erst Substanz betonst und spaeter denselben Vorschlag wieder ueber Reichweite und Hebel einordnest.",
        },
        {
          title: "Prüfen und entscheiden",
          description:
            "Du schaltest zwischen genauer Pruefung und einem klaren Punkt um. Manche Entscheidungen willst du erst gruendlich klaeren, bei anderen gehst du frueh in den naechsten Schritt. Deine Staerke ist diese Anpassungsfaehigkeit, fuer andere bleibt aber nicht immer klar, wann du in welchen Modus wechselst. Im Team zeigt sich das vor allem dann, wenn eine Frage erst offen diskutiert wird und du sie wenig spaeter schon fuer entscheidbar haeltst.",
        },
        {
          title: "Nähe bewusst dosieren",
          description:
            "Du wechselst im Arbeiten zwischen Eigenraum und enger Rueckkopplung. Bei einem Thema willst du erst allein vorarbeiten, beim naechsten frueh gemeinsam draufschauen. Deine Staerke ist diese Flexibilitaet, fuer andere bleibt aber nicht immer klar, welchen Modus du gerade erwartest. Im Team zeigt sich das vor allem dann, wenn du bei einem Projekt sehr frueh abstimmst und beim naechsten erst spaet sichtbar wirst.",
        },
      ],
    },
    {
      name: "gemischtes_profil",
      patterns: [
        {
          title: "Hebel zuerst sehen",
          description:
            "Du sortierst neue Themen frueh danach, ob sie Reichweite, Zugang oder Momentum bringen. In Gespraechen ziehst du Chancen eher nach vorn, wenn der Hebel schnell sichtbar ist. Wenn andere zuerst auf Stabilitaet und Fundament schauen, sprecht ihr leicht ueber zwei verschiedene Prioritaeten. Im Team zeigt sich das vor allem dann, wenn eine neue Option auftaucht und du schon ueber den naechsten Marktzugang sprichst, waehrend andere noch die Belastbarkeit des Modells pruefen wollen.",
        },
        {
          title: "Spannungen früh aufmachen",
          description:
            "Du sprichst Unterschiede lieber an, als sie lange mitlaufen zu lassen. Im Alltag zeigt sich das dort, wo du Dinge eher direkt auf den Tisch legst als sie vorsichtig zu umkreisen. Sensiblere Gegenueber fuehlen sich davon schnell unter Zug, auch wenn du nur rasch klaeren willst. Im Team zeigt sich das vor allem dann, wenn du nach einer strittigen Entscheidung sofort in die Klaerung gehst und andere erst Abstand brauchen.",
        },
        {
          title: "Mut mit Augenmaß",
          description:
            "Oft entscheidest du danach, wann Absicherung reicht und wann ein mutigerer Schritt mehr bringt. Dadurch bleibst du weder im Vorsichtsmuster haengen noch springst du blind. Ohne klare Worte dazu wird im Team aber schnell unterschiedlich gelesen, welches Risiko gerade noch okay ist. Im Team zeigt sich das vor allem dann, wenn eine Chance auf dem Tisch liegt und nicht sofort klar ist, ob du sie als vertretbar oder als zu offen einschaetzt.",
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
