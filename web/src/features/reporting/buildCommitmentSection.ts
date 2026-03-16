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
    ? "Fuer die Frage, wie viel Verbindlichkeit, Verfuegbarkeit und Prioritaet eine gemeinsame Gruendung tragen soll, liegt derzeit noch keine belastbare Grundlage vor."
    : "Fuer die Frage, wie ihr Verbindlichkeit, Verfuegbarkeit und Prioritaeten in eurer Zusammenarbeit lebt, liegt derzeit noch keine belastbare Grundlage vor.";
}

function interpretationFromFitCategory(
  fitCategory: FitCategory,
  teamContext: TeamContext
) {
  if (fitCategory === "very_high") {
    return teamContext === "pre_founder"
      ? "In eurer Haltung zu Einsatz, Prioritaet und Verbindlichkeit seid ihr derzeit sehr nah beieinander. Das ist eine stabile Grundlage fuer eine moegliche Zusammenarbeit, weil Erwartungen an Fokus und Verlaesslichkeit aehnlich wirken."
      : "In eurer Haltung zu Einsatz, Prioritaet und Verbindlichkeit seid ihr derzeit sehr nah beieinander. Fuer die bestehende Zusammenarbeit ist das eine stabile Basis, weil Verlaesslichkeit und Einsatz im Alltag aehnlich verstanden werden.";
  }

  if (fitCategory === "high") {
    return teamContext === "pre_founder"
      ? "Ihr bringt beim Commitment viel gemeinsame Basis mit, auch wenn sich in Intensitaet, Prioritaet oder Verfuegbarkeit einzelne Unterschiede abzeichnen. Fuer eine moegliche Zusammenarbeit ist das gut anschlussfaehig, solange diese Unterschiede frueh angesprochen werden."
      : "Ihr bringt beim Commitment viel gemeinsame Basis mit, auch wenn sich bei Intensitaet, Prioritaet oder Verfuegbarkeit Unterschiede zeigen. Fuer die Zusammenarbeit ist das gut tragfaehig, wenn Erwartungen im Alltag klar benannt bleiben.";
  }

  if (fitCategory === "mixed") {
    return teamContext === "pre_founder"
      ? "Beim Commitment zeigen sich erkennbare Unterschiede, etwa bei Einsatz, Fokus oder den Erwartungen an den Alltag. Vor einer gemeinsamen Zusammenarbeit lohnt es sich, darueber offen zu sprechen, bevor daraus stille Erwartungen entstehen."
      : "Beim Commitment zeigen sich erkennbare Unterschiede, etwa bei Einsatz, Fokus oder den Erwartungen an den Alltag. Fuer ein bestehendes Team ist das ein Bereich, in dem unausgesprochene Annahmen schnell Reibung erzeugen koennen, wenn sie nicht besprochen werden.";
  }

  if (fitCategory === "low") {
    return teamContext === "pre_founder"
      ? "Beim Commitment liegen deutliche Unterschiede vor. Das kann sich spaeter stark darauf auswirken, wie ihr Tempo, Belastung, Verfuegbarkeit und Zusammenarbeit erlebt. Vor einer gemeinsamen Gruendung solltet ihr diesen Punkt sehr offen klaeren."
      : "Beim Commitment liegen deutliche Unterschiede vor. Im Alltag kann das Tempo, Belastung und Zusammenarbeit spuerbar beeinflussen. Fuer ein bestehendes Team ist das ein Thema, das klare Sprache und gemeinsame Erwartungen braucht.";
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
        "Unterschiedliche Vorstellungen darueber, welchen Stellenwert das Startup im Verhaeltnis zu Privatleben, Familie oder anderen Projekten haben soll.",
    },
  ];

  if (tensionScore != null && tensionScore >= 26) {
    topics.push(
      {
        topic: "Einsatzniveau im Alltag",
        explanation:
          "Abweichende Erwartungen daran, wie viel Zeit, Energie und Praesenz eine Zusammenarbeit dauerhaft braucht.",
      },
      {
        topic: "Umgang mit Belastung",
        explanation:
          "Unterschiedliche Haltungen dazu, wie mit intensiven Phasen, Erschoepfung oder persoenlichen Grenzen umgegangen werden soll.",
      }
    );
  }

  if (tensionCategory === "elevated" || (tensionScore != null && tensionScore >= 40)) {
    topics.push({
      topic: "Fokus und Nebenprojekte",
      explanation:
        "Spannungen koennen entstehen, wenn eine Person klare Exklusivitaet erwartet, waehrend die andere Raum fuer weitere Themen oder Projekte behalten moechte.",
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
    "Wie viel Fokus auf das Unternehmen erwartet ihr voneinander und was ist dabei realistisch?",
    "Wie wollt ihr mit Phasen umgehen, in denen Belastung, Energie oder Kapazitaet spuerbar auseinandergehen?",
  ];
}

function promptsForExistingTeam() {
  return [
    "An welchen Stellen merkt ihr im Alltag bereits Unterschiede in Einsatz, Tempo oder Verfuegbarkeit?",
    "Welche unausgesprochenen Erwartungen an Verbindlichkeit gibt es vielleicht schon zwischen euch?",
    "Wie sprecht ihr darueber, wenn Belastung oder Prioritaeten sich veraendern?",
    "Was braucht ihr, damit Commitment nicht zur stillen Reibungsquelle wird?",
  ];
}

function everydaySignals(teamContext: TeamContext) {
  return teamContext === "pre_founder"
    ? "Das kann sich im Alltag z. B. daran zeigen, dass ihr unterschiedlich viel Verfuegbarkeit erwartet, dem Startup einen anderen Stellenwert im Alltag gebt oder Fokus und Belastung nicht gleich realistisch einschaetzt."
    : "Im Alltag merkt man das oft daran, dass Verfuegbarkeit, Einsatz und Prioritaeten nicht gleich verstanden werden oder still vorausgesetzt wird, wie viel Fokus gerade selbstverstaendlich sein sollte.";
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
