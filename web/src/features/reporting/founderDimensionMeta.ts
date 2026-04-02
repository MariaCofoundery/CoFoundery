import {
  getOrderedRegistryDimensions,
  getRegistryDimension,
  type DimensionId,
} from "@/features/scoring/founderCompatibilityRegistry";

const CANONICAL_FOUNDER_DIMENSION_KEYS = [
  "Unternehmenslogik",
  "Entscheidungslogik",
  "Arbeitsstruktur & Zusammenarbeit",
  "Commitment",
  "Risikoorientierung",
  "Konfliktstil",
] as const;

export type FounderDimensionKey = (typeof CANONICAL_FOUNDER_DIMENSION_KEYS)[number];

const CANONICAL_FOUNDER_DIMENSION_KEY_SET = new Set<string>(CANONICAL_FOUNDER_DIMENSION_KEYS);

const CANONICAL_TO_REGISTRY_DIMENSION_ID: Record<FounderDimensionKey, DimensionId> = {
  Unternehmenslogik: "company_logic",
  Entscheidungslogik: "decision_logic",
  "Arbeitsstruktur & Zusammenarbeit": "work_structure",
  Commitment: "commitment",
  Risikoorientierung: "risk_orientation",
  Konfliktstil: "conflict_style",
};

// Runtime-Reihenfolge kommt ab v2 aus der Registry. Die Pol-Interpretation bleibt
// vorerst noch in dieser Datei, bis die Legacy-Scoring-/Questionnaire-Pfade auf die
// Registry-Semantik umgestellt sind.
export const FOUNDER_DIMENSION_ORDER: FounderDimensionKey[] = getOrderedRegistryDimensions().map(
  (dimension) => {
    if (!CANONICAL_FOUNDER_DIMENSION_KEY_SET.has(dimension.dimensionLabel)) {
      throw new Error(`unknown_founder_dimension_label:${dimension.dimensionLabel}`);
    }

    return dimension.dimensionLabel as FounderDimensionKey;
  }
);

function getRegistryPoleLabelsForDimension(dimension: FounderDimensionKey) {
  const registryDimension = getRegistryDimension(CANONICAL_TO_REGISTRY_DIMENSION_ID[dimension]);
  if (!registryDimension) {
    throw new Error(`missing_founder_registry_dimension:${dimension}`);
  }

  return {
    left: registryDimension.leftPoleLabel,
    right: registryDimension.rightPoleLabel,
  };
}

export type FounderDimensionMeta = {
  canonicalName: FounderDimensionKey;
  shortLabel: string;
  uiLeftPole: string;
  reportLeftPole: string;
  centerLabel: string;
  uiRightPole: string;
  reportRightPole: string;
  description: string;
};

export type FounderDimensionPoleTendency = {
  tendency: "left" | "center" | "right";
  label: string;
};

export type FounderDimensionPoleContext = "ui" | "report";

