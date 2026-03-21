import {
  type DimensionResult,
  type FitCategory,
  type TensionCategory,
} from "@/features/scoring/founderScoring";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";

export type VisionSection = {
  dimension: "Unternehmenslogik";
  interpretation: string;
  everydaySignals: string;
  potentialTensions: VisionTension[];
  conversationPrompts: string[];
};

export type VisionTension = {
  topic: string;
  explanation: string;
};

type BuildVisionSectionInput = {
  dimensionResult: DimensionResult | null | undefined;
  teamContext: TeamContext;
};

function fallbackInterpretation(teamContext: TeamContext) {
  return teamContext === "pre_founder"
    ? "Fuer die Frage, woran ihr unternehmerische Entscheidungen ausrichten wollt, liegt derzeit noch keine tragfaehige Grundlage fuer eine gemeinsame Einschaetzung vor."
    : "Fuer die Frage, woran ihr euer Unternehmen im Kern ausrichten wollt, liegt derzeit noch keine belastbare Grundlage fuer eine gemeinsame Einordnung vor.";
}

function interpretationFromFitCategory(
  fitCategory: FitCategory,
  teamContext: TeamContext
) {
  if (fitCategory === "very_high") {
    return teamContext === "pre_founder"
      ? "In der Frage, woran ihr unternehmerische Entscheidungen ausrichten wollt, seid ihr derzeit sehr nah beieinander. Das spricht dafuer, dass ihr ein moegliches Gruenderteam auf einem aehnlichen Verstaendnis von Marktchance, Skalierbarkeit und Tragfaehigkeit aufbauen koennt."
      : "In der Frage, woran ihr euer Unternehmen ausrichtet, seid ihr derzeit sehr nah beieinander. Fuer eure bestehende Zusammenarbeit ist das ein starker Anker, weil strategische Wirkung und Substanz bei euch gut zusammenpassen.";
  }

  if (fitCategory === "high") {
    return teamContext === "pre_founder"
      ? "Ihr richtet unternehmerische Entscheidungen in eine aehnliche Richtung aus, auch wenn in einzelnen Punkten Unterschiede sichtbar werden. Fuer eine moegliche Zusammenarbeit ist das eine gute Voraussetzung, solange ihr offene Fragen zu Marktlogik, Substanz und Prioritaeten frueh besprecht."
      : "Ihr arbeitet aus einer aehnlichen Unternehmenslogik heraus, auch wenn sich in einzelnen Punkten Unterschiede zeigen. Fuer eure Zusammenarbeit ist das eine gute Basis, solange ihr diese Unterschiede nicht nebenbei laufen lasst, sondern gemeinsam einordnet.";
  }

  if (fitCategory === "mixed") {
    return teamContext === "pre_founder"
      ? "In der Frage, woran ihr unternehmerische Entscheidungen ausrichten wollt, gibt es erkennbare Unterschiede, zum Beispiel bei Marktchance, Skalierbarkeit oder der Bedeutung von Substanz und Aufbau. Vor einer gemeinsamen Gruendung lohnt es sich, diese Punkte klar anzusprechen, bevor daraus unausgesprochene Erwartungen werden."
      : "In der Frage, woran ihr euer Unternehmen ausrichtet, gibt es erkennbare Unterschiede, zum Beispiel bei Marktwirkung, Skalierbarkeit oder der Frage, wie viel Substanz vor Beschleunigung stehen soll. Fuer ein bestehendes Team ist das kein Ausnahmefall, aber ein Bereich, der klare gemeinsame Orientierung braucht.";
  }

  if (fitCategory === "low") {
    return teamContext === "pre_founder"
      ? "In der Frage, woran ihr unternehmerische Entscheidungen ausrichten wollt, liegen deutliche Unterschiede vor. Wenn ihr gemeinsam gruenden wollt, solltet ihr diesen Punkt vor einer verbindlichen Zusammenarbeit sehr offen besprechen, weil hier spaeter Grundsatzkonflikte entstehen koennen."
      : "In der Frage, woran ihr euer Unternehmen ausrichtet, liegen deutliche Unterschiede vor. Fuer ein bestehendes Team ist das ein zentraler Bereich, in dem gemeinsame Prioritaeten und Entscheidungsgrundlagen nachgeschaerft werden sollten.";
  }

  return fallbackInterpretation(teamContext);
}

