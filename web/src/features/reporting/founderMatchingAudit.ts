import {
  compareFounders,
  FOUNDER_MATCHING_TEST_CASES,
  type CompareFoundersResult,
  type FounderScores,
  type InteractionType,
  type RelationType,
  type TensionType,
} from "@/features/reporting/founderMatchingEngine";
import {
  getFounderDimensionPoleTendency,
  type FounderDimensionKey,
} from "@/features/reporting/founderDimensionMeta";

type HumanReadableDimensionAudit = {
  dimension: FounderDimensionKey;
  scoreA: number | null;
  scoreB: number | null;
  difference: number | null;
  relationType: RelationType | null;
  interactionType: InteractionType | null;
  explanationKey: string | null;
  explanation: string;
};

export type HumanReadableCompareAudit = {
  meta: {
    modelType: string;
    purpose: string;
  };
  dimensionOverview: HumanReadableDimensionAudit[];
  matchStructure: {
    overallMatchScore: number | null;
    overallMeaning: string;
    alignmentScore: number | null;
    alignmentMeaning: string;
    workingCompatibilityScore: number | null;
    workingMeaning: string;
  };
  tensionMap: Array<{
    dimension: FounderDimensionKey;
    tensionType: TensionType;
    explanationKey: string;
    explanation: string;
  }>;
  summary: {
    duoDirection: string;
    everydayFit: string;
    strongestComplement: string;
    biggestTensionFields: string[];
  };
  raw: CompareFoundersResult;
};

function describePairOrientation(dimension: FounderDimensionKey, a: number | null, b: number | null) {
  const orientationA = getFounderDimensionPoleTendency(dimension, a)?.tendency ?? "center";
  const orientationB = getFounderDimensionPoleTendency(dimension, b)?.tendency ?? "center";

  if (orientationA === orientationB) {
    if (orientationA === "center") {
      return "beide liegen hier relativ balanciert";
    }
    return `beide liegen auf derselben Seite (${orientationA === "left" ? "eher links" : "eher rechts"})`;
  }

  return "beide lesen diese Achse unterschiedlich";
}

