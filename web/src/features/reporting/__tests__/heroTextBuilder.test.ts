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
        "Dein Kernmuster: Du richtest Zeit, Energie und Aufmerksamkeit deutlich auf das Startup aus - genau dort kippt es im Team, wenn andere Prioritaet und Verfuegbarkeit anders einordnen. Im taeglichen Arbeiten willst du frueh sehen, wo Dinge stehen, was entschieden ist und wo noch etwas offen bleibt. Die groesste Reibung entsteht, wenn im Team zuerst Sicherheit hergestellt werden soll und du in derselben Lage schon eine echte Chance siehst. Im Alltag landet dieselbe Entscheidung schnell noch einmal auf dem Tisch, obwohl fuer dich innerlich schon klar ist, ob noch geprueft oder schon entschieden werden sollte. Im Meeting wirkt das schnell so, als waerst du schon einen Schritt weiter oder noch nicht so weit wie der Rest.",
    },
    {
      name: "komplett_balanciertes_profil",
      heroText:
        "Dein Kernmuster: Manche Unterschiede sprichst du sofort an, andere laesst du erst kurz liegen, bevor du sie aufmachst - genau dort kippt es im Team, weil dein Timing schwer vorhersagbar ist. Im Alltag wirkt das so: In einer Phase bist du sehr praesenz, in der naechsten faehrst du bewusst wieder auf ein integriertes Niveau zurueck. Die groesste Reibung entsteht, wenn du zwischen Pruefen und Festlegen wechselst und fuer andere nicht klar ist, ab wann du etwas wirklich fuer entscheidbar haeltst. Im Alltag wird oft erst spaet sichtbar, welchen Modus du gerade erwartest. Dadurch wirkst du schnell sprunghaft, obwohl du fuer dich nur zwischen passenden Modi wechselst.",
    },
    {
      name: "gemischtes_profil",
      heroText:
        "Dein Kernmuster: Du sortierst neue Chancen zuerst nach Reichweite, Zug und strategischer Wirkung - genau dort kippt es im Team, wenn andere zuerst Stabilitaet und Tragfaehigkeit sichern wollen. Im Alltag merkt man das daran, dass du Unterschiede eher frueh sichtbar machst, statt sie laenger im Hintergrund laufen zu lassen. Reibung entsteht, wenn Chancen im Raum stehen, aber offenbleibt, welches Risiko ihr gemeinsam wirklich tragen wollt. Im Alltag landet dieselbe Entscheidung schnell noch einmal auf dem Tisch, obwohl fuer dich innerlich schon klar ist, ob noch geprueft oder schon entschieden werden sollte. Im Meeting wirkt das schnell so, als waerst du schon einen Schritt weiter oder noch nicht so weit wie der Rest.",
    },
  ]);
});

test("hero text always contains exactly five sentences for the tracked example cases", () => {
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

    assert.equal(sentenceCount, 5, testCase.name);
  }
});
