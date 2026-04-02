import {
  type ExecutiveInsights,
  type ReportInsight,
  type TeamScoringResult,
} from "@/features/scoring/founderScoring";

export type TeamContext = "pre_founder" | "existing_team";

export type ExecutiveSummaryResult = {
  teamContext: TeamContext;
  headline: string;
  summaryIntro: string;
  topMessages: {
    strength: string | null;
    complementaryDynamic: string | null;
    tension: string | null;
  };
  recommendedFocus: string[];
};

type BuildExecutiveSummaryInput = {
  scoringResult: TeamScoringResult;
  teamContext: TeamContext;
};

const FALLBACK_FOCUS = [
  "Welche Erwartungen habt ihr an gemeinsame Verantwortung und Entscheidungswege?",
  "Wo braucht ihr frueh Klarheit, damit Zusammenarbeit unter Druck stabil bleibt?",
];

const FOCUS_PROMPTS_BY_DIMENSION: Record<string, string[]> = {
  Unternehmenslogik: [
    "Woran richtet ihr unternehmerische Entscheidungen aus: eher an strategischer Wirkung oder eher an Tragfähigkeit und Aufbau?",
    "Woran wuerdet ihr frueh merken, dass ihr Marktchance und Substanz nicht mehr gleich gewichtet?",
  ],
  Entscheidungslogik: [
    "Wie wollt ihr Entscheidungen treffen, wenn Tempo und Sorgfalt in Spannung geraten?",
    "Bei welchen Themen braucht ihr klare Entscheidungsrechte statt laengerer Abstimmung?",
  ],
  Risikoorientierung: [
    "Wo wollt ihr bewusst mutig sein und wo klare Sicherheitslinien ziehen?",
    "Wie nutzt ihr unterschiedliche Risikoperspektiven fuer bessere strategische Entscheidungen?",
  ],
  "Arbeitsstruktur & Zusammenarbeit": [
    "Wie eng wollt ihr im Alltag abgestimmt arbeiten und wo braucht ihr bewusst mehr Eigenraum?",
    "Wie sichtbar sollen Fortschritt, Entscheidungen und offene Punkte fuereinander sein?",
  ],
  Commitment: [
    "Welche Erwartungen habt ihr an Priorisierung, Verfuegbarkeit und Einsatzniveau im Alltag?",
    "Woran erkennt ihr frueh, wenn eure Arbeitsrealitaeten in Intensitaet oder Prioritaet auseinanderlaufen?",
  ],
  Konfliktstil: [
    "Wie wollt ihr Meinungsverschiedenheiten ansprechen, bevor sie sich verfestigen?",
    "Welche Regeln helfen euch, Spannung produktiv statt persoenlich zu verarbeiten?",
  ],
};

function dimensionPrefix(dimension: string | null) {
  return dimension ? `im Bereich ${dimension}` : "in eurer Zusammenarbeit";
}

function headlineFromScores(overallFit: number | null, overallTension: number | null) {
  if (overallFit == null || overallTension == null) {
    return "Noch keine belastbare Gesamteinschaetzung";
  }

  if (overallFit >= 85 && overallTension <= 25) {
    return "Hohe Passung mit stabiler gemeinsamer Basis";
  }

  if (overallFit >= 70 && overallTension <= 55) {
    return "Gute Grundlage mit einzelnen Klaerungsthemen";
  }

  if (overallFit >= 50) {
    return "Erkennbare Unterschiede mit bewusstem Gespraechsbedarf";
  }

  return "Unterschiedliche Arbeitslogiken mit hohem Abstimmungsbedarf";
}

