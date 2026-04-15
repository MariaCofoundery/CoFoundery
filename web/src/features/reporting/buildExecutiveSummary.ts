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

function getDimensionResult(scoringResult: TeamScoringResult, dimension: string | null) {
  if (!dimension) return null;
  return scoringResult.dimensions.find((entry) => entry.dimension === dimension) ?? null;
}

function getStrategicFocusDimension(executiveInsights: ExecutiveInsights) {
  if (
    executiveInsights.topTension?.dimension === "Unternehmenslogik" ||
    executiveInsights.topTension?.dimension === "Entscheidungslogik" ||
    executiveInsights.topTension?.dimension === "Risikoorientierung"
  ) {
    return executiveInsights.topTension.dimension;
  }

  return executiveInsights.topStrength?.dimension === "Unternehmenslogik"
    ? "Unternehmenslogik"
    : "Entscheidungslogik";
}

function getWorkingFocusDimension(executiveInsights: ExecutiveInsights) {
  if (
    executiveInsights.topTension?.dimension === "Arbeitsstruktur & Zusammenarbeit" ||
    executiveInsights.topTension?.dimension === "Commitment" ||
    executiveInsights.topTension?.dimension === "Konfliktstil"
  ) {
    return executiveInsights.topTension.dimension;
  }

  return executiveInsights.topStrength?.dimension === "Arbeitsstruktur & Zusammenarbeit"
    ? "Arbeitsstruktur & Zusammenarbeit"
    : "Commitment";
}

function headlineFromState(scoringResult: TeamScoringResult) {
  const alignmentScore = scoringResult.alignmentScore;
  const workingCompatibilityScore = scoringResult.workingCompatibilityScore;

  if (alignmentScore == null || workingCompatibilityScore == null) {
    return "Noch keine belastbare Gesamteinschaetzung";
  }

  if (scoringResult.sharedBlindSpotRisk && alignmentScore >= 60 && workingCompatibilityScore >= 60) {
    return "Viel gemeinsame Basis mit stillen Watchpoints";
  }

  if (alignmentScore >= 72 && workingCompatibilityScore >= 72) {
    return "Strategisch und operativ tragfaehige Basis";
  }

  if (alignmentScore >= 68 && workingCompatibilityScore < 60) {
    return "Strategisch nah, operativ mit Klaerungsbedarf";
  }

  if (alignmentScore < 60 && workingCompatibilityScore >= 68) {
    return "Im Alltag anschlussfaehig, strategisch mit Spannungsfeld";
  }

  if (alignmentScore < 60 && workingCompatibilityScore < 60) {
    return "Strategisch und operativ mit hohem Klaerungsbedarf";
  }

  return "Teilweise tragfaehig, aber nicht in denselben Feldern";
}

