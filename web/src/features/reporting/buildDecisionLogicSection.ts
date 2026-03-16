import {
  type DimensionResult,
  type FitCategory,
  type TensionCategory,
} from "@/features/scoring/founderScoring";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";

export type DecisionLogicTension = {
  topic: string;
  explanation: string;
};

export type DecisionLogicSection = {
  dimension: "Entscheidungslogik";
  interpretation: string;
  everydaySignals: string;
  potentialTensions: DecisionLogicTension[];
  conversationPrompts: string[];
};

type BuildDecisionLogicSectionInput = {
  dimensionResult: DimensionResult | null | undefined;
  teamContext: TeamContext;
};

function fallbackInterpretation(teamContext: TeamContext) {
  return teamContext === "pre_founder"
    ? "Fuer die Frage, wie ihr Entscheidungen treffen und Verantwortung verteilen wuerdet, liegt derzeit noch keine belastbare Grundlage vor."
    : "Fuer die Frage, wie ihr in eurer Zusammenarbeit Entscheidungen trefft und Verantwortung verteilt, liegt derzeit noch keine belastbare Grundlage vor.";
}

function interpretationFromFitCategory(
  fitCategory: FitCategory,
  teamContext: TeamContext
) {
  if (fitCategory === "very_high") {
    return teamContext === "pre_founder"
      ? "In der Art, wie ihr Entscheidungen trefft, seid ihr derzeit sehr nah beieinander. Das schafft fuer eine moegliche Zusammenarbeit Klarheit, weil Tempo, Absicherung und Verantwortungsverteilung aehnlich verstanden werden."
      : "In der Art, wie ihr Entscheidungen trefft, seid ihr derzeit sehr nah beieinander. Fuer eure Zusammenarbeit schafft das Klarheit im Alltag, weil Tempo, Absicherung und Verantwortungsverteilung aehnlich verstanden werden.";
  }

  if (fitCategory === "high") {
    return teamContext === "pre_founder"
      ? "Ihr bringt in eurer Entscheidungslogik viel gemeinsame Basis mit, auch wenn sich in Tempo oder Absicherung einzelne Unterschiede zeigen. Fuer eine moegliche Zusammenarbeit ist das gut tragfaehig, wenn ihr diese Unterschiede bewusst nutzt."
      : "Ihr bringt in eurer Entscheidungslogik viel gemeinsame Basis mit, auch wenn sich in Tempo oder Absicherung Unterschiede zeigen. Fuer die Zusammenarbeit ist das gut tragfaehig, wenn ihr diese Unterschiede bewusst in eure Abstimmung einbaut.";
  }

  if (fitCategory === "mixed") {
    return teamContext === "pre_founder"
      ? "In eurer Entscheidungslogik zeigen sich spuerbar unterschiedliche Praeferenzen. Das kann produktiv sein, wenn eine Person eher Tempo und die andere eher Struktur einbringt. Ohne klare Absprachen entsteht daraus jedoch leicht Reibung."
      : "In eurer Entscheidungslogik zeigen sich spuerbar unterschiedliche Praeferenzen. Im Alltag kann das produktiv sein, wenn eine Person eher Tempo und die andere eher Struktur einbringt. Ohne klare Absprachen entsteht daraus jedoch leicht Reibung.";
  }

  if (fitCategory === "low") {
    return teamContext === "pre_founder"
      ? "In eurer Entscheidungslogik liegen deutliche Unterschiede vor. Das betrifft Tempo, Entscheidungsgrundlagen, Verantwortung und Abstimmung. Wenn ihr gemeinsam gruenden wollt, braucht dieser Bereich frueh klare Vereinbarungen."
      : "In eurer Entscheidungslogik liegen deutliche Unterschiede vor. Das betrifft Tempo, Entscheidungsgrundlagen, Verantwortung und Abstimmung. Fuer ein bestehendes Team ist das ein Bereich, der frueh wieder klare Orientierung braucht.";
  }

  return fallbackInterpretation(teamContext);
}

function potentialTensionsFromState(
  tensionCategory: TensionCategory,
  tensionScore: number | null
) {
  if (tensionCategory === "insufficient_data" || tensionCategory === "low") {
    return [] as DecisionLogicTension[];
  }

  const topics = [
    {
      topic: "Entscheidungstempo",
      explanation:
        "Unterschiedliche Erwartungen daran, wie schnell Entscheidungen getroffen werden sollten und wann weiteres Abwaegen sinnvoll ist.",
    },
  ];

  if (tensionScore != null && tensionScore >= 26) {
    topics.push(
      {
        topic: "Daten vs Intuition",
        explanation:
          "Spannungen koennen entstehen, wenn eine Person Entscheidungen staerker an Daten und Analysen ausrichtet, waehrend die andere ihrem Urteilsvermoegen oder Marktgefuehl mehr Gewicht gibt.",
      },
      {
        topic: "Konsens vs Verantwortungsprinzip",
        explanation:
          "Unterschiedliche Vorstellungen darueber, ob wichtige Entscheidungen gemeinsam getragen oder klar einer verantwortlichen Person zugeordnet sein sollten.",
      }
    );
  }

  if (tensionCategory === "elevated" || (tensionScore != null && tensionScore >= 40)) {
    topics.push({
      topic: "Entscheidungen unter Unsicherheit",
      explanation:
        "Abweichende Haltungen dazu, wie viel Unklarheit akzeptabel ist, bevor eine Richtung festgelegt wird.",
    });
  }

  return topics.filter(
    (entry, index, array) =>
      array.findIndex((candidate) => candidate.topic === entry.topic) === index
  );
}

function promptsForPreFounder() {
  return [
    "Wie schnell moechtet ihr strategische Entscheidungen treffen, wenn noch nicht alle Informationen vorliegen?",
    "Woran soll sich bei euch eine gute Entscheidung orientieren: eher an Daten, Erfahrung, Intuition oder Marktfeedback?",
    "Welche Entscheidungen wollt ihr gemeinsam treffen und welche sollten klar in einer Hand liegen?",
    "Wie merkt ihr, dass ihr gerade zu lange absichert oder zu schnell entscheidet?",
  ];
}

function promptsForExistingTeam() {
  return [
    "Bei welchen Entscheidungen merkt ihr im Alltag bereits Unterschiede in Tempo oder Absicherungsbeduerfnis?",
    "Wo braucht ihr mehr gemeinsame Abstimmung und wo eher klarere Verantwortung?",
    "Wie geht ihr damit um, wenn Daten, Erfahrung und Bauchgefuehl in unterschiedliche Richtungen zeigen?",
    "Welche Entscheidungsarten sollten bei euch kuenftig bewusster geregelt werden?",
  ];
}

function everydaySignals(teamContext: TeamContext) {
  return teamContext === "pre_founder"
    ? "Das kann sich im Alltag z. B. daran zeigen, dass ihr bei offenen Fragen unterschiedlich schnell entscheiden wuerdet oder verschieden viel Daten, Rueckversicherung und Bauchgefuehl braucht, bevor ihr losgeht."
    : "Spuerbar wird das haeufig dort, wo Entscheidungen unter Zeitdruck anstehen, Verantwortung verteilt werden muss oder ihr unterschiedlich einschaetzt, wann etwas genug abgesichert ist.";
}

export function buildDecisionLogicSection({
  dimensionResult,
  teamContext,
}: BuildDecisionLogicSectionInput): DecisionLogicSection {
  const safeDimension = "Entscheidungslogik" as const;

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