function explainRelation(
  dimension: FounderDimensionKey,
  relationType: RelationType | null,
  interactionType: InteractionType | null,
  explanationKey: string | null,
  scoreA: number | null,
  scoreB: number | null
) {
  if (!relationType || !interactionType) {
    return "Für diese Dimension liegen nicht genügend Daten vor.";
  }

  const pairOrientation = describePairOrientation(dimension, scoreA, scoreB);

  switch (explanationKey) {
    case "commitment_aligned":
      return `Beide haben ein ähnliches Priorisierungsniveau für das Startup; ${pairOrientation}. Das stabilisiert Erwartungen an Verfügbarkeit und Intensität.`;
    case "commitment_expectation_gap":
      return `Die Differenz liegt weniger in Sympathie als in unterschiedlichen Alltagsannahmen über Einsatz und Verfügbarkeit. ${pairOrientation}, deshalb braucht diese Achse klare Absprachen.`;
    case "commitment_gap_critical":
      return `Hier liegt ein harter Unterschied in der Priorisierung des Startups. ${pairOrientation}, und genau daraus wird schnell eine Fairness- und Druckfrage im Team.`;

    case "work_mode_aligned":
      return `Beide arbeiten mit ähnlicher Kopplung im Alltag. ${pairOrientation}, dadurch entstehen seltener Reibungen über Sichtbarkeit, Schleifen und Eigenraum.`;
    case "work_mode_needs_explicit_rules":
      return `Die Unterschiede sind nicht unlösbar, aber im Alltag deutlich spürbar. ${pairOrientation}, deshalb muss die Abstimmungsdichte aktiv geregelt werden.`;
    case "work_mode_gap_coordination":
      return `Der Arbeitsmodus liegt weit auseinander, ohne zwingend in offene Gegensätze zu kippen. ${pairOrientation}, dadurch wird Koordination selbst zur Daueraufgabe.`;
    case "work_mode_clash_critical":
      return `Hier treffen gegensätzliche Vorstellungen davon aufeinander, wie eng Zusammenarbeit laufen soll. ${pairOrientation}, dadurch droht Zusammenarbeit schnell als Einengung oder Entkopplung erlebt zu werden.`;

    case "directional_alignment":
      return `Beide richten Unternehmensentscheidungen in eine ähnliche Richtung aus. ${pairOrientation}, das stabilisiert Prioritäten und Grundsatzentscheidungen.`;
    case "directional_tradeoff_coordination":
      return `Die Differenz ist groß genug, dass Entscheidungen regelmäßig ausgehandelt werden müssen. ${pairOrientation}, dadurch entsteht Abstimmungsbedarf über Wirkung versus Aufbau.`;
    case "directional_alignment_conflict":
      return `Hier kollidieren zwei unterschiedliche Unternehmenslogiken. ${pairOrientation}, deshalb wird aus strategischer Differenz schnell ein Richtungsstreit.`;

    case "decision_style_alignment":
      return `Beide kommen auf ähnliche Weise zu Entscheidungen. ${pairOrientation}, das reduziert Reibung über Tempo, Begründung und Nachvollziehbarkeit.`;
    case "decision_style_moderate_complement":
      return `Die Unterschiede in der Entscheidungslogik können sich sinnvoll ergänzen. ${pairOrientation}, solange ihr klärt, wann Prüfung und wann Zuspitzung Vorrang hat.`;
    case "decision_style_strong_complement":
      return `Die Differenz in der Entscheidungslogik ist deutlich, aber nicht automatisch problematisch. ${pairOrientation}, dadurch kann ein Duo zugleich gründlicher und handlungsfähiger werden.`;

    case "risk_alignment":
      return `Beide lesen Unsicherheit ähnlich. ${pairOrientation}, das macht Tempo und Vorsicht berechenbarer.`;
    case "risk_productive_tension_moderate":
      return `Die Unterschiede in der Risikoorientierung können produktiv sein. ${pairOrientation}, wenn klar bleibt, wer bremst, wer vorgeht und wann welche Schwelle gilt.`;
    case "risk_productive_tension_strong":
      return `Hier liegt eine starke Differenz in der Risikolesart vor. ${pairOrientation}, das kann ein starkes Korrektiv sein oder dauernd Streit über zu viel und zu wenig Wagnis auslösen.`;

    case "conflict_style_alignment":
      return `Beide bearbeiten Reibung in ähnlichem Tempo und ähnlicher Form. ${pairOrientation}, das stabilisiert heikle Gespräche.`;
    case "conflict_style_coordination_gap":
      return `Die Unterschiede im Konfliktstil verlangen bewusstes Timing und Gesprächsregeln. ${pairOrientation}, sonst stauen sich Themen oder eskalieren am falschen Punkt.`;
    case "conflict_style_escalation_risk":
      return `Hier treffen gegensätzliche Konfliktrhythmen aufeinander. ${pairOrientation}, dadurch wächst das Risiko, dass Klarheit als Härte und Zurückhaltung als Ausweichen gelesen wird.`;
    default:
      return `Diese Dimension ist aktuell als ${interactionType} bei ${relationType} klassifiziert. ${pairOrientation}.`;
  }
}

function describeScoreMeaning(score: number | null, type: "overall" | "alignment" | "working") {
  if (score == null) return "Für diesen Score fehlen verwertbare Daten.";

  if (type === "overall") {
    if (score >= 80) return "Das Duo ist insgesamt gut anschlussfähig und bringt wenige harte Bruchstellen mit.";
    if (score >= 65) return "Das Duo hat eine tragfähige Basis, braucht aber an einzelnen Stellen klare Regeln.";
    if (score >= 45) return "Das Duo hat sowohl tragfähige als auch spürbar belastete Achsen; gute Zusammenarbeit hängt stark von aktiver Abstimmung ab.";
    return "Das Duo trägt mehrere harte Spannungsfelder; ohne bewusste gemeinsame Regeln wird Zusammenarbeit schnell mühsam.";
  }

  if (type === "alignment") {
    if (score >= 80) return "Auf Richtung und Grundverständnis liegt viel gemeinsame Linie.";
    if (score >= 65) return "Es gibt ausreichend gemeinsame Linie, aber nicht in allen richtungsgebenden Themen.";
    if (score >= 45) return "Die strategische Anschlussfähigkeit ist nur teilweise gegeben.";
    return "Richtung, Priorisierung oder Grundverständnis liegen sichtbar auseinander.";
  }

  if (score >= 80) return "Die alltägliche Zusammenarbeit dürfte ohne viel Reibung anlaufen.";
  if (score >= 65) return "Die Arbeitsbeziehung ist grundsätzlich gut möglich, braucht aber bewusste Koordination.";
  if (score >= 45) return "Im Alltag ist mit spürbarer Reibung zu rechnen, wenn Rollen und Arbeitsmodus nicht explizit werden.";
  return "Die tägliche Zusammenarbeit ist voraussichtlich stark belastet, wenn das Duo keine klare Arbeitsordnung aufbaut.";
}

