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
            "Hilfreich ist oft ein Gegenüber, das hohe Priorisierung versteht, aber Unterschiede in Kapazität und Alltag früh sichtbar macht. Die Ergänzung liegt darin, Tempo ernst zu nehmen, ohne jeden Rahmen gleich hochzuziehen. So wird aus Intensität seltener stiller Druck auf andere.",
        },
        {
          role: "regulator",
          title: "Mehr Leitplanken im Vorangehen",
          description:
            "Entlastend ist oft ein Gegenüber, das Chancen sieht und gleichzeitig Geld, Timing und Tragbarkeit begrenzt. Die Regulierung liegt darin, Mut nicht zurückzunehmen, sondern ihm einen Rahmen zu geben. So entsteht aus Tempo seltener sozialer Druck im Team.",
        },
        {
          role: "rhythm_partner",
          title: "Verbunden, ohne festzuhalten",
          description:
            "Leichter wird Zusammenarbeit mit Menschen, die sichtbar bleiben, ohne jede Schleife gemeinsam zu machen. Die Passung liegt darin, dass du Rückkopplung bekommst und trotzdem nicht alles eng begleiten musst. So bleibt Nähe im Alltag tragfähig.",
        },
      ],
    },
    {
      name: "komplett_balanciertes_profil",
      complements: [
        {
          role: "counterweight",
          title: "Stabiler im Modus",
          description:
            "Hilfreich ist eher ein Gegenüber, das Arbeitsmodi sichtbar macht und nicht voraussetzt, dass beide denselben Abstimmungsbedarf haben. Die Ergänzung liegt hier in Verlässlichkeit darüber, wann Nähe hilft und wann Eigenraum trägt. So müsst ihr den Arbeitsmodus nicht ständig nebenbei klären.",
        },
        {
          role: "regulator",
          title: "Einsatz klar rahmen",
          description:
            "Entlastend ist oft ein Gegenüber, das sichtbar macht, wann hoher Fokus gefragt ist und wann ein begrenzterer Rahmen reicht. Die Regulierung liegt in klaren Arbeitsrealitäten statt stiller Deutung. So wird Intensität seltener zum Missverständnis.",
        },
        {
          role: "rhythm_partner",
          title: "Klar im richtigen Moment",
          description:
            "Im Alltag trägt ein Gegenüber, das ein gutes Gefühl dafür hat, wann etwas sofort auf den Tisch muss und wann noch ein kurzer Abstand hilft. Die Passung liegt hier in verlässlichem Timing. So bleiben Spannungen weder liegen noch werden sie vorschnell groß.",
        },
      ],
    },
    {
      name: "gemischtes_profil",
      complements: [
        {
          role: "counterweight",
          title: "Mehr Zug nach vorn",
          description:
            "Hilfreich ist oft ein Gegenüber, das Marktfenster und Hebel schnell erkennt, ohne deinen Blick auf Substanz kleinzumachen. Die Ergänzung liegt darin, Bewegung auszulösen, während du Tragfähigkeit absicherst. So bleibt Aufbau nicht hängen, wenn eigentlich ein klarer nächster Schritt auf dem Tisch liegt.",
        },
        {
          role: "regulator",
          title: "Risikoschwellen sichtbar machen",
          description:
            "Hilfreich ist eher ein Gegenüber, das bei Chancen und Risiken früh eine nachvollziehbare Schwelle benennt. Die Regulierung liegt darin, situative Unterschiede übersetzbar zu machen. So wird Vorangehen seltener selbst zum Streitpunkt.",
        },
        {
          role: "rhythm_partner",
          title: "Direkt und trotzdem ruhig",
          description:
            "Leichter wird Zusammenarbeit mit Menschen, die Spannungen ernst nehmen und dabei einen guten Gesprächsrahmen halten. Die Passung liegt darin, dass deine Direktheit aufgenommen wird, ohne in Rückzug oder Verteidigung zu kippen. So bleiben heikle Gespräche eher arbeitsfähig.",
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
