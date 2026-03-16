import {
  type DimensionResult,
  type FitCategory,
  type TensionCategory,
} from "@/features/scoring/founderScoring";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";

export type ConflictStyleTension = {
  topic: string;
  explanation: string;
};

export type ConflictStyleSection = {
  dimension: "Konfliktstil";
  interpretation: string;
  everydaySignals: string;
  potentialTensions: ConflictStyleTension[];
  conversationPrompts: string[];
};

type BuildConflictStyleSectionInput = {
  dimensionResult: DimensionResult | null | undefined;
  teamContext: TeamContext;
};

function fallbackInterpretation(teamContext: TeamContext) {
  return teamContext === "pre_founder"
    ? "Fuer die Frage, wie ihr mit Spannungen, Feedback und Meinungsverschiedenheiten umgehen wuerdet, liegt derzeit noch keine belastbare Grundlage vor."
    : "Fuer die Frage, wie ihr in eurer Zusammenarbeit mit Spannungen, Feedback und Meinungsverschiedenheiten umgeht, liegt derzeit noch keine belastbare Grundlage vor.";
}

function interpretationFromFitCategory(
  fitCategory: FitCategory,
  teamContext: TeamContext
) {
  if (fitCategory === "very_high") {
    return teamContext === "pre_founder"
      ? "In der Art, wie ihr mit Spannungen, Feedback und Meinungsverschiedenheiten umgehen wuerdet, seid ihr derzeit sehr nah beieinander. Das kann fuer ein moegliches Gruenderteam ein echter Stabilitaetsfaktor sein, weil Irritationen aehnlich gelesen und bearbeitet werden."
      : "In der Art, wie ihr mit Spannungen, Feedback und Meinungsverschiedenheiten umgeht, seid ihr derzeit sehr nah beieinander. Fuer eure bestehende Zusammenarbeit ist das ein Stabilitaetsfaktor, weil Reibung und Klaerung aehnlich verstanden werden.";
  }

  if (fitCategory === "high") {
    return teamContext === "pre_founder"
      ? "Ihr bringt im Konfliktstil viel gemeinsame Basis mit, auch wenn sich in einzelnen Punkten Unterschiede zeigen. Fuer eine moegliche Zusammenarbeit ist das gut tragfaehig, solange euch auch die Art eures Umgangs miteinander frueh klar ist."
      : "Ihr bringt im Konfliktstil viel gemeinsame Basis mit, auch wenn sich im Stil Unterschiede zeigen. Fuer die Zusammenarbeit ist das gut tragfaehig, solange ihr nicht nur Inhalte klaert, sondern auch eure Art des Umgangs miteinander im Blick behaltet.";
  }

  if (fitCategory === "mixed") {
    return teamContext === "pre_founder"
      ? "In eurem Konfliktstil zeigen sich erkennbare Unterschiede darin, wie Spannungen angesprochen und verarbeitet werden. Das kann produktiv sein, fuehrt aber leicht zu Reibung, wenn beide den eigenen Stil fuer selbstverstaendlich halten."
      : "In eurem Konfliktstil zeigen sich erkennbare Unterschiede darin, wie Spannungen angesprochen und verarbeitet werden. Im Alltag kann das produktiv sein, aber auch zu Reibung fuehren, wenn unterschiedliche Erwartungen an Timing, Direktheit oder Klaerung unausgesprochen bleiben.";
  }

  if (fitCategory === "low") {
    return teamContext === "pre_founder"
      ? "In eurem Konfliktstil liegen deutliche Unterschiede vor. Wenn ihr gemeinsam gruenden wollt, koennen Missverstaendnisse spaeter eher aus der Art des Umgangs miteinander entstehen als aus dem eigentlichen Inhalt."
      : "In eurem Konfliktstil liegen deutliche Unterschiede vor. Fuer ein bestehendes Team entsteht Missverstaendnis dann oft weniger durch das Thema selbst als durch die Art, wie Spannungen angesprochen, ausgetragen oder vermieden werden.";
  }

  return fallbackInterpretation(teamContext);
}

function potentialTensionsFromState(
  tensionCategory: TensionCategory,
  tensionScore: number | null
) {
  if (tensionCategory === "insufficient_data" || tensionCategory === "low") {
    return [] as ConflictStyleTension[];
  }

  const topics = [
    {
      topic: "Timing von Feedback",
      explanation:
        "Unterschiedliche Vorstellungen darueber, ob Probleme sofort angesprochen oder erst mit Abstand reflektiert werden sollten.",
    },
  ];

  if (tensionScore != null && tensionScore >= 26) {
    topics.push(
      {
        topic: "Direktheit im Umgang",
        explanation:
          "Eine Person bevorzugt moeglicherweise sehr klare und unmittelbare Rueckmeldungen, waehrend die andere staerker auf Ton, Kontext oder Beziehung achtet.",
      },
      {
        topic: "Umgang mit Meinungsverschiedenheiten",
        explanation:
          "Spannungen koennen entstehen, wenn eine Person Reibung als produktiv erlebt, waehrend die andere staerker auf Ruhe, Ausgleich oder Deeskalation setzt.",
      }
    );
  }

  if (tensionCategory === "elevated" || (tensionScore != null && tensionScore >= 40)) {
    topics.push({
      topic: "Fehlerkultur",
      explanation:
        "Unterschiedliche Erwartungen daran, wie offen Fehler benannt, analysiert und im Team besprochen werden sollen.",
    });
  }

  return topics.filter(
    (entry, index, array) =>
      array.findIndex((candidate) => candidate.topic === entry.topic) === index
  );
}

function promptsForPreFounder() {
  return [
    "Wie schnell moechtet ihr Spannungen oder Irritationen ansprechen?",
    "Was versteht ihr jeweils unter fairem und hilfreichem Feedback?",
    "Woran wuerdet ihr merken, dass ein Konflikt gerade nicht mehr sachlich, sondern persoenlich wird?",
    "Welche Form von Direktheit fuehlt sich fuer euch produktiv an und welche nicht?",
  ];
}

function promptsForExistingTeam() {
  return [
    "An welchen Stellen unterscheiden sich eure Erwartungen an Timing und Direktheit von Feedback bereits im Alltag?",
    "Welche Konflikte sprecht ihr frueh an und welche eher zu spaet?",
    "Wie wollt ihr damit umgehen, wenn eine Person mehr Reibung aushaelt als die andere?",
    "Was braucht ihr, damit Feedback Klarheit schafft, ohne unnoetig Beziehungsspannung aufzubauen?",
  ];
}

function everydaySignals(teamContext: TeamContext) {
  return teamContext === "pre_founder"
    ? "Das kann sich im Alltag z. B. daran zeigen, dass eine Person Irritationen sofort ansprechen wuerde, waehrend die andere erst Abstand braucht oder Direktheit sehr unterschiedlich als hilfreich erlebt wird."
    : "Spuerbar wird das haeufig dort, wo Feedback gegeben wird, kleine Irritationen frueh oder spaet angesprochen werden und ihr unterschiedlich erlebt, wie direkt Klaerung sein sollte.";
}

export function buildConflictStyleSection({
  dimensionResult,
  teamContext,
}: BuildConflictStyleSectionInput): ConflictStyleSection {
  const safeDimension = "Konfliktstil" as const;

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
