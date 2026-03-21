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
            "Schwierig wird es für dich, wenn du das Startup klar priorisierst und andere mit einem deutlich breiteren Lebens- oder Arbeitsrahmen planen. Du spürst diese Differenz oft nicht zuerst in Worten, sondern daran, wie unterschiedlich Verfügbarkeit und Ernst im Alltag gelebt werden. An Weggabelungen zieht ihr dann schnell in unterschiedliche Richtungen.",
        },
        {
          title: "Wenn Rückkopplung fehlt",
          description:
            "Anstrengend wird es für dich, wenn andere viel autonomer arbeiten und du wichtige Zwischenstände erst spät mitbekommst. Dir fehlt dann weniger Kontrolle als ein gemeinsames Bild davon, wo etwas steht und wo es gerade hakt. Aus kleinen Irritationen entsteht dann schnell spürbare Distanz im Alltag.",
        },
        {
          title: "Wenn Sicherheit bremst",
          description:
            "Schwierig wird es für dich, wenn im Team zuerst Sicherheit gesucht wird und du längst eine echte Chance siehst. Du verlierst dabei eher Energie, weil für dich ein gangbarer Schritt oft früher sichtbar ist als für vorsichtigere Mitgründer. Tempo wird dann leicht selbst zum Streitpunkt.",
        },
      ],
    },
    {
      name: "komplett_balanciertes_profil",
      challenges: [
        {
          title: "Wenn Abstimmung ungeklärt bleibt",
          description:
            "Schwierig wird es für dich, wenn unklar bleibt, wann ihr eng zusammenarbeitet und wann jeder eigenständig weitergeht. Du kommst mit Nähe und Eigenraum zurecht, solange der Modus erkennbar ist und nicht ständig neu erraten werden muss. Fehlt das, arbeitet ihr eher nebeneinander als miteinander.",
        },
        {
          title: "Wenn Richtung offen bleibt",
          description:
            "Anstrengend wird es für dich, wenn lange offenbleibt, ob gerade Wirkung oder Aufbau Vorrang haben soll. Du kannst beides mitdenken, aber auf Dauer kostet es Kraft, wenn diese Entscheidung immer wieder vertagt wird. Dann zieht ihr an denselben Themen mit unterschiedlichen Erwartungen.",
        },
        {
          title: "Wenn niemand festlegt",
          description:
            "Anstrengend wird es für dich, wenn ihr prüft, abwägt und trotzdem kein klarer Punkt gesetzt wird. Du kannst zwischen Sorgfalt und Tempo umschalten, brauchst dafür aber ein sichtbares Signal, wann entschieden ist. Ohne diesen Punkt dreht sich Diskussion schnell im Kreis.",
        },
      ],
    },
    {
      name: "gemischtes_profil",
      challenges: [
        {
          title: "Wenn Fundament relativ wird",
          description:
            "Schwierig wird es für dich, wenn andere stark auf Hebel und schnelle Wirkung gehen, während du erst wissen willst, was davon wirklich trägt. Du ziehst Entscheidungen dann eher zurück auf Belastbarkeit und Substanz, während andere schon beschleunigen wollen. An Weggabelungen zieht ihr dann schnell in unterschiedliche Richtungen.",
        },
        {
          title: "Wenn Reibung liegen bleibt",
          description:
            "Anstrengend wird es für dich, wenn dein direktes Ansprechen auf Menschen trifft, die Konflikte lieber erst einmal liegen lassen. Du willst Reibung lieber bearbeiten als mitschleppen, während andere noch Abstand oder Schonraum brauchen. Aus kleinen Irritationen entsteht dann schnell spürbare Distanz im Alltag.",
        },
        {
          title: "Wenn Risiko anders gelesen wird",
          description:
            "Anstrengend wird es für dich, wenn Chancen im Raum stehen, aber niemand klar sagt, welches Risiko ihr gemeinsam wirklich tragen wollt. Du kannst Mut und Absicherung gut gegeneinander abwägen, merkst aber relativ früh, wenn das Team dafür sehr verschiedene Schwellen hat. Vorangehen wird dann schnell selbst zum Verhandlungsthema.",
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