function explainTension(entry: CompareFoundersResult["tensionMap"][number]) {
  switch (entry.explanationKey) {
    case "commitment_gap_critical":
      return "Die größte Spannung liegt in deutlich unterschiedlichen Erwartungen an Einsatz, Verfügbarkeit und Priorität des Startups.";
    case "commitment_expectation_gap":
      return "Hier entstehen Spannungen vor allem durch unterschiedliche Alltagsannahmen über Intensität und Erreichbarkeit.";
    case "work_mode_needs_explicit_rules":
      return "Die Zusammenarbeit braucht hier explizite Regeln für Sichtbarkeit, Schleifen und Eigenraum.";
    case "work_mode_gap_coordination":
      return "Der Arbeitsmodus unterscheidet sich so stark, dass Koordination selbst zum wiederkehrenden Thema wird.";
    case "work_mode_clash_critical":
      return "Hier prallen zwei gegensätzliche Vorstellungen darüber aufeinander, wie eng man im Alltag arbeiten sollte.";
    case "directional_tradeoff_coordination":
      return "Diese Spannung entsteht aus unterschiedlichen Prioritäten zwischen Marktwirkung und Aufbau.";
    case "directional_alignment_conflict":
      return "Hier droht ein Richtungsstreit darüber, woran unternehmerische Entscheidungen ausgerichtet werden.";
    case "decision_style_moderate_complement":
      return "Die Entscheidungsunterschiede können produktiv werden, wenn beide akzeptieren, dass nicht jede Entscheidung gleich entsteht.";
    case "decision_style_strong_complement":
      return "Diese starke Differenz kann ein nützliches Korrektiv sein, braucht aber ein gemeinsames Verständnis von Tempo und Begründung.";
    case "risk_productive_tension_moderate":
      return "Die unterschiedliche Schwelle für Risiko kann Entscheidungen schärfen, wenn offen ausgesprochen wird, worin das eigentliche Wagnis liegt.";
    case "risk_productive_tension_strong":
      return "Diese starke Differenz in der Risikolesart kann produktiv oder blockierend werden, je nachdem wie bewusst sie gemanagt wird.";
    case "conflict_style_coordination_gap":
      return "Hier braucht das Duo klare Regeln für Timing, Direktheit und Gesprächsform bei Reibung.";
    case "conflict_style_escalation_risk":
      return "Die Konfliktstile liegen so gegensätzlich, dass Klarheit und Sicherheit im Gespräch leicht auseinanderfallen.";
    default:
      return "Diese Spannung ist im Modell als relevantes Koordinations- oder Reibungsfeld markiert.";
  }
}

function describeStrongestComplement(result: CompareFoundersResult) {
  const complementDimension = result.dimensions.find(
    (dimension) => dimension.interactionType === "complement"
  );

  if (!complementDimension) {
    return "Dieses Duo lebt weniger von einer einzelnen starken Ergänzungsachse als von allgemeiner Anschlussfähigkeit oder expliziter Koordination.";
  }

  switch (complementDimension.dimension) {
    case "Entscheidungslogik":
      return "Die stärkste Ergänzung liegt darin, dass das Duo Prüfung und Zuspitzung unterschiedlich stark einbringt.";
    case "Risikoorientierung":
      return "Die stärkste Ergänzung liegt darin, dass das Duo Risiko unterschiedlich liest und sich dadurch gegenseitig korrigieren kann.";
    default:
      return `Die stärkste Ergänzung liegt aktuell auf ${complementDimension.dimension}.`;
  }
}