function potentialTensionsFromState(
  tensionCategory: TensionCategory,
  tensionScore: number | null
) {
  if (tensionCategory === "insufficient_data" || tensionCategory === "low") {
    return [] as VisionTension[];
  }

  const topics = [
    {
        topic: "Wachstumstempo",
        explanation:
          "Unterschiedliche Vorstellungen darueber, wie stark Marktwirkung vor strukturellen Aufbau treten darf, koennen sich spaeter in Entscheidungen ueber Finanzierung, Teamaufbau oder Marktexpansion zeigen.",
    },
  ];

  if (tensionScore != null && tensionScore >= 26) {
    topics.push(
      {
        topic: "Verwertbarkeit oder Aufbau",
        explanation:
          "Waehrend eine Person Entscheidungen staerker an strategischer Verwertbarkeit ausrichtet, denkt die andere deutlicher in Substanz, Aufbau und langfristiger Tragfaehigkeit.",
      },
      {
        topic: "Marktchance vs Substanz",
        explanation:
          "Eine Person will Chancen staerker nach Hebel und Wirkung sortieren, waehrend die andere eher darauf schaut, ob sie den Aufbau des Unternehmens wirklich staerken.",
      }
    );
  }

  if (tensionCategory === "elevated" || (tensionScore != null && tensionScore >= 40)) {
    topics.push({
      topic: "Werte vs Marktchance",
      explanation:
        "Unterschiedliche Vorstellungen darueber, welche Chancen man aus strategischer Sicht verfolgen sollte und wo aus Sicht von Substanz und Unternehmensaufbau Grenzen liegen.",
    });
  }

  return topics.filter(
    (entry, index, array) => array.findIndex((candidate) => candidate.topic === entry.topic) === index
  );
}

function promptsForPreFounder() {
  return [
    "Welche Rolle soll dieses Unternehmen in fuenf Jahren in eurem Leben spielen und was waere euch dafuer wichtig?",
    "Woran wuerdet ihr frueh merken, dass ihr trotz gleicher Idee unternehmerische Entscheidungen an unterschiedlichen Maßstäben ausrichtet?",
    "Was soll bei euch in Zweifelsfällen mehr Gewicht haben: strategische Wirkung, Skalierbarkeit oder tragfaehiger Aufbau?",
    "Wann darf Marktchance Vorrang haben und wann soll Substanz oder Tragfaehigkeit die Entscheidung fuehren?",
  ];
}

function promptsForExistingTeam() {
  return [
    "Welche Maßstäbe fuehren eure wichtigsten unternehmerischen Entscheidungen heute tatsaechlich: Wirkung, Skalierbarkeit oder Aufbau?",
    "Wie entscheidet ihr, wann Marktanpassung sinnvoll ist, ohne dass Substanz oder Tragfaehigkeit zu kurz kommen?",
    "Wo gehen eure Erwartungen an Marktwirkung, Aufbau oder strategische Priorisierung derzeit am deutlichsten auseinander?",
    "Welche Entscheidungen solltet ihr kuenftig staerker daran messen, woran ihr euer Unternehmen im Kern ausrichtet?",
  ];
}

function everydaySignals(teamContext: TeamContext) {
  return teamContext === "pre_founder"
    ? "Das kann sich im Alltag z. B. daran zeigen, dass ihr Marktchancen unterschiedlich bewertet oder frueh anders gewichtet, ob Wirkung und Skalierbarkeit oder Substanz und Aufbau Vorrang haben."
    : "Im Alltag merkt man das oft daran, dass ihr strategische Chancen unterschiedlich einordnet oder bei Wachstum, Prioritaeten und unternehmerischer Tragfaehigkeit nicht automatisch dieselben Maßstäbe anlegt.";
}

export function buildVisionSection({
  dimensionResult,
  teamContext,
}: BuildVisionSectionInput): VisionSection {
  const safeDimension = "Unternehmenslogik" as const;

  if (
    !dimensionResult ||
    dimensionResult.dimension !== safeDimension ||
    dimensionResult.fitCategory === "insufficient_data"
  ) {
    return {
      dimension: safeDimension,
      interpretation: fallbackInterpretation(teamContext),
      everydaySignals: everydaySignals(teamContext),
      potentialTensions: [],
      conversationPrompts:
        teamContext === "pre_founder"
          ? promptsForPreFounder().slice(0, 3)
          : promptsForExistingTeam().slice(0, 3),
    };
  }

  return {
    dimension: safeDimension,
    interpretation: interpretationFromFitCategory(dimensionResult.fitCategory, teamContext),
    everydaySignals: everydaySignals(teamContext),
    potentialTensions: potentialTensionsFromState(
      dimensionResult.tensionCategory,
      dimensionResult.tensionScore
    ),
    conversationPrompts:
      teamContext === "pre_founder"
        ? promptsForPreFounder()
        : promptsForExistingTeam(),
  };
}
