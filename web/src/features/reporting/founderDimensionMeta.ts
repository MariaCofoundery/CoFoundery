export const FOUNDER_DIMENSION_ORDER = [
  "Vision & Unternehmenshorizont",
  "Entscheidungslogik",
  "Risikoorientierung",
  "Arbeitsstruktur & Zusammenarbeit",
  "Commitment",
  "Konfliktstil",
] as const;

export type FounderDimensionKey = (typeof FOUNDER_DIMENSION_ORDER)[number];

export type FounderDimensionMeta = {
  canonicalName: FounderDimensionKey;
  shortLabel: string;
  leftPole: string;
  centerLabel: string;
  rightPole: string;
  description: string;
};

export type FounderDimensionPoleTendency = {
  tendency: "left" | "center" | "right";
  label: string;
};

// Fachliche Quelle fuer Pol-Interpretationen in Visualisierung, Report und spaeteren
// Archetypen-/Mapping-Logiken. Die Pole beschreiben gleichwertige Praeferenzrichtungen
// und enthalten bewusst keine implizite besser/schlechter-Wertung.
export const FOUNDER_DIMENSION_META: Record<FounderDimensionKey, FounderDimensionMeta> = {
  "Vision & Unternehmenshorizont": {
    canonicalName: "Vision & Unternehmenshorizont",
    shortLabel: "Vision",
    leftPole: "Exit-orientiert",
    centerLabel: "balanciert",
    rightPole: "langfristiger Aufbau",
    description:
      "Beschreibt, wie stark Richtung, Zeithorizont und unternehmerischer Anspruch eher auf Exit-Optionen oder auf langfristigen Aufbau ausgerichtet sind.",
  },
  Entscheidungslogik: {
    canonicalName: "Entscheidungslogik",
    shortLabel: "Entscheidung",
    leftPole: "analytisch",
    centerLabel: "balanciert",
    rightPole: "intuitiv",
    description:
      "Beschreibt, ob Entscheidungen eher ueber Analyse und Absicherung oder staerker ueber Urteil, Gespuer und direkte Einordnung getroffen werden.",
  },
  Risikoorientierung: {
    canonicalName: "Risikoorientierung",
    shortLabel: "Risiko",
    leftPole: "sicherheitsorientiert",
    centerLabel: "balanciert",
    rightPole: "chancenorientiert",
    description:
      "Beschreibt, wie Risiko, Unsicherheit und Wagnis eher vorsichtig abgesichert oder staerker chancenorientiert eingeordnet werden.",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    canonicalName: "Arbeitsstruktur & Zusammenarbeit",
    shortLabel: "Zusammenarbeit",
    leftPole: "autonom",
    centerLabel: "balanciert",
    rightPole: "stark abgestimmt",
    description:
      "Beschreibt, ob Zusammenarbeit eher ueber Eigenstaendigkeit und Freiraum oder ueber enge Abstimmung, Transparenz und Mitsprache organisiert wird.",
  },
  Commitment: {
    canonicalName: "Commitment",
    shortLabel: "Commitment",
    leftPole: "flexibel",
    centerLabel: "balanciert",
    rightPole: "stark fokussiert",
    description:
      "Beschreibt, welchen Stellenwert Verfuegbarkeit, Prioritaet und Fokus im Alltag der Zusammenarbeit einnehmen.",
  },
  Konfliktstil: {
    canonicalName: "Konfliktstil",
    shortLabel: "Konflikt",
    leftPole: "reflektierend",
    centerLabel: "balanciert",
    rightPole: "direkt",
    description:
      "Beschreibt, wie Spannungen, Feedback und Meinungsverschiedenheiten eher mit Abstand und Reflexion oder unmittelbarer und direkter bearbeitet werden.",
  },
};

const DIMENSION_ALIASES: Record<string, FounderDimensionKey> = {
  "vision & unternehmenshorizont": "Vision & Unternehmenshorizont",
  "vision unternehmenshorizont": "Vision & Unternehmenshorizont",
  vision: "Vision & Unternehmenshorizont",
  unternehmenshorizont: "Vision & Unternehmenshorizont",
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

export function getFounderDimensionPoleTendency(
  dimension: string,
  value: number | null
): FounderDimensionPoleTendency | null {
  const meta = getFounderDimensionMeta(dimension);
  if (!meta || value == null || !Number.isFinite(value)) {
    return null;
  }

  if (value <= 40) {
    return { tendency: "left", label: meta.leftPole };
  }

  if (value >= 60) {
    return { tendency: "right", label: meta.rightPole };
  }

  return { tendency: "center", label: meta.centerLabel };
}
