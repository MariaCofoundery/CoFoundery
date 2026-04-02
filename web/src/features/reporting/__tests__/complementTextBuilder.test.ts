import assert from "node:assert/strict";
import test from "node:test";
import {
  buildComplementExamples,
  buildComplementsFromScores,
} from "@/features/reporting/complementTextBuilder";
import { SELF_REPORT_SELECTION_DEBUG_CASES } from "@/features/reporting/selfReportSelection";

test("complement text builder returns deterministic cards for the tracked audit cases", () => {
  assert.deepEqual(buildComplementExamples(), [
    {
      name: "stark_ausgepraegtes_profil",
      complements: [
        {
          role: "counterweight",
          title: "Mehr Luft im Einsatz",
          description:
            "Hilfreich ist oft ein Gegenüber, das deinen hohen Fokus teilt und gleichzeitig früh sagt, wann eigene Grenzen, Kalender oder andere Verpflichtungen hineinspielen. So wird in intensiven Phasen schneller klar, wer gerade wirklich zusätzliche Zeit geben kann und wer nicht. Unterschiedliche Kapazitäten werden dann seltener als fehlender Einsatz gelesen.",
        },
        {
          role: "regulator",
          title: "Mehr Leitplanken im Vorangehen",
          description:
            "Entlastend ist oft ein Gegenüber, das bei einer Chance nicht grundsätzlich bremst, aber früh fragt, wie viel Geld, Zeit oder Unsicherheit ihr dafür wirklich einsetzen wollt. So bekommt ein mutiger Schritt klare Grenzen, bevor schon viel Einsatz gebunden ist. Aus Vorwärtsgang wird dann seltener Druck auf das ganze Team.",
        },
        {
          role: "rhythm_partner",
          title: "Verbunden, ohne festzuhalten",
          description:
            "Leichter wird Zusammenarbeit mit Menschen, die im Austausch bleiben, ohne jeden Zwischenschritt gemeinsam zu drehen. So bekommst du früh genug Rückkopplung, ohne dass Abstimmung den ganzen Arbeitstag belegt. Verbindung bleibt dann im Alltag stabiler als der Wunsch, alles gemeinsam zu sehen.",
        },
      ],
    },
    {
      name: "komplett_balanciertes_profil",
      complements: [
        {
          role: "counterweight",
          title: "Klarer im Timing",
          description:
            "Hilfreich ist eher ein Gegenüber, das Spannungen weder unnötig schärft noch zu lange mitschwingen lässt. Die Ergänzung liegt hier in einem verlässlichen Gefühl dafür, wann ein Thema jetzt auf den Tisch muss. So bleibt Timing nicht bloß Bauchgefühl.",
        },
        {
          role: "regulator",
          title: "Einsatz klar rahmen",
          description:
            "Entlastend ist oft ein Gegenüber, das früh anspricht, wann in den nächsten Wochen hoher Fokus nötig ist und wann ein begrenzterer Rahmen reicht. So wird aus Priorität eine konkrete Erwartung an Zeit und Verfügbarkeit. Missverständnisse entstehen dann seltener erst dann, wenn schon jemand mehr Einsatz erwartet hat.",
        },
        {
          role: "rhythm_partner",
          title: "Klarer im Arbeitsmodus",
          description:
            "Im Alltag trägt ein Gegenüber, das Nähe und Eigenraum früh sichtbar macht, statt beides still vorauszusetzen. Die Passung liegt hier in klaren Erwartungen an denselben Prozess. So arbeitet ihr seltener mit unterschiedlichen inneren Plänen.",
        },
      ],
    },
    {
      name: "gemischtes_profil",
      complements: [
        {
          role: "counterweight",
          title: "Mehr Substanz im Blick",
          description:
            "Gut ergänzt wirst du durch Menschen, die Wachstum und Wirkung nicht kleinreden, aber früh fragen, was davon auch morgen noch trägt. Genau darin liegt der Ausgleich: strategische Zugkraft bleibt da, ohne dass Aufbau und Belastbarkeit unter die Räder kommen. So werden große Hebel eher in Schritte übersetzt, die im Alltag standhalten.",
        },
        {
          role: "regulator",
          title: "Risikoschwellen sichtbar machen",
          description:
            "Hilfreich ist eher ein Gegenüber, das bei einer Chance früh benennt, bis wohin ihr beim Geld, Tempo oder bei persönlicher Belastung wirklich gehen wollt. So muss die Risikoschwelle nicht erst in der Diskussion erraten werden. Vorangehen wird dann seltener selbst zum Streitpunkt.",
        },
        {
          role: "rhythm_partner",
          title: "Direkt und trotzdem ruhig",
          description:
            "Leichter wird Zusammenarbeit mit Menschen, die einen Unterschied nicht übergehen, aber im Gespräch Tempo und Rahmen mitsteuern. So kann deine direkte Ansprache aufgenommen werden, ohne dass das Gegenüber sofort in Rückzug oder Rechtfertigung geht. Heikle Themen werden dann eher geklärt, bevor sie auf die Beziehungsebene rutschen.",
        },
      ],
    },
  ]);
});

test("complement text builder mirrors the available roles from the tracked example cases", () => {
  const trackedCases = SELF_REPORT_SELECTION_DEBUG_CASES.filter((entry) =>
    ["stark_ausgepraegtes_profil", "komplett_balanciertes_profil", "gemischtes_profil"].includes(
      entry.name
    )
  );

  for (const testCase of trackedCases) {
    const complements = buildComplementsFromScores(testCase.scores);
    assert.ok(complements.length >= 1, testCase.name);
    assert.ok(complements.length <= 3, testCase.name);
  }
});