function introForContext(
  teamContext: TeamContext,
  overallFit: number | null,
  overallTension: number | null,
  executiveInsights: ExecutiveInsights
) {
  const strengthDimension = executiveInsights.topStrength?.dimension;
  const tensionDimension = executiveInsights.topTension?.dimension;
  const complementaryDimension = executiveInsights.topComplementaryDynamic?.dimension;

  const fitText =
    overallFit == null
      ? "Die aktuelle Datenlage erlaubt noch keine belastbare Gesamteinschaetzung eurer Zusammenarbeit."
      : overallFit >= 85
        ? "Eure Zusammenarbeit wirkt in der Grundanlage sehr tragfaehig und klar ausgerichtet."
        : overallFit >= 70
          ? "Eure Zusammenarbeit wirkt insgesamt gut anschlussfaehig und in zentralen Punkten gut vereinbar."
          : overallFit >= 50
            ? "Eure Zusammenarbeit bringt eine erkennbare gemeinsame Basis mit, zeigt aber auch Unterschiede, die im Alltag spuerbar werden koennen."
            : "Eure Zusammenarbeit ist aktuell von deutlicheren Unterschieden gepraegt, die eine bewusste gemeinsame Einordnung brauchen.";

  const strengthSentence = strengthDimension
    ? `Eine klare Staerke liegt derzeit ${dimensionPrefix(strengthDimension)}.`
    : "Einige gemeinsame Staerken sind bereits gut erkennbar.";

  const complementarySentence =
    complementaryDimension && complementaryDimension !== strengthDimension
      ? `Gerade Unterschiede ${dimensionPrefix(complementaryDimension)} koennen eine produktive Ergaenzung sein.`
      : null;

  const tensionSentence = tensionDimension
    ? `Besonders aufmerksam solltet ihr auf die Abstimmung ${dimensionPrefix(tensionDimension)} schauen.`
    : overallTension != null && overallTension > 55
      ? "Einzelne Themen verdienen fruehzeitig eine bewusstere Abstimmung."
      : "Die wichtigsten Abstimmungsthemen wirken derzeit gut besprechbar.";

  if (teamContext === "pre_founder") {
    return [
      fitText,
      strengthSentence,
      complementarySentence,
      tensionSentence,
      "Vor einer gemeinsamen Gruendung ist jetzt vor allem relevant, welche Unterschiede ihr gut nutzen koennt und was ihr vorher klar miteinander besprecht.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    fitText,
    strengthSentence,
    complementarySentence,
    tensionSentence,
    "Fuer eure bestehende Zusammenarbeit ist jetzt besonders relevant, was euch bereits traegt und an welchen Stellen eine klarere gemeinsame Linie entlastend wirken kann.",
  ]
    .filter(Boolean)
    .join(" ");
}

function strengthMessage(insight: ReportInsight | null) {
  if (!insight) return null;
  return `Staerke eurer Zusammenarbeit liegt aktuell vor allem ${dimensionPrefix(insight.dimension)}: ${insight.title}`;
}

function complementaryMessage(insight: ReportInsight | null) {
  if (!insight) return null;
  return `Ergaenzend wirkt bei euch besonders ${dimensionPrefix(insight.dimension)}: ${insight.title}`;
}

function tensionMessage(insight: ReportInsight | null) {
  if (!insight) return null;
  return `Bewusst besprechen solltet ihr vor allem ${dimensionPrefix(insight.dimension)}: ${insight.title}`;
}

function promptsForDimension(dimension: string | null) {
  if (!dimension) return [];
  return FOCUS_PROMPTS_BY_DIMENSION[dimension] ?? [];
}

function collectRecommendedFocus(
  executiveInsights: ExecutiveInsights,
  teamContext: TeamContext
) {
  const prompts: string[] = [];

  if (executiveInsights.topTension) {
    prompts.push(...promptsForDimension(executiveInsights.topTension.dimension).slice(0, 2));
  }

  if (executiveInsights.topComplementaryDynamic) {
    const complementaryPrompts = promptsForDimension(executiveInsights.topComplementaryDynamic.dimension);
    if (complementaryPrompts.length > 0) {
      prompts.push(complementaryPrompts[complementaryPrompts.length - 1]);
    } else {
      prompts.push("Welche Unterschiede sind fuer euch produktiv und welche brauchen klare Moderation?");
    }
  }

  if (executiveInsights.topStrength) {
    prompts.push(
      teamContext === "pre_founder"
        ? `Was muesstet ihr bewusst schuetzen, damit eure aktuelle Staerke ${dimensionPrefix(
            executiveInsights.topStrength.dimension
          )} auch in der Gruendungsphase tragfaehig bleibt?`
        : `Wie koennt ihr eure aktuelle Staerke ${dimensionPrefix(
            executiveInsights.topStrength.dimension
          )} im Alltag gezielt stabil halten?`
    );
  }

  const unique = [...new Set(prompts.filter(Boolean))];
  if (unique.length >= 2) {
    return unique.slice(0, 4);
  }

  return [...new Set([...unique, ...FALLBACK_FOCUS])].slice(0, 4);
}

export function buildExecutiveSummary({
  scoringResult,
  teamContext,
}: BuildExecutiveSummaryInput): ExecutiveSummaryResult {
  const overallTension = scoringResult.overallTension;

  return {
    teamContext,
    headline: headlineFromScores(scoringResult.overallFit, overallTension),
    summaryIntro: introForContext(
      teamContext,
      scoringResult.overallFit,
      overallTension,
      scoringResult.executiveInsights
    ),
    topMessages: {
      strength: strengthMessage(scoringResult.executiveInsights.topStrength),
      complementaryDynamic: complementaryMessage(scoringResult.executiveInsights.topComplementaryDynamic),
      tension: tensionMessage(scoringResult.executiveInsights.topTension),
    },
    recommendedFocus: collectRecommendedFocus(scoringResult.executiveInsights, teamContext),
  };
}
