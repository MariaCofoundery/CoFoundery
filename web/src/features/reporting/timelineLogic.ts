import {
  type CompareFoundersResult,
  type DimensionMatchResult,
} from "@/features/reporting/founderMatchingEngine";
import { type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";

export type FounderDynamicsTimelineNodeKind =
  | "tension"
  | "blind_spot"
  | "coordination_need";

export type FounderDynamicsTimelinePhaseId =
  | "start_alignment"
  | "decision_pressure"
  | "daily_collaboration"
  | "growth_complexity"
  | "load_and_recalibration";

export type FounderDynamicsTimelineGraphPhase = {
  id: FounderDynamicsTimelinePhaseId;
  title: string;
  rangeLabel: string;
  startYear: number;
  endYear: number;
};

export type FounderDynamicsTimelineNode = {
  id: string;
  phaseId: FounderDynamicsTimelinePhaseId;
  year: number;
  kind: FounderDynamicsTimelineNodeKind;
  dimension: FounderDimensionKey;
  title: string;
  description: string;
  guidingQuestion?: string;
  priorityScore: number;
  lane: "upper" | "lower";
};

type TimelineNodeCandidate = Omit<FounderDynamicsTimelineNode, "lane">;

const FALLBACK_DIMENSION_ORDER: FounderDimensionKey[] = [
  "Entscheidungslogik",
  "Unternehmenslogik",
  "Risikoorientierung",
  "Commitment",
];

const PHASE_BY_DIMENSION: Record<FounderDimensionKey, FounderDynamicsTimelinePhaseId[]> = {
  Unternehmenslogik: ["start_alignment", "growth_complexity", "load_and_recalibration"],
  Entscheidungslogik: ["decision_pressure", "daily_collaboration", "growth_complexity"],
  Risikoorientierung: ["decision_pressure", "growth_complexity"],
  Commitment: ["daily_collaboration", "load_and_recalibration"],
  "Arbeitsstruktur & Zusammenarbeit": ["daily_collaboration", "growth_complexity"],
  Konfliktstil: ["daily_collaboration", "load_and_recalibration"],
};

const PHASE_YEAR: Record<FounderDynamicsTimelinePhaseId, number> = {
  start_alignment: 0.35,
  decision_pressure: 1.05,
  daily_collaboration: 2.0,
  growth_complexity: 3.05,
  load_and_recalibration: 4.15,
};

const YEAR_OFFSET_BY_DIMENSION: Record<FounderDimensionKey, number> = {
  Unternehmenslogik: -0.12,
  Entscheidungslogik: -0.06,
  Risikoorientierung: 0.08,
  Commitment: -0.04,
  "Arbeitsstruktur & Zusammenarbeit": 0.05,
  Konfliktstil: 0.16,
};

const KIND_PRIORITY: Record<FounderDynamicsTimelineNodeKind, number> = {
  tension: 90,
  blind_spot: 72,
  coordination_need: 58,
};

const DIMENSION_PRIORITY: Record<FounderDimensionKey, number> = {
  Unternehmenslogik: 26,
  Entscheidungslogik: 24,
  Risikoorientierung: 21,
  Commitment: 20,
  "Arbeitsstruktur & Zusammenarbeit": 16,
  Konfliktstil: 14,
};

const PREFERRED_PHASE_BY_KIND: Record<
  FounderDimensionKey,
  Record<FounderDynamicsTimelineNodeKind, FounderDynamicsTimelinePhaseId>
> = {
  Unternehmenslogik: {
    tension: "start_alignment",
    blind_spot: "growth_complexity",
    coordination_need: "load_and_recalibration",
  },
  Entscheidungslogik: {
    tension: "decision_pressure",
    blind_spot: "growth_complexity",
    coordination_need: "daily_collaboration",
  },
  Risikoorientierung: {
    tension: "decision_pressure",
    blind_spot: "growth_complexity",
    coordination_need: "decision_pressure",
  },
  Commitment: {
    tension: "load_and_recalibration",
    blind_spot: "load_and_recalibration",
    coordination_need: "daily_collaboration",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    tension: "daily_collaboration",
    blind_spot: "growth_complexity",
    coordination_need: "daily_collaboration",
  },
  Konfliktstil: {
    tension: "daily_collaboration",
    blind_spot: "load_and_recalibration",
    coordination_need: "daily_collaboration",
  },
};

export const FOUNDER_DYNAMICS_TIMELINE_PHASES: FounderDynamicsTimelineGraphPhase[] = [
  {
    id: "start_alignment",
    title: "Orientierung",
    rangeLabel: "0-6 Monate",
    startYear: 0,
    endYear: 0.6,
  },
  {
    id: "decision_pressure",
    title: "Erste Entscheidungen",
    rangeLabel: "6-18 Monate",
    startYear: 0.6,
    endYear: 1.5,
  },
  {
    id: "daily_collaboration",
    title: "Zusammenarbeit im Alltag",
    rangeLabel: "1-3 Jahre",
    startYear: 1.5,
    endYear: 3,
  },
  {
    id: "growth_complexity",
    title: "Wachstum & Komplexität",
    rangeLabel: "3-4 Jahre",
    startYear: 3,
    endYear: 4,
  },
  {
    id: "load_and_recalibration",
    title: "Belastung & Re-Alignment",
    rangeLabel: "4-5 Jahre",
    startYear: 4,
    endYear: 5,
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTimelineNodeKind(
  dimension: Pick<
    DimensionMatchResult,
    "jointState" | "riskLevel" | "hasSharedBlindSpotRisk"
  >
): FounderDynamicsTimelineNodeKind | null {
  if (dimension.jointState === "OPPOSITE") {
    return "tension";
  }

  if (
    (dimension.jointState === "BOTH_HIGH" || dimension.jointState === "BOTH_LOW") &&
    dimension.hasSharedBlindSpotRisk
  ) {
    return "blind_spot";
  }

  if (dimension.jointState === "MID_HIGH" || dimension.jointState === "LOW_MID") {
    return "coordination_need";
  }

  if (dimension.jointState === "BOTH_MID" && dimension.riskLevel === "high") {
    return "tension";
  }

  return null;
}

function getPreferredPhase(
  dimension: FounderDimensionKey,
  kind: FounderDynamicsTimelineNodeKind
) {
  return PREFERRED_PHASE_BY_KIND[dimension][kind];
}

function buildNodeTitle(
  dimension: FounderDimensionKey,
  kind: FounderDynamicsTimelineNodeKind
) {
  switch (dimension) {
    case "Unternehmenslogik":
      if (kind === "tension") return "Richtung wird nach verschiedenen Maßstäben entschieden";
      if (kind === "blind_spot") return "Gemeinsame Logik könnte Kurskorrekturen zu spät auslösen";
      return "Strategische Linie braucht eine klare Prioritätsregel";
    case "Entscheidungslogik":
      if (kind === "tension") return "Entscheidungen werden nicht gleich schnell reif";
      if (kind === "blind_spot") return "Gemeinsames Entscheidungsmuster könnte zu wenig Gegenprüfung haben";
      return "Entscheidungen brauchen einen sichtbaren Übergabepunkt";
    case "Risikoorientierung":
      if (kind === "tension") return "Risikoschwellen könnten operative Entscheidungen blockieren";
      if (kind === "blind_spot") return "Gemeinsame Risikologik könnte Chancen oder Grenzen zu spät sichtbar machen";
      return "Öffnen und Absichern müssen sauber gekoppelt bleiben";
    case "Commitment":
      if (kind === "tension") return "Belastung und Verfügbarkeit könnten unterschiedlich gelesen werden";
      if (kind === "blind_spot") return "Gemeinsamer Einsatz könnte Überlast oder Unterversorgung verdecken";
      return "Commitment braucht eine operative Erwartungslinie";
    case "Arbeitsstruktur & Zusammenarbeit":
      if (kind === "tension") return "Zusammenarbeit könnte an Sichtbarkeit statt an Inhalt reiben";
      if (kind === "blind_spot") return "Gemeinsame Arbeitslogik könnte Mitsicht oder Zuständigkeit verwischen";
      return "Eigenlauf und Mitsicht brauchen dieselbe Regel";
    case "Konfliktstil":
      if (kind === "tension") return "Spannung könnte im falschen Takt geklärt werden";
      if (kind === "blind_spot") return "Gemeinsamer Konfliktstil könnte Reibung zu spät oder zu hart machen";
      return "Klärung braucht ein bewusstes Timing";
  }
}

function buildNodeDescription(
  dimension: FounderDimensionKey,
  kind: FounderDynamicsTimelineNodeKind,
  phaseId: FounderDynamicsTimelinePhaseId
) {
  switch (dimension) {
    case "Unternehmenslogik":
      if (kind === "tension") {
        return phaseId === "start_alignment"
          ? "Früh zeigt sich, ob ihr dieselbe Richtung wirklich gleich priorisiert oder nur ähnlich beschreibt."
          : "Mit wachsender Tragweite wird aus strategischem Unterschied schnell eine Führungsfrage im Alltag.";
      }
      if (kind === "blind_spot") {
        return "Wenn ihr hier beide ähnlich stark in dieselbe Richtung tendiert, fallen Gegenkräfte oft erst auf, wenn sie schon fehlen.";
      }
      return "Strategische Nähe reicht nicht aus, wenn nicht klar bleibt, welche Prioritätsregel unter Druck wirklich gilt.";
    case "Entscheidungslogik":
      if (kind === "tension") {
        return "Dieselbe Entscheidung kann für euch einen anderen Reifegrad haben. Unter Druck werden daraus Schleifen oder vorschnelle Abschlüsse.";
      }
      if (kind === "blind_spot") {
        return "Ein gemeinsames Entscheidungsniveau kann Tempo geben und zugleich dieselbe Prüflücke normal wirken lassen.";
      }
      return "Die Logik kann tragen, wenn sichtbar bleibt, wer vorbereitet, wer widerspricht und wann eine Entscheidung wirklich gilt.";
    case "Risikoorientierung":
      if (kind === "tension") {
        return "Was für eine Person noch vertretbar ist, kann für die andere schon eine Grenze sein. Das wird früh operativ spürbar.";
      }
      if (kind === "blind_spot") {
        return "Wenn ihr beide Risiko ähnlich behandelt, werden Chancen oder Bremsen leicht erst bemerkt, wenn sie schon Wirkung haben.";
      }
      return "Risikologik wirkt nur dann produktiv, wenn Öffnung und Absicherung im selben Entscheidungsrahmen bleiben.";
    case "Commitment":
      if (kind === "tension") {
        return "Unterschiedliche Einsatzlogiken werden selten sofort offen. Sichtbar werden sie meist erst unter Last oder bei neuer Priorisierung.";
      }
      if (kind === "blind_spot") {
        return "Wenn ihr Commitment ähnlich lebt, können Überlast, Unterversorgung oder implizite Erwartungen lange wie Normalität wirken.";
      }
      return "Verbindlichkeit bleibt nur dann ruhig, wenn sie operativ erklärt und nicht still vorausgesetzt wird.";
    case "Arbeitsstruktur & Zusammenarbeit":
      if (kind === "tension") {
        return "Reibung entsteht hier oft nicht aus Zielen, sondern daraus, wann etwas sichtbar sein muss und wer gerade Mitsicht braucht.";
      }
      if (kind === "blind_spot") {
        return "Eine gemeinsame Arbeitslogik kann anschlussfähig wirken und zugleich Zuständigkeit oder fehlende Mitsicht zu spät sichtbar machen.";
      }
      return "Unterschiede können tragen, wenn Eigenlauf und gemeinsame Sichtbarkeit dieselben Trigger haben.";
    case "Konfliktstil":
      if (kind === "tension") {
        return "Nicht nur das Thema, sondern das Timing der Klärung kann hier Reibung erzeugen.";
      }
      if (kind === "blind_spot") {
        return "Ein gemeinsamer Konfliktmodus kann die Oberfläche beruhigen und gleichzeitig echte Spannung länger im System halten.";
      }
      return "Klarheit bleibt robuster, wenn ihr früh markiert, was sofort und was bewusst später geklärt wird.";
  }
}

function buildGuidingQuestion(
  dimension: FounderDimensionKey,
  kind: FounderDynamicsTimelineNodeKind
) {
  switch (dimension) {
    case "Unternehmenslogik":
      return kind === "tension"
        ? "Welche Prioritätsregel gilt, wenn Reichweite und Stabilität nicht dasselbe nahelegen?"
        : kind === "blind_spot"
          ? "Woran merkt ihr, dass euer gemeinsamer Kurs gerade zu wenig Gegenprüfung hat?"
          : "Wann bleibt eine Priorität bewusst vorn, auch wenn neue Optionen attraktiv wirken?";
    case "Entscheidungslogik":
      return kind === "tension"
        ? "Was macht eine Entscheidung für euch beide wirklich reif?"
        : kind === "blind_spot"
          ? "Welche Entscheidung würdet ihr trotz schneller Einigkeit bewusst noch einmal gegenprüfen?"
          : "Wer schließt Entscheidungen sichtbar ab und woran merkt ihr das?";
    case "Risikoorientierung":
      return kind === "tension"
        ? "Ab wann wird aus noch vertretbar bei euch ein gemeinsames Nein?"
        : kind === "blind_spot"
          ? "Welche Chance oder welches Risiko müsst ihr bewusst früher sichtbar machen?"
          : "Wer öffnet eine Wette und wer zieht die Schwelle nach?";
    case "Commitment":
      return kind === "tension"
        ? "Was wird bei euch neu priorisiert, bevor Belastung still ungleich wird?"
        : kind === "blind_spot"
          ? "Welches Signal zeigt euch früh, dass Einsatz kippt statt nur hoch ist?"
          : "Was heißt bei euch realistisch verbindlich und was ausdrücklich nicht?";
    case "Arbeitsstruktur & Zusammenarbeit":
      return kind === "tension"
        ? "Was muss sichtbar sein, bevor eine andere Person überhaupt eingreifen kann?"
        : kind === "blind_spot"
          ? "Welche Themen dürfen bei euch nie nur lokal klar sein?"
          : "Welche Arbeit führst du eigenständig und welche muss früh gemeinsam sichtbar sein?";
    case "Konfliktstil":
      return kind === "tension"
        ? "Woran erkennt ihr, dass ein Thema jetzt einen eigenen Klärungsrahmen braucht?"
        : kind === "blind_spot"
          ? "Welche Reibungen dürfen bei euch nicht still mitlaufen?"
          : "Was sprecht ihr sofort an und was erst nach kurzer Sortierung?";
  }
}

function getPriorityScore(
  dimension: FounderDimensionKey,
  kind: FounderDynamicsTimelineNodeKind,
  riskLevel: DimensionMatchResult["riskLevel"],
  phaseId: FounderDynamicsTimelinePhaseId
) {
  let score = KIND_PRIORITY[kind] + DIMENSION_PRIORITY[dimension];

  if (
    kind === "tension" &&
    (dimension === "Unternehmenslogik" || dimension === "Entscheidungslogik")
  ) {
    score += 24;
  }

  if (
    kind === "blind_spot" &&
    (dimension === "Risikoorientierung" || dimension === "Commitment")
  ) {
    score += 18;
  }

  if (kind === "coordination_need" && dimension === "Arbeitsstruktur & Zusammenarbeit") {
    score += 14;
  }

  if (riskLevel === "high") score += 7;
  if (riskLevel === "medium") score += 3;
  if (phaseId === "decision_pressure" || phaseId === "daily_collaboration") score += 2;

  return score;
}

function buildTimelineNodeFromDimension(
  dimension: DimensionMatchResult
): TimelineNodeCandidate | null {
  const kind = getTimelineNodeKind(dimension);
  if (!kind) return null;

  const phaseId = getPreferredPhase(dimension.dimension, kind);
  const relevantPhases = PHASE_BY_DIMENSION[dimension.dimension];
  if (!relevantPhases.includes(phaseId)) {
    return null;
  }

  const priorityScore = getPriorityScore(
    dimension.dimension,
    kind,
    dimension.riskLevel,
    phaseId
  );

  return {
    id: `${phaseId}-${dimension.dimension}-${kind}`,
    phaseId,
    year: clamp(
      PHASE_YEAR[phaseId] + YEAR_OFFSET_BY_DIMENSION[dimension.dimension],
      0.12,
      4.88
    ),
    kind,
    dimension: dimension.dimension,
    title: buildNodeTitle(dimension.dimension, kind),
    description: buildNodeDescription(dimension.dimension, kind, phaseId),
    guidingQuestion: buildGuidingQuestion(dimension.dimension, kind),
    priorityScore,
  };
}

function buildFallbackTimelineNode(
  dimension: DimensionMatchResult
): TimelineNodeCandidate | null {
  if (!FALLBACK_DIMENSION_ORDER.includes(dimension.dimension)) {
    return null;
  }

  const phaseId = getPreferredPhase(dimension.dimension, "coordination_need");
  const relevantPhases = PHASE_BY_DIMENSION[dimension.dimension];
  if (!relevantPhases.includes(phaseId)) {
    return null;
  }

  return {
    id: `${phaseId}-${dimension.dimension}-fallback`,
    phaseId,
    year: clamp(
      PHASE_YEAR[phaseId] + YEAR_OFFSET_BY_DIMENSION[dimension.dimension],
      0.12,
      4.88
    ),
    kind: "coordination_need",
    dimension: dimension.dimension,
    title: buildNodeTitle(dimension.dimension, "coordination_need"),
    description: buildNodeDescription(
      dimension.dimension,
      "coordination_need",
      phaseId
    ),
    guidingQuestion: buildGuidingQuestion(dimension.dimension, "coordination_need"),
    priorityScore: 40 + DIMENSION_PRIORITY[dimension.dimension],
  };
}

function assignLanes(nodes: Array<Omit<FounderDynamicsTimelineNode, "lane">>) {
  const phaseCounts = new Map<FounderDynamicsTimelinePhaseId, number>();

  return nodes.map((node) => {
    const current = phaseCounts.get(node.phaseId) ?? 0;
    phaseCounts.set(node.phaseId, current + 1);

    return {
      ...node,
      lane: current % 2 === 0 ? "upper" : "lower",
    } satisfies FounderDynamicsTimelineNode;
  });
}

export function buildTimelineNodesFromDimensions(
  dimensions: DimensionMatchResult[]
): FounderDynamicsTimelineNode[] {
  const primary = dimensions
    .map(buildTimelineNodeFromDimension)
    .filter((node): node is TimelineNodeCandidate => Boolean(node))
    .sort((left, right) => {
      if (right.priorityScore !== left.priorityScore) {
        return right.priorityScore - left.priorityScore;
      }
      return left.year - right.year;
    });

  const fallback = primary.length < 2
    ? dimensions
        .filter((dimension) => !primary.some((node) => node.dimension === dimension.dimension))
        .sort(
          (left, right) =>
            FALLBACK_DIMENSION_ORDER.indexOf(left.dimension) -
            FALLBACK_DIMENSION_ORDER.indexOf(right.dimension)
        )
        .map(buildFallbackTimelineNode)
        .filter((node): node is TimelineNodeCandidate => Boolean(node))
    : [];

  const selected = [...primary, ...fallback]
    .slice(0, 5)
    .sort((left, right) => left.year - right.year);

  return assignLanes(selected);
}

export function buildFounderDynamicsTimelineNodes(
  compareResult: CompareFoundersResult
): FounderDynamicsTimelineNode[] {
  return buildTimelineNodesFromDimensions(compareResult.dimensions);
}
