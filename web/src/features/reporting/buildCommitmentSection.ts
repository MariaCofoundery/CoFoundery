import {
  type DimensionResult,
  type FitCategory,
  type TensionCategory,
} from "@/features/scoring/founderScoring";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";

export type CommitmentTension = {
  topic: string;
  explanation: string;
};

export type CommitmentSection = {
  dimension: "Commitment";
  interpretation: string;
  everydaySignals: string;
  potentialTensions: CommitmentTension[];
  conversationPrompts: string[];
};

type BuildCommitmentSectionInput = {
  dimensionResult: DimensionResult | null | undefined;
  teamContext: TeamContext;
};

function fallbackInterpretation(teamContext: TeamContext) {
  return teamContext === "pre_founder"
    ? "Fuer die Frage, welchen Stellenwert das Startup im Alltag haben soll und welches Einsatzniveau ihr erwartet, liegt derzeit noch keine belastbare Grundlage vor."
    : "Fuer die Frage, wie stark das Startup im Alltag priorisiert wird und welches Einsatzniveau eure Zusammenarbeit tragen soll, liegt derzeit noch keine belastbare Grundlage vor.";
}

function interpretationFromFitCategory(
  fitCategory: FitCategory,
  teamContext: TeamContext
) {
  if (fitCategory === "very_high") {
    return teamContext === "pre_founder"
      ? "In der Frage, welchen Stellenwert das Startup im Alltag haben soll, seid ihr derzeit sehr nah beieinander. Das ist eine stabile Grundlage fuer eine moegliche Zusammenarbeit, weil Priorisierung und erwartetes Einsatzniveau aehnlich ausfallen."
      : "In der Frage, wie stark das Startup im Alltag priorisiert wird, seid ihr derzeit sehr nah beieinander. Fuer die bestehende Zusammenarbeit ist das eine stabile Basis, weil Verfuegbarkeit und Intensitaet aehnlich verstanden werden.";
  }

  if (fitCategory === "high") {
    return teamContext === "pre_founder"
      ? "Ihr bringt beim Commitment viel gemeinsame Basis mit, auch wenn sich in Prioritaet, Verfuegbarkeit oder Intensitaet Unterschiede abzeichnen. Fuer eine moegliche Zusammenarbeit ist das gut anschlussfaehig, solange diese Unterschiede frueh angesprochen werden."
      : "Ihr bringt beim Commitment viel gemeinsame Basis mit, auch wenn sich bei Prioritaet, Verfuegbarkeit oder Intensitaet Unterschiede zeigen. Fuer die Zusammenarbeit ist das gut tragfaehig, wenn Erwartungen im Alltag klar benannt bleiben.";
  }

  if (fitCategory === "mixed") {
    return teamContext === "pre_founder"
      ? "Beim Commitment zeigen sich erkennbare Unterschiede, etwa bei Priorisierung, Verfuegbarkeit oder dem erwarteten Einsatzniveau im Alltag. Vor einer gemeinsamen Zusammenarbeit lohnt es sich, darueber offen zu sprechen, bevor daraus stille Erwartungen entstehen."
      : "Beim Commitment zeigen sich erkennbare Unterschiede, etwa bei Priorisierung, Verfuegbarkeit oder dem erwarteten Einsatzniveau im Alltag. Fuer ein bestehendes Team ist das ein Bereich, in dem unausgesprochene Annahmen schnell Reibung erzeugen koennen, wenn sie nicht besprochen werden.";
  }

  if (fitCategory === "low") {
    return teamContext === "pre_founder"
      ? "Beim Commitment liegen deutliche Unterschiede vor. Das kann sich spaeter stark darauf auswirken, wie ihr Verfuegbarkeit, Intensitaet und Priorisierung im Alltag erlebt. Vor einer gemeinsamen Gruendung lohnt sich hier eine sehr offene Klaerung."
      : "Beim Commitment liegen deutliche Unterschiede vor. Im Alltag kann das Verfuegbarkeit, Intensitaet und Zusammenarbeit spuerbar beeinflussen. Fuer ein bestehendes Team ist das ein Thema, das klare Sprache und gemeinsame Erwartungen braucht.";
  }

  return fallbackInterpretation(teamContext);
}

function potentialTensionsFromState(
  tensionCategory: TensionCategory,
  tensionScore: number | null
) {
  if (tensionCategory === "insufficient_data" || tensionCategory === "low") {
    return [] as CommitmentTension[];
  }

  const topics = [
    {
      topic: "Prioritaet des Startups",
      explanation:
        "Unterschiedliche Vorstellungen darueber, welchen Stellenwert das Startup im Verhaeltnis zu anderen Lebens- oder Arbeitsthemen haben soll.",
    },
  ];

  if (tensionScore != null && tensionScore >= 26) {
    topics.push(
      {
        topic: "Einsatzniveau im Alltag",
        explanation:
          "Abweichende Erwartungen daran, wie viel Zeit, Energie und Praesenz eine Zusammenarbeit im Alltag tragen soll.",
      },
      {
        topic: "Umgang mit Belastung",
        explanation:
          "Unterschiedliche Haltungen dazu, wie intensive Phasen begrenzt, abgestimmt und wieder heruntergefahren werden.",
      }
    );
  }

  if (tensionCategory === "elevated" || (tensionScore != null && tensionScore >= 40)) {
    topics.push({
      topic: "Fokus und Nebenprojekte",
      explanation:
        "Spannungen koennen entstehen, wenn eine Person klare Priorisierung des Startups erwartet, waehrend die andere bewusst Raum fuer weitere Themen oder Projekte behaelt.",
    });
  }

  return topics.filter(
    (entry, index, array) => array.findIndex((candidate) => candidate.topic === entry.topic) === index
  );
}

function promptsForPreFounder() {
  return [
    "Welche Rolle soll das Startup aktuell in eurem Alltag und in eurem Leben spielen?",
    "Woran wuerdet ihr merken, dass eure Erwartungen an Einsatz und Verfuegbarkeit auseinanderlaufen?",
    "Wie viel Fokus auf das Unternehmen erwartet ihr voneinander und was ist dabei fuer euch beide realistisch?",
    "Wie wollt ihr mit Phasen umgehen, in denen Belastung, Energie oder Kapazitaet spuerbar auseinandergehen?",
  ];
}

function promptsForExistingTeam() {
  return [
    "An welchen Stellen merkt ihr im Alltag bereits Unterschiede in Einsatzniveau, Priorisierung oder Verfuegbarkeit?",
    "Welche unausgesprochenen Erwartungen an Verbindlichkeit gibt es vielleicht schon zwischen euch?",
    "Wie sprecht ihr darueber, wenn Belastung oder Prioritaeten sich veraendern?",
    "Was braucht ihr, damit Commitment nicht zur stillen Reibungsquelle wird?",
  ];
}

function everydaySignals(teamContext: TeamContext) {
  return teamContext === "pre_founder"
    ? "Das kann sich im Alltag z. B. daran zeigen, dass ihr unterschiedlich viel Verfuegbarkeit erwartet, dem Startup einen anderen Stellenwert im Alltag gebt oder Intensitaet in verschiedenen Phasen nicht gleich einordnet."
    : "Im Alltag merkt man das oft daran, dass Verfuegbarkeit, Einsatzniveau und Prioritaeten nicht gleich verstanden werden oder still vorausgesetzt wird, wie viel Fokus gerade selbstverstaendlich sein sollte.";
}

export function buildCommitmentSection({
  dimensionResult,
  teamContext,
}: BuildCommitmentSectionInput): CommitmentSection {
  const safeDimension = "Commitment" as const;

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