// Fachliche Quelle fuer Pol-Interpretationen in Visualisierung, Report und spaeteren
// Archetypen-/Mapping-Logiken. Die Pole beschreiben gleichwertige Praeferenzrichtungen
// und enthalten bewusst keine implizite besser/schlechter-Wertung.
export const FOUNDER_DIMENSION_META: Record<FounderDimensionKey, FounderDimensionMeta> = {
  Unternehmenslogik: {
    canonicalName: "Unternehmenslogik",
    shortLabel: "Unternehmenslogik",
    uiLeftPole: "substanzorientiert",
    reportLeftPole: getRegistryPoleLabelsForDimension("Unternehmenslogik").left,
    centerLabel: "balanciert",
    uiRightPole: "hebelorientiert",
    reportRightPole: getRegistryPoleLabelsForDimension("Unternehmenslogik").right,
    description:
      "Beschreibt, woran unternehmerische Entscheidungen ausgerichtet werden: eher an Substanz, Aufbau und langfristiger Tragfähigkeit oder eher an Chancen, Hebeln und strategischer Reichweite.",
  },
  Entscheidungslogik: {
    canonicalName: "Entscheidungslogik",
    shortLabel: "Entscheidung",
    uiLeftPole: "analytisch",
    reportLeftPole: getRegistryPoleLabelsForDimension("Entscheidungslogik").left,
    centerLabel: "balanciert",
    uiRightPole: "intuitiv",
    reportRightPole: getRegistryPoleLabelsForDimension("Entscheidungslogik").right,
    description:
      "Beschreibt, ob Entscheidungen eher ueber Analyse und Absicherung oder staerker ueber Urteil, Gespuer und direkte Einordnung getroffen werden.",
  },
  Risikoorientierung: {
    canonicalName: "Risikoorientierung",
    shortLabel: "Risiko",
    uiLeftPole: "sicherheitsorientiert",
    reportLeftPole: getRegistryPoleLabelsForDimension("Risikoorientierung").left,
    centerLabel: "balanciert",
    uiRightPole: "unsicherheitsbereit",
    reportRightPole: getRegistryPoleLabelsForDimension("Risikoorientierung").right,
    description:
      "Beschreibt, wie Risiko, Unsicherheit und Wagnis eher vorsichtig abgesichert oder staerker als vertretbare Unsicherheit eingeordnet werden.",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    canonicalName: "Arbeitsstruktur & Zusammenarbeit",
    shortLabel: "Abstimmung",
    uiLeftPole: "autonom",
    reportLeftPole: getRegistryPoleLabelsForDimension("Arbeitsstruktur & Zusammenarbeit").left,
    centerLabel: "balanciert",
    uiRightPole: "abgestimmt",
    reportRightPole: getRegistryPoleLabelsForDimension("Arbeitsstruktur & Zusammenarbeit").right,
    description:
      "Beschreibt, wie autonom oder eng abgestimmt jemand im Alltag mit anderen arbeiten will: eher ueber klare Zustaendigkeiten und gezielte Abstimmung oder eher ueber laufenden Austausch und ein gemeinsames Bild der Arbeit.",
  },
  Commitment: {
    canonicalName: "Commitment",
    shortLabel: "Commitment",
    uiLeftPole: "klar begrenzt",
    reportLeftPole: getRegistryPoleLabelsForDimension("Commitment").left,
    centerLabel: "balanciert",
    uiRightPole: "hoch priorisiert",
    reportRightPole: getRegistryPoleLabelsForDimension("Commitment").right,
    description:
      "Beschreibt, wie stark das Startup im Alltag priorisiert wird und welches Einsatzniveau eine Person fuer sich und das Team erwartet.",
  },
  Konfliktstil: {
    canonicalName: "Konfliktstil",
    shortLabel: "Konflikt",
    uiLeftPole: "sortierend",
    reportLeftPole: getRegistryPoleLabelsForDimension("Konfliktstil").left,
    centerLabel: "balanciert",
    uiRightPole: "direkt",
    reportRightPole: getRegistryPoleLabelsForDimension("Konfliktstil").right,
    description:
      "Beschreibt, wie Spannungen, Feedback und Meinungsverschiedenheiten eher erst sortiert oder unmittelbarer und direkter bearbeitet werden.",
  },
};

const DIMENSION_ALIASES: Record<string, FounderDimensionKey> = {
  "unternehmenslogik": "Unternehmenslogik",
  "unternehmens logik": "Unternehmenslogik",
  "vision & unternehmenshorizont": "Unternehmenslogik",
  "vision unternehmenshorizont": "Unternehmenslogik",
  vision: "Unternehmenslogik",
  unternehmenshorizont: "Unternehmenslogik",
  entscheidungslogik: "Entscheidungslogik",
  entscheidung: "Entscheidungslogik",
  entscheidungen: "Entscheidungslogik",
  risikoorientierung: "Risikoorientierung",
  risiko: "Risikoorientierung",
  "arbeitsstruktur & zusammenarbeit": "Arbeitsstruktur & Zusammenarbeit",
  "arbeitsstruktur zusammenarbeit": "Arbeitsstruktur & Zusammenarbeit",
  zusammenarbeit: "Arbeitsstruktur & Zusammenarbeit",
  arbeitsstruktur: "Arbeitsstruktur & Zusammenarbeit",
  commitment: "Commitment",
  konfliktstil: "Konfliktstil",
  konflikt: "Konfliktstil",
};

function normalizeDimensionKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getFounderDimensionMeta(dimension: string): FounderDimensionMeta | null {
  const normalized = normalizeDimensionKey(dimension);
  const canonicalName = DIMENSION_ALIASES[normalized];
  return canonicalName ? FOUNDER_DIMENSION_META[canonicalName] : null;
}

export function requireFounderDimensionMeta(dimension: string): FounderDimensionMeta {
  const meta = getFounderDimensionMeta(dimension);
  if (!meta) {
    throw new Error(`unknown_founder_dimension_meta:${dimension}`);
  }

  return meta;
}

export function getFounderDimensionPoleLabels(
  dimension: string,
  context: FounderDimensionPoleContext = "report"
) {
  const meta = getFounderDimensionMeta(dimension);
  if (!meta) {
    return null;
  }

  if (context === "ui") {
    return {
      left: meta.uiLeftPole,
      center: meta.centerLabel,
      right: meta.uiRightPole,
    };
  }

  return {
    left: meta.reportLeftPole,
    center: meta.centerLabel,
    right: meta.reportRightPole,
  };
}

export function getFounderDimensionPoleTendency(
  dimension: string,
  value: number | null,
  context: FounderDimensionPoleContext = "report"
): FounderDimensionPoleTendency | null {
  const poles = getFounderDimensionPoleLabels(dimension, context);
  if (!poles || value == null || !Number.isFinite(value)) {
    return null;
  }

  if (value <= 40) {
    return { tendency: "left", label: poles.left };
  }

  if (value >= 60) {
    return { tendency: "right", label: poles.right };
  }

  return { tendency: "center", label: poles.center };
}
