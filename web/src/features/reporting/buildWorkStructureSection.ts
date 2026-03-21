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
    ? "Fuer die Frage, wie eng ihr im Alltag verbunden arbeiten und wie viel Abstimmung ihr laufend braucht, liegt derzeit noch keine belastbare Grundlage vor."
    : "Fuer die Frage, wie eng ihr im Alltag verbunden arbeitet und wie viel Abstimmung ihr laufend braucht, liegt derzeit noch keine belastbare Grundlage vor.";
}

function interpretationFromFitCategory(
  fitCategory: FitCategory,
  teamContext: TeamContext
) {
  if (fitCategory === "very_high") {
    return teamContext === "pre_founder"
      ? "In euren Vorstellungen davon, wie eng ihr im Alltag abgestimmt und sichtbar verbunden arbeiten wollt, seid ihr derzeit sehr nah beieinander. Das ist fuer eine moegliche Zusammenarbeit eine starke Basis, weil euer Arbeitsmodus nicht staendig neu ausgehandelt werden muss."
      : "In euren Vorstellungen davon, wie eng ihr im Alltag abgestimmt und sichtbar verbunden arbeiten wollt, seid ihr derzeit sehr nah beieinander. Fuer eure Zusammenarbeit ist das eine starke Basis, weil euer Arbeitsmodus nicht staendig neu ausgehandelt werden muss.";
  }

  if (fitCategory === "high") {
    return teamContext === "pre_founder"
      ? "Ihr bringt beim gewuenschten Arbeitsmodus viel gemeinsame Basis mit, auch wenn sich bei Abstimmungsnaehe oder Eigenraum Unterschiede zeigen. Fuer eine moegliche Zusammenarbeit ist das gut tragfaehig, wenn ihr diese Unterschiede bewusst einordnet."
      : "Ihr bringt beim gewuenschten Arbeitsmodus viel gemeinsame Basis mit, auch wenn sich bei Abstimmungsnaehe oder Eigenraum Unterschiede zeigen. Fuer die Zusammenarbeit ist das gut tragfaehig, wenn ihr diese Unterschiede bewusst einordnet.";
  }

  if (fitCategory === "mixed") {
    return teamContext === "pre_founder"
      ? "In euren Vorstellungen davon, wie eng ihr im Alltag zusammenarbeiten wollt, zeigen sich spuerbare Unterschiede. Das kann produktiv sein, wenn ihr diese Unterschiede bewusst nutzt. Ohne klare Erwartungen entstehen daraus jedoch schnell kleine Reibungen."
      : "In euren Vorstellungen davon, wie eng ihr im Alltag zusammenarbeiten wollt, zeigen sich spuerbare Unterschiede. Im Alltag kann das produktiv sein, wenn ihr diese Unterschiede bewusst nutzt. Ohne klare Erwartungen entstehen daraus jedoch schnell kleine Reibungen.";
  }

  if (fitCategory === "low") {
    return teamContext === "pre_founder"
      ? "In eurer Vorstellung davon, wie eng ihr im Alltag gekoppelt arbeiten wollt, liegen deutliche Unterschiede vor. Das betrifft Abstimmungsnaehe, Sichtbarkeit und den gewuenschten Austausch ueber laufende Arbeit. Wenn ihr gemeinsam gruenden wollt, braucht dieser Bereich frueh konkrete Regeln."
      : "In eurer Vorstellung davon, wie eng ihr im Alltag gekoppelt arbeiten wollt, liegen deutliche Unterschiede vor. Das betrifft Abstimmungsnaehe, Sichtbarkeit und den gewuenschten Austausch ueber laufende Arbeit. Fuer ein bestehendes Team ist das ein Bereich, der frueh wieder konkrete Regeln braucht.";
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
        "Unterschiedliche Erwartungen daran, wie eng ihr euch im Alltag abstimmt und wie viel laufende Rueckkopplung fuer euch noetig ist.",
    },
  ];

  if (tensionScore != null && tensionScore >= 26) {
    topics.push(
      {
        topic: "Sichtbarkeit von Fortschritt und offenen Punkten",
        explanation:
          "Spannungen koennen entstehen, wenn eine Person wichtige Zwischenstaende frueh teilen will, waehrend die andere lieber laenger eigenstaendig arbeitet, bevor etwas sichtbar wird.",
      },
      {
        topic: "Uebergaben und Rueckkopplung",
        explanation:
          "Unterschiedliche Vorstellungen darueber, wie haeufig ihr euch rueckkoppelt und wann laufende Arbeit gemeinsam nachkalibriert werden sollte.",
      }
    );
  }

  if (tensionCategory === "elevated" || (tensionScore != null && tensionScore >= 40)) {
    topics.push({
      topic: "Arbeitskopplung im Alltag",
      explanation:
        "Abweichende Erwartungen daran, wie eng ihr ueber Fortschritt, Entscheidungen und offene Punkte dauerhaft verbunden bleiben wollt.",
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
    "Wie sichtbar sollen Fortschritt, offene Punkte und Zwischenstaende fuer den jeweils anderen sein?",
    "An welchen Stellen reicht gezielte Abstimmung, und wo braucht ihr laufende Rueckkopplung?",
    "Woran wuerdet ihr merken, dass eure Zusammenarbeit zu eng oder zu lose gekoppelt ist?",
  ];
}

function promptsForExistingTeam() {
  return [
    "An welchen Stellen merkt ihr im Alltag bereits Unterschiede in Abstimmungsnaehe, Sichtbarkeit oder Eigenraum?",
    "Wo braucht ihr mehr laufende Rueckkopplung, und wo wuerde weniger Kopplung euch eher entlasten?",
    "Welche Form von Sichtbarkeit ueber Fortschritt oder offene Punkte hilft euch wirklich, und wo fuehlt sie sich eher zu eng an?",
    "Was wuerde euren gemeinsamen Arbeitsmodus operativ spuerbar leichter machen?",
  ];
}

function everydaySignals(teamContext: TeamContext) {
  return teamContext === "pre_founder"
    ? "Das kann sich im Alltag z. B. daran zeigen, dass ihr unterschiedlich oft Rueckkopplung braucht, Zwischenstaende frueher oder spaeter teilen wollt oder Zusammenarbeit verschieden eng organisiert."
    : "Im Alltag wird das oft dort sichtbar, wo unterschiedliche Erwartungen an Check-ins, Sichtbarkeit und laufenden Austausch aufeinandertreffen.";
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