function introForContext(
  teamContext: TeamContext,
  scoringResult: TeamScoringResult
) {
  const alignmentScore = scoringResult.alignmentScore;
  const workingCompatibilityScore = scoringResult.workingCompatibilityScore;
  const executiveInsights = scoringResult.executiveInsights;
  const strengthDimension = executiveInsights.topStrength?.dimension;
  const tensionDimension = executiveInsights.topTension?.dimension ?? null;
  const complementaryDimension = executiveInsights.topComplementaryDynamic?.dimension;
  const tensionResult = getDimensionResult(scoringResult, tensionDimension);

  const fitText =
    alignmentScore == null || workingCompatibilityScore == null
      ? "Die aktuelle Datenlage erlaubt noch keine belastbare Gesamteinschaetzung eurer Zusammenarbeit."
      : alignmentScore >= 72 && workingCompatibilityScore >= 72
        ? "Strategisch und im Arbeitsalltag habt ihr eine tragfaehige gemeinsame Basis."
        : alignmentScore >= 68 && workingCompatibilityScore < 60
          ? "Strategisch seid ihr naeher beieinander als im Alltag; Reibung entsteht eher aus Zusammenarbeit als aus Richtung."
          : alignmentScore < 60 && workingCompatibilityScore >= 68
            ? "Im Alltag koennt ihr gut anschliessen, aber strategisch lest ihr zentrale Fragen noch nicht nach denselben Massstaeben."
            : alignmentScore < 60 && workingCompatibilityScore < 60
              ? "Strategische Richtung und operative Zusammenarbeit brauchen beide deutlich mehr bewusste Klaerung."
              : "Ihr habt belastbare Anknuepfungspunkte, aber nicht in denselben Feldern.";

  const strengthSentence = strengthDimension
    ? `Eine klare Staerke liegt derzeit ${dimensionPrefix(strengthDimension)}.`
    : "Einige gemeinsame Staerken sind bereits gut erkennbar.";

  const complementarySentence =
    complementaryDimension && complementaryDimension !== strengthDimension
      ? `Gerade Unterschiede ${dimensionPrefix(complementaryDimension)} koennen eine produktive Ergaenzung sein.`
      : null;

  const tensionSentence = scoringResult.sharedBlindSpotRisk
    ? tensionDimension
      ? `Besonders aufmerksam solltet ihr auf ${dimensionPrefix(tensionDimension)} schauen, weil gemeinsame Tendenzen dort leicht still mitlaufen koennen.`
      : "Gerade Felder mit hoher gemeinsamer Naehe verdienen Aufmerksamkeit, damit aus Gleichlauf kein stiller Blind Spot wird."
    : tensionDimension
      ? tensionResult?.jointState === "OPPOSITE" || tensionResult?.conflictRisk === "high"
        ? `Besonders aufmerksam solltet ihr auf die Abstimmung ${dimensionPrefix(tensionDimension)} schauen.`
        : `Besonders bewusst fuehren solltet ihr ${dimensionPrefix(tensionDimension)}, weil dort wiederkehrende Koordination noetig wird.`
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
  scoringResult: TeamScoringResult,
  teamContext: TeamContext
) {
  const executiveInsights = scoringResult.executiveInsights;
  const prompts: string[] = [];
  const sharedBlindSpotDimension = (scoringResult.sharedBlindSpotDimensions ?? [])[0] ?? null;
  const topTensionDimension = executiveInsights.topTension?.dimension ?? null;
  const topTensionResult = getDimensionResult(scoringResult, topTensionDimension);

  if (sharedBlindSpotDimension) {
    prompts.push(...promptsForDimension(sharedBlindSpotDimension).slice(0, 2));
  }

  if (
    topTensionDimension &&
    (!topTensionResult?.hasSharedBlindSpotRisk || prompts.length === 0)
  ) {
    prompts.push(...promptsForDimension(topTensionDimension).slice(0, 2));
  }

  if ((scoringResult.alignmentScore ?? 0) < 65) {
    prompts.push(...promptsForDimension(getStrategicFocusDimension(executiveInsights)).slice(0, 1));
  }

  if ((scoringResult.workingCompatibilityScore ?? 0) < 65) {
    prompts.push(...promptsForDimension(getWorkingFocusDimension(executiveInsights)).slice(0, 1));
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
  const topTensionResult = getDimensionResult(
    scoringResult,
    scoringResult.executiveInsights.topTension?.dimension ?? null
  );
  const topTensionMessage =
    scoringResult.executiveInsights.topTension == null
      ? null
      : topTensionResult?.hasSharedBlindSpotRisk
        ? `Aufmerksam beobachten solltet ihr vor allem ${dimensionPrefix(
            scoringResult.executiveInsights.topTension.dimension
          )}: ${scoringResult.executiveInsights.topTension.title}`
        : tensionMessage(scoringResult.executiveInsights.topTension);

  return {
    teamContext,
    headline: headlineFromState(scoringResult),
    summaryIntro: introForContext(teamContext, scoringResult),
    topMessages: {
      strength: strengthMessage(scoringResult.executiveInsights.topStrength),
      complementaryDynamic: complementaryMessage(scoringResult.executiveInsights.topComplementaryDynamic),
      tension: topTensionMessage,
    },
    recommendedFocus: collectRecommendedFocus(scoringResult, teamContext),
  };
}