function describeDuoDirection(result: CompareFoundersResult) {
  if ((result.alignmentScore ?? 0) >= 80) {
    return "Das Duo hat viel gemeinsame Linie in Richtung und Grundverständnis.";
  }
  if ((result.alignmentScore ?? 0) >= 60) {
    return "Das Duo teilt einzelne Grundannahmen, muss aber an wichtigen Punkten bewusst ausrichten.";
  }
  return "Das Duo steht eher vor einer Richtungsfrage als vor einem bloßen Feinschliff.";
}

function describeEverydayFit(result: CompareFoundersResult) {
  if ((result.workingCompatibilityScore ?? 0) >= 80) {
    return "Im Alltag dürfte Zusammenarbeit relativ reibungsarm anlaufen.";
  }
  if ((result.workingCompatibilityScore ?? 0) >= 60) {
    return "Die Zusammenarbeit wirkt grundsätzlich machbar, hängt aber an klaren Regeln für Arbeitsmodus und Reibung.";
  }
  return "Die tägliche Zusammenarbeit ist ohne bewusste Koordination wahrscheinlich anstrengend.";
}

export function buildHumanReadableCompareAudit(
  a: FounderScores,
  b: FounderScores
): HumanReadableCompareAudit {
  const result = compareFounders(a, b);

  return {
    meta: {
      modelType: "heuristisches regelbasiertes Matching-Modell",
      purpose: "Transparenz, Auditierbarkeit und fachliche Einordnung der bestehenden Compare-Logik",
    },
    dimensionOverview: result.dimensions.map((dimension) => ({
      dimension: dimension.dimension,
      scoreA: dimension.scoreA,
      scoreB: dimension.scoreB,
      difference: dimension.difference,
      relationType: dimension.relationType,
      interactionType: dimension.interactionType,
      explanationKey: dimension.explanationKey,
      explanation: explainRelation(
        dimension.dimension,
        dimension.relationType,
        dimension.interactionType,
        dimension.explanationKey,
        dimension.scoreA,
        dimension.scoreB
      ),
    })),
    matchStructure: {
      overallMatchScore: result.overallMatchScore,
      overallMeaning: describeScoreMeaning(result.overallMatchScore, "overall"),
      alignmentScore: result.alignmentScore,
      alignmentMeaning: describeScoreMeaning(result.alignmentScore, "alignment"),
      workingCompatibilityScore: result.workingCompatibilityScore,
      workingMeaning: describeScoreMeaning(result.workingCompatibilityScore, "working"),
    },
    tensionMap: result.tensionMap.map((entry) => ({
      dimension: entry.dimension,
      tensionType: entry.tensionType,
      explanationKey: entry.explanationKey,
      explanation: explainTension(entry),
    })),
    summary: {
      duoDirection: describeDuoDirection(result),
      everydayFit: describeEverydayFit(result),
      strongestComplement: describeStrongestComplement(result),
      biggestTensionFields: result.tensionMap.map(
        (entry) => `${entry.dimension}: ${explainTension(entry)}`
      ),
    },
    raw: result,
  };
}

export function runFounderMatchingAuditExamples() {
  return {
    complementary_builders: buildHumanReadableCompareAudit(
      FOUNDER_MATCHING_TEST_CASES.complementary_builders.a,
      FOUNDER_MATCHING_TEST_CASES.complementary_builders.b
    ),
    misaligned_pressure_pair: buildHumanReadableCompareAudit(
      FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.a,
      FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.b
    ),
    balanced_but_manageable_pair: buildHumanReadableCompareAudit(
      FOUNDER_MATCHING_TEST_CASES.balanced_but_manageable_pair.a,
      FOUNDER_MATCHING_TEST_CASES.balanced_but_manageable_pair.b
    ),
    highly_similar_but_blind_spot_pair: buildHumanReadableCompareAudit(
      FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.a,
      FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.b
    ),
  };
}
