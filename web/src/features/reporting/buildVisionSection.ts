import {
  type DimensionResult,
  type FitCategory,
  type TensionCategory,
} from "@/features/scoring/founderScoring";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";

export type VisionSection = {
  dimension: "Vision & Unternehmenshorizont";
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
    ? "Fuer die Frage, wohin sich ein gemeinsames Unternehmen entwickeln soll, liegt derzeit noch keine tragfaehige Grundlage fuer eine gemeinsame Einschaetzung vor."
    : "Fuer die Frage, wohin sich euer Unternehmen langfristig entwickeln soll, liegt derzeit noch keine belastbare Grundlage fuer eine gemeinsame Einordnung vor.";
}

function interpretationFromFitCategory(
  fitCategory: FitCategory,
  teamContext: TeamContext
) {
  if (fitCategory === "very_high") {
    return teamContext === "pre_founder"
      ? "In der Frage, wohin sich das Unternehmen entwickeln soll, seid ihr derzeit sehr nah beieinander. Das spricht dafuer, dass ihr ein moegliches Gruenderteam auf einem aehnlichen Verstaendnis von Richtung, Zeithorizont und unternehmerischem Anspruch aufbauen koennt."
      : "In der Frage, wohin sich euer Unternehmen entwickeln soll, seid ihr derzeit sehr nah beieinander. Fuer eure bestehende Zusammenarbeit ist das ein starker Anker, weil Richtung, Zeithorizont und Anspruch gut zusammenpassen.";
  }

  if (fitCategory === "high") {
    return teamContext === "pre_founder"
      ? "Ihr schaut in eine aehnliche Richtung, auch wenn in einzelnen Punkten Unterschiede sichtbar werden. Fuer eine moegliche Zusammenarbeit ist das eine gute Voraussetzung, solange ihr offene Fragen zu Wachstum, Zeithorizont und Prioritaeten frueh besprecht."
      : "Ihr arbeitet aus einer aehnlichen Richtung heraus, auch wenn sich in einzelnen Punkten Unterschiede zeigen. Fuer eure Zusammenarbeit ist das eine gute Basis, solange ihr diese Unterschiede nicht nebenbei laufen lasst, sondern gemeinsam einordnet.";
  }

  if (fitCategory === "mixed") {
    return teamContext === "pre_founder"
      ? "In der Frage, wohin sich das Unternehmen entwickeln soll, gibt es erkennbare Unterschiede, zum Beispiel beim Wachstumstempo, beim Blick auf einen moeglichen Exit oder beim Verhaeltnis von Vision und Marktchance. Vor einer gemeinsamen Gruendung lohnt es sich, diese Punkte klar anzusprechen, bevor daraus unausgesprochene Erwartungen werden."
      : "In der Frage, wohin sich euer Unternehmen entwickeln soll, gibt es erkennbare Unterschiede, zum Beispiel bei Wachstum, Exit oder der Frage, wie stark ihr euch an Marktveraenderungen orientieren wollt. Fuer ein bestehendes Team ist das kein Ausnahmefall, aber ein Bereich, der klare gemeinsame Orientierung braucht.";
  }

  if (fitCategory === "low") {
    return teamContext === "pre_founder"
      ? "In der Frage, wohin sich das Unternehmen entwickeln soll, liegen deutliche Unterschiede vor. Wenn ihr gemeinsam gruenden wollt, solltet ihr diesen Punkt vor einer verbindlichen Zusammenarbeit sehr offen besprechen, weil hier spaeter Grundsatzkonflikte entstehen koennen."
      : "In der Frage, wohin sich euer Unternehmen entwickeln soll, liegen deutliche Unterschiede vor. Fuer ein bestehendes Team ist das ein zentraler Bereich, in dem gemeinsame Richtung, Prioritaeten und Entscheidungsgrundlagen nachgeschaerft werden sollten.";
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
        "Unterschiedliche Vorstellungen darueber, wie schnell das Unternehmen wachsen soll, koennen sich spaeter in Entscheidungen ueber Finanzierung, Teamaufbau oder Marktexpansion zeigen.",
    },
  ];

  if (tensionScore != null && tensionScore >= 26) {
    topics.push(
      {
        topic: "Exit oder langfristiger Aufbau",
        explanation:
          "Waehrend eine Person das Unternehmen moeglicherweise als langfristiges Aufbauprojekt sieht, denkt die andere staerker in Richtung Exit oder strategischem Verkauf.",
      },
      {
        topic: "Visionstreue vs Marktanpassung",
        explanation:
          "Eine Person moechte moeglicherweise staerker an der urspruenglichen Idee festhalten, waehrend die andere eher bereit ist, das Produkt oder die Strategie an Marktchancen anzupassen.",
      }
    );
  }

  if (tensionCategory === "elevated" || (tensionScore != null && tensionScore >= 40)) {
    topics.push({
      topic: "Werte vs Marktchance",
      explanation:
        "Unterschiedliche Vorstellungen darueber, welche Marktchancen man verfolgen moechte und wo persoenliche oder unternehmerische Grenzen liegen.",
    });
  }

  return topics.filter(
    (entry, index, array) => array.findIndex((candidate) => candidate.topic === entry.topic) === index
  );
}

function promptsForPreFounder() {
  return [
    "Welche Rolle soll dieses Unternehmen in fuenf Jahren in eurem Leben spielen und was waere euch dafuer wichtig?",
    "Woran wuerdet ihr frueh merken, dass ihr trotz gleicher Idee in unterschiedliche Richtungen denkt?",
    "Was ist euch wichtiger: langfristiger Aufbau, schnelle Skalierung oder die Option auf einen spaeteren Exit?",
    "An welchem Punkt sollte aus eurer Sicht die urspruengliche Vision Vorrang haben und wann ist Anpassung an den Markt sinnvoller?",
  ];
}

function promptsForExistingTeam() {
  return [
    "Welche Teile eurer urspruenglichen Vision tragen euch heute noch und was muesst ihr inzwischen gemeinsam neu bestimmen?",
    "Wie entscheidet ihr, wann eine strategische Anpassung noetig ist, ohne dass ihr eure Richtung verliert?",
    "Wo gehen eure Erwartungen an Wachstumstempo, Zeithorizont oder Exit-Perspektive derzeit am deutlichsten auseinander?",
    "Welche Entscheidungen solltet ihr kuenftig staerker daran messen, wo das Unternehmen langfristig hin soll?",
  ];
}

function everydaySignals(teamContext: TeamContext) {
  return teamContext === "pre_founder"
    ? "Das kann sich im Alltag z. B. daran zeigen, dass ihr bei Wachstumschancen unterschiedlich schnell andocken wuerdet oder frueh anders gewichtet, ob langfristiger Aufbau oder eine spaetere Exit-Option wichtiger ist."
    : "Im Alltag merkt man das oft daran, dass ihr strategische Chancen unterschiedlich einordnet oder bei Wachstum, Zeithorizont und der weiteren Richtung nicht automatisch dieselben Prioritaeten setzt.";
}

export function buildVisionSection({
  dimensionResult,
  teamContext,
}: BuildVisionSectionInput): VisionSection {
  const safeDimension = "Vision & Unternehmenshorizont" as const;

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
