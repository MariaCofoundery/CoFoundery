import {
  type DimensionResult,
  type FitCategory,
  type TensionCategory,
} from "@/features/scoring/founderScoring";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";

export type WorkStructureTension = {
  topic: string;
  explanation: string;
};

export type WorkStructureSection = {
  dimension: "Arbeitsstruktur & Zusammenarbeit";
  interpretation: string;
  everydaySignals: string;
  potentialTensions: WorkStructureTension[];
  conversationPrompts: string[];
};

type BuildWorkStructureSectionInput = {
  dimensionResult: DimensionResult | null | undefined;
  teamContext: TeamContext;
};

function fallbackInterpretation(teamContext: TeamContext) {
  return teamContext === "pre_founder"
    ? "Fuer die Frage, wie ihr Zusammenarbeit, Abstimmung und Verantwortungsverteilung im Alltag gestalten wuerdet, liegt derzeit noch keine belastbare Grundlage vor."
    : "Fuer die Frage, wie ihr Zusammenarbeit, Abstimmung und Verantwortungsverteilung im Alltag gestaltet, liegt derzeit noch keine belastbare Grundlage vor.";
}

function interpretationFromFitCategory(
  fitCategory: FitCategory,
  teamContext: TeamContext
) {
  if (fitCategory === "very_high") {
    return teamContext === "pre_founder"
      ? "In euren Vorstellungen von Abstimmung, Transparenz und Verantwortungsverteilung seid ihr derzeit sehr nah beieinander. Das ist fuer eine moegliche Zusammenarbeit eine starke Basis, weil vieles im Alltag nicht staendig neu ausgehandelt werden muss."
      : "In euren Vorstellungen von Abstimmung, Transparenz und Verantwortungsverteilung seid ihr derzeit sehr nah beieinander. Fuer eure Zusammenarbeit ist das eine starke Basis, weil vieles im Alltag nicht staendig neu ausgehandelt werden muss.";
  }

  if (fitCategory === "high") {
    return teamContext === "pre_founder"
      ? "Ihr bringt in der Arbeitsstruktur viel gemeinsame Basis mit, auch wenn sich bei Abstimmungsbedarf oder Eigenstaendigkeit Unterschiede zeigen. Fuer eine moegliche Zusammenarbeit ist das gut tragfaehig, wenn ihr diese Unterschiede bewusst einordnet."
      : "Ihr bringt in der Arbeitsstruktur viel gemeinsame Basis mit, auch wenn sich bei Abstimmungsbedarf oder Eigenstaendigkeit Unterschiede zeigen. Fuer die Zusammenarbeit ist das gut tragfaehig, wenn ihr diese Unterschiede bewusst einordnet.";
  }

  if (fitCategory === "mixed") {
    return teamContext === "pre_founder"
      ? "In euren Vorstellungen von Zusammenarbeit, Rollen und Transparenz zeigen sich spuerbare Unterschiede. Das kann hilfreich sein, wenn ihr diese Unterschiede bewusst nutzt. Ohne klare Erwartungen entstehen daraus jedoch schnell kleine Reibungen."
      : "In euren Vorstellungen von Zusammenarbeit, Rollen und Transparenz zeigen sich spuerbare Unterschiede. Im Alltag kann das hilfreich sein, wenn ihr diese Unterschiede bewusst nutzt. Ohne klare Erwartungen entstehen daraus jedoch schnell kleine Reibungen.";
  }

  if (fitCategory === "low") {
    return teamContext === "pre_founder"
      ? "In eurer Vorstellung von Zusammenarbeit im Alltag liegen deutliche Unterschiede vor. Das betrifft nicht nur Arbeitsstil, sondern auch Einblick, Mitsprache und Abstimmung. Wenn ihr gemeinsam gruenden wollt, braucht dieser Bereich frueh konkrete Regeln."
      : "In eurer Vorstellung von Zusammenarbeit im Alltag liegen deutliche Unterschiede vor. Das betrifft nicht nur Arbeitsstil, sondern auch Einblick, Mitsprache und Abstimmung. Fuer ein bestehendes Team ist das ein Bereich, der frueh wieder konkrete Regeln braucht.";
  }

  return fallbackInterpretation(teamContext);
}

