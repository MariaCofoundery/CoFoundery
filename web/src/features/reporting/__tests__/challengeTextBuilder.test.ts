import assert from "node:assert/strict";
import test from "node:test";
import {
  buildChallengeExamples,
  buildChallengesFromScores,
} from "@/features/reporting/challengeTextBuilder";
import { SELF_REPORT_SELECTION_DEBUG_CASES } from "@/features/reporting/selfReportSelection";

test("challenge text builder returns deterministic cards for the tracked audit cases", () => {
  assert.deepEqual(buildChallengeExamples(), [
    {
      name: "stark_ausgepraegtes_profil",
      challenges: [
        {
          title: "Wenn Einsatz auseinanderläuft",
          description:
            "Schwierig wird es fuer dich, wenn du das Startup klar priorisierst und andere mit einem deutlich breiteren Lebens- oder Arbeitsrahmen planen. Du spuerst diese Differenz oft nicht zuerst in Worten, sondern daran, wie unterschiedlich Verfuegbarkeit und Fokus im Alltag gelebt werden. Die gleiche Option wird dann schnell in zwei verschiedene Richtungen gelesen.",
        },
        {
          title: "Wenn Rückkopplung fehlt",
          description:
            "Anstrengend wird es fuer dich, wenn andere viel autonomer arbeiten und du wichtige Zwischenstaende erst spaet mitbekommst. Dir fehlt dann weniger Kontrolle als ein gemeinsames Bild davon, wo etwas steht und wo es gerade hakt. Ein offener Punkt taucht dann spaeter an anderer Stelle wieder im Alltag auf.",
        },
        {
          title: "Wenn Sicherheit bremst",
          description:
            "Schwierig wird es fuer dich, wenn im Team zuerst Sicherheit gesucht wird und du laengst eine echte Chance siehst. Du verlierst dabei eher Energie, weil fuer dich ein gangbarer Schritt oft frueher sichtbar ist als fuer vorsichtigere Mitgruender. Eine Entscheidung wird dann leicht mehrmals aufgemacht oder vorschnell geschlossen.",
        },
      ],
    },
    {
      name: "komplett_balanciertes_profil",
      challenges: [
        {
          title: "Wenn Themen mitschwingen",
          description:
            "Schwierig wird es fuer dich, wenn Reibung laenger stehen bleibt und niemand markiert, wann jetzt wirklich gesprochen wird. Du kannst Timing gut steuern, doch ohne einen klaren Punkt bleibt zu lange offen, wie ernst ein Thema inzwischen ist. Fehlt das, arbeitet ihr leicht nebeneinander statt mit einem gemeinsamen Modus.",
        },
        {
          title: "Wenn Richtung offen bleibt",
          description:
            "Anstrengend wird es fuer dich, wenn lange offenbleibt, ob gerade Aufbau oder Wirkung Vorrang haben soll. Du kannst beides mitdenken, aber auf Dauer kostet es Kraft, wenn diese Klärung immer wieder vertagt wird. Dann besprecht ihr dieselben Themen mit unterschiedlichen inneren Prioritaeten.",
        },
        {
          title: "Wenn niemand festlegt",
          description:
            "Anstrengend wird es fuer dich, wenn ihr prueft, abwaegt und trotzdem kein klarer Punkt gesetzt wird. Du kannst zwischen Sorgfalt und Tempo umschalten, brauchst dafuer aber ein sichtbares Signal, wann entschieden ist. Ohne diesen Punkt dreht sich eine Entscheidung schnell im Kreis.",
        },
      ],
    },
    {
      name: "gemischtes_profil",
      challenges: [
        {
          title: "Wenn Wirkung ziehen soll",
          description:
            "Schwierig wird es fuer dich, wenn du in einer Chance schon klare Wirkung siehst und andere zuerst ueber Aufbau und Tragfaehigkeit sprechen wollen. Dann landet dieselbe Option schnell in zwei Lesarten: fuer dich als Hebel, fuer andere als Aufbaufrage. Die gleiche Option wird dann schnell in zwei verschiedene Richtungen gelesen.",
        },
        {
          title: "Wenn Reibung liegen bleibt",
          description:
            "Anstrengend wird es fuer dich, wenn dein direktes Ansprechen auf Menschen trifft, die Unterschiede lieber erst einmal liegen lassen. Du willst Reibung lieber bearbeiten als mitschleppen, waehrend andere noch Abstand oder Schonraum brauchen. Ein offener Punkt taucht dann spaeter an anderer Stelle wieder im Alltag auf.",
        },
        {
          title: "Wenn Risiko anders gelesen wird",
          description:
            "Anstrengend wird es fuer dich, wenn Chancen im Raum stehen, aber niemand klar sagt, welches Risiko ihr gemeinsam wirklich tragen wollt. Du kannst Mut und Absicherung gut gegeneinander abwaegen, merkst aber frueh, wenn das Team dafuer sehr verschiedene Schwellen hat. Dann wird nicht nur die Sache, sondern auch der Entscheidungszeitpunkt verhandelt.",
        },
      ],
    },
  ]);
});

test("challenge text builder always returns exactly three cards for the tracked example cases", () => {
  const trackedCases = SELF_REPORT_SELECTION_DEBUG_CASES.filter((entry) =>
    ["stark_ausgepraegtes_profil", "komplett_balanciertes_profil", "gemischtes_profil"].includes(
      entry.name
    )
  );

  for (const testCase of trackedCases) {
    const challenges = buildChallengesFromScores(testCase.scores);
    assert.equal(challenges.length, 3, testCase.name);
  }
});
