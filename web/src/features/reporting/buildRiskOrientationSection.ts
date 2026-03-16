import {
  type DimensionResult,
  type FitCategory,
  type TensionCategory,
} from "@/features/scoring/founderScoring";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";

export type RiskOrientationTension = {
  topic: string;
  explanation: string;
};

export type RiskOrientationSection = {
  dimension: "Risikoorientierung";
  interpretation: string;
  everydaySignals: string;
  potentialTensions: RiskOrientationTension[];
  conversationPrompts: string[];
};

type BuildRiskOrientationSectionInput = {
  dimensionResult: DimensionResult | null | undefined;
  teamContext: TeamContext;
};

function fallbackInterpretation(teamContext: TeamContext) {
  return teamContext === "pre_founder"
    ? "Fuer die Frage, wie ihr mit Risiko, Unsicherheit und Wagnis umgehen wuerdet, liegt derzeit noch keine belastbare Grundlage vor."
    : "Fuer die Frage, wie ihr in eurer Zusammenarbeit Risiko, Unsicherheit und Wagnis einordnet, liegt derzeit noch keine belastbare Grundlage vor.";
}

function interpretationFromFitCategory(
  fitCategory: FitCategory,
  teamContext: TeamContext
) {
  if (fitCategory === "very_high") {
    return teamContext === "pre_founder"
      ? "In eurer Haltung zu Risiko und Unsicherheit seid ihr derzeit sehr nah beieinander. Das schafft fuer eine moegliche Zusammenarbeit Klarheit, weil Risiko, Tempo und Sicherheitsbeduerfnis aehnlich eingeschaetzt werden."
      : "In eurer Haltung zu Risiko und Unsicherheit seid ihr derzeit sehr nah beieinander. Fuer eure Zusammenarbeit schafft das Klarheit im Alltag, weil Risiko, Tempo und Sicherheitsbeduerfnis aehnlich eingeschaetzt werden.";
  }

  if (fitCategory === "high") {
    return teamContext === "pre_founder"
      ? "Ihr bringt in eurer Risikoorientierung viel gemeinsame Basis mit, auch wenn sich in Chancenorientierung oder Absicherungsbeduerfnis Unterschiede zeigen. Fuer eine moegliche Zusammenarbeit ist das gut tragfaehig, wenn ihr diese Unterschiede bewusst einordnet."
      : "Ihr bringt in eurer Risikoorientierung viel gemeinsame Basis mit, auch wenn sich in Chancenorientierung oder Absicherungsbeduerfnis Unterschiede zeigen. Fuer die Zusammenarbeit ist das gut tragfaehig, wenn ihr diese Unterschiede bewusst einordnet.";
  }

  if (fitCategory === "mixed") {
    return teamContext === "pre_founder"
      ? "In eurer Risikoorientierung zeigen sich spuerbar unterschiedliche Perspektiven auf Risiko und Unsicherheit. Das kann wertvoll sein, wenn eine Person Chancen staerker treibt und die andere Risiken besser absichert. Ohne bewusste Abstimmung entstehen daraus jedoch leicht Spannungen."
      : "In eurer Risikoorientierung zeigen sich spuerbar unterschiedliche Perspektiven auf Risiko und Unsicherheit. Im Alltag kann das wertvoll sein, wenn eine Person Chancen staerker treibt und die andere Risiken besser absichert. Ohne bewusste Abstimmung entstehen daraus jedoch leicht Spannungen.";
  }

  if (fitCategory === "low") {
    return teamContext === "pre_founder"
      ? "In eurer Risikoorientierung liegen deutliche Unterschiede vor. Das betrifft den Umgang mit Unsicherheit, Wachstum, Tempo und Wagnis. Wenn ihr gemeinsam gruenden wollt, sollte dieser Bereich frueh offen besprochen werden."
      : "In eurer Risikoorientierung liegen deutliche Unterschiede vor. Das betrifft den Umgang mit Unsicherheit, Wachstum, Tempo und Wagnis. Fuer ein bestehendes Team ist das ein Bereich, den ihr wieder klarer gemeinsam einordnen solltet.";
  }

  return fallbackInterpretation(teamContext);
}

function potentialTensionsFromState(
  tensionCategory: TensionCategory,
  tensionScore: number | null
) {
  if (tensionCategory === "insufficient_data" || tensionCategory === "low") {
    return [] as RiskOrientationTension[];
  }

  const topics = [
    {
      topic: "Tempo von Experimenten",
      explanation:
        "Unterschiedliche Vorstellungen darueber, wie frueh Ideen getestet oder Produkte in den Markt gegeben werden sollten.",
    },
  ];

  if (tensionScore != null && tensionScore >= 26) {
    topics.push(
      {
        topic: "Umgang mit Unsicherheit",
        explanation:
          "Abweichende Haltungen dazu, wie viel Unklarheit tragbar ist, bevor eine Entscheidung oder ein naechster Schritt sinnvoll erscheint.",
      },
      {
        topic: "Finanzielle Risikobereitschaft",
        explanation:
          "Spannungen koennen entstehen, wenn eine Person deutlich mehr finanzielles Wagnis akzeptieren wuerde als die andere.",
      }
    );
  }

  if (tensionCategory === "elevated" || (tensionScore != null && tensionScore >= 40)) {
    topics.push({
      topic: "Wachstum vs Absicherung",
      explanation:
        "Unterschiedliche Einschaetzungen dazu, wann eine Chance mutig genutzt werden sollte und wann mehr Absicherung noetig ist.",
    });
  }

  return topics.filter(
    (entry, index, array) =>
      array.findIndex((candidate) => candidate.topic === entry.topic) === index
  );
}

function promptsForPreFounder() {
  return [
    "Wie viel Unsicherheit fuehlt sich fuer euch produktiv an und ab wann wird sie zu viel?",
    "Wann sollte man eine Idee frueh im Markt testen, und wann ist mehr Absicherung sinnvoll?",
    "Welche Arten von Risiko wuerdet ihr bewusst eingehen und welche eher nicht?",
    "Woran wuerdet ihr merken, dass eine Person zu stark treibt oder die andere zu stark bremst?",
  ];
}

function promptsForExistingTeam() {
  return [
    "In welchen Situationen merkt ihr im Alltag bereits Unterschiede in Risikobereitschaft oder Sicherheitsbeduerfnis?",
    "Wo hilft euch eure unterschiedliche Perspektive und wo bremst sie euch eher aus?",
    "Wie entscheidet ihr, wann ihr mutig vorangeht und wann ihr bewusst absichert?",
    "Welche finanziellen oder strategischen Risiken solltet ihr kuenftig klarer gemeinsam einordnen?",
  ];
}

function everydaySignals(teamContext: TeamContext) {
  return teamContext === "pre_founder"
    ? "Das kann sich im Alltag z. B. daran zeigen, dass eine Person frueher testen oder live gehen wuerde, waehrend die andere erst mehr Klarheit, Daten oder finanzielle Absicherung sehen moechte."
    : "Im Alltag merkt man das oft daran, wie ihr Launches vorbereitet, Unsicherheit aushaltet oder bei Finanzierung und Wachstum unterschiedlich schnell bereit seid, ein Wagnis einzugehen.";
}

export function buildRiskOrientationSection({
  dimensionResult,
  teamContext,
}: BuildRiskOrientationSectionInput): RiskOrientationSection {
  const safeDimension = "Risikoorientierung" as const;

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