function potentialTensionsFromState(
  tensionCategory: TensionCategory,
  tensionScore: number | null
) {
  if (tensionCategory === "insufficient_data" || tensionCategory === "low") {
    return [] as WorkStructureTension[];
  }

  const topics = [
    {
      topic: "Abstimmungsbedarf",
      explanation:
        "Unterschiedliche Erwartungen daran, wie eng ihr euch im Alltag abstimmt und wie viel Austausch fuer gute Zusammenarbeit noetig ist.",
    },
  ];

  if (tensionScore != null && tensionScore >= 26) {
    topics.push(
      {
        topic: "Autonomie in Verantwortungsbereichen",
        explanation:
          "Spannungen koennen entstehen, wenn eine Person viel Eigenstaendigkeit erwartet, waehrend die andere staerker eingebunden oder informiert sein moechte.",
      },
      {
        topic: "Transparenz ueber Arbeit und Entscheidungen",
        explanation:
          "Unterschiedliche Vorstellungen darueber, wie sichtbar Fortschritte, Entscheidungen und Zwischenschritte fuer den jeweils anderen sein sollten.",
      }
    );
  }

  if (tensionCategory === "elevated" || (tensionScore != null && tensionScore >= 40)) {
    topics.push({
      topic: "Rollen- und Zustaendigkeitsklarheit",
      explanation:
        "Abweichende Erwartungen daran, wie klar Rollen definiert sein muessen und wie flexibel Zustaendigkeiten im Alltag gehandhabt werden.",
    });
  }

  return topics.filter(
    (entry, index, array) =>
      array.findIndex((candidate) => candidate.topic === entry.topic) === index
  );
}

function promptsForPreFounder() {
  return [
    "Wie eng moechtet ihr euch im Alltag abstimmen, ohne euch gegenseitig auszubremsen?",
    "Welche Bereiche sollten klar in einer Hand liegen, und wo ist gemeinsame Mitsprache wichtig?",
    "Wie viel Einblick braucht ihr jeweils in die Arbeit des anderen, um Vertrauen und Orientierung zu behalten?",
    "Woran wuerdet ihr merken, dass eure Zusammenarbeit zu eng oder zu lose organisiert ist?",
  ];
}

function promptsForExistingTeam() {
  return [
    "An welchen Stellen merkt ihr im Alltag bereits Unterschiede in Abstimmung, Transparenz oder Eigenstaendigkeit?",
    "Wo braucht ihr mehr Klarheit in Rollen und Zustaendigkeiten und wo eher mehr Flexibilitaet?",
    "Welche Form von Einblick oder Mitsprache ist fuer euch hilfreich, und wo wird sie eher als Eingriff erlebt?",
    "Was wuerde eure Zusammenarbeit operativ spuerbar leichter machen?",
  ];
}

function everydaySignals(teamContext: TeamContext) {
  return teamContext === "pre_founder"
    ? "Das kann sich im Alltag z. B. daran zeigen, dass ihr unterschiedlich viel Abstimmung braucht, Rollen frueher oder spaeter festziehen wuerdet oder nicht gleich viel Einblick in die Arbeit des anderen erwartet."
    : "Im Alltag wird das oft dort sichtbar, wo Aufgaben verteilt werden, Mitsprache erwartet wird oder unterschiedlich erlebt wird, wie viel Abstimmung hilfreich und wie viel eher bremsend ist.";
}

export function buildWorkStructureSection({
  dimensionResult,
  teamContext,
}: BuildWorkStructureSectionInput): WorkStructureSection {
  const safeDimension = "Arbeitsstruktur & Zusammenarbeit" as const;

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
