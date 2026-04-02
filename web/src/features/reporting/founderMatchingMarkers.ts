import type { TeamContext } from "@/features/reporting/buildExecutiveSummary";
import type { CompareFoundersResult } from "@/features/reporting/founderMatchingEngine";
import type {
  FounderMatchingSelection,
  MatchingSelectionEntry,
} from "@/features/reporting/founderMatchingSelection";
import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";

export type FounderMatchingMarkerClass =
  | "stable_base"
  | "conditional_complement"
  | "high_rule_need"
  | "critical_clarification_point";

export type FounderMatchingWorkbookPosture =
  | "protect"
  | "define"
  | "regulate"
  | "repair"
  | "escalate_for_discussion";

export type FounderMatchingMarker = {
  markerClass: FounderMatchingMarkerClass;
  dimension: FounderDimensionKey | null;
  source:
    | "stable_base"
    | "strongest_complement"
    | "biggest_tension"
    | "blind_spot_watch";
  label: string;
  explanation: string;
  workbookLabel: string;
  workbookPosture: FounderMatchingWorkbookPosture;
  triggerReason: string;
  priority: number;
};

export type FounderMatchingMarkerSet = {
  primary: FounderMatchingMarker | null;
  secondary: FounderMatchingMarker[];
  all: FounderMatchingMarker[];
};

function dimensionPrefix(dimension: FounderDimensionKey | null) {
  return dimension ? `im Feld ${dimension}` : "in eurer Zusammenarbeit";
}

function getDimensionResult(
  compareResult: CompareFoundersResult,
  dimension: FounderDimensionKey | null | undefined
) {
  if (!dimension) return null;
  return compareResult.dimensions.find((entry) => entry.dimension === dimension) ?? null;
}

function buildStableBaseMarker(
  entry: MatchingSelectionEntry,
  teamContext: TeamContext
): FounderMatchingMarker {
  return {
    markerClass: "stable_base",
    dimension: entry.dimension,
    source: "stable_base",
    label:
      teamContext === "pre_founder"
        ? "Tragende Basis vor dem Start"
        : "Stabile Arbeitsbasis",
    explanation:
      teamContext === "pre_founder"
        ? `Hier liegt ${dimensionPrefix(entry.dimension)} eine belastbare gemeinsame Linie. Das solltet ihr vor dem Start bewusst schuetzen und nicht still als selbstverständlich behandeln.`
        : `Hier habt ihr ${dimensionPrefix(entry.dimension)} eine stabile Arbeitsbasis. Diese Achse sollte im Alltag bewusst erhalten bleiben, damit sie nicht leise erodiert.`,
    workbookLabel:
      teamContext === "pre_founder"
        ? "Im Workbook bewusst schützen"
        : "Im Workbook stabil halten",
    workbookPosture: "protect",
    triggerReason:
      "wird gesetzt, wenn eine relevante Achse im Matching als nahe und tragend erscheint",
    priority: 40,
  };
}

function buildConditionalComplementMarker(
  entry: MatchingSelectionEntry,
  teamContext: TeamContext
): FounderMatchingMarker {
  return {
    markerClass: "conditional_complement",
    dimension: entry.dimension,
    source: "strongest_complement",
    label:
      teamContext === "pre_founder"
        ? "Produktiv, wenn ihr es vorher klärt"
        : "Produktiv, wenn ihr es aktiv führt",
    explanation:
      teamContext === "pre_founder"
        ? `In ${entry.dimension} kann euer Unterschied hilfreich sein. Vor dem Start müsst ihr klären, wann er euch breiter macht und wann er euch auseinanderzieht.`
        : `In ${entry.dimension} kann euer Unterschied nützlich bleiben. Im Alltag braucht er klare Führung, sonst wird aus Ergänzung schnell Reibung.`,
    workbookLabel:
      teamContext === "pre_founder"
        ? "Vor dem Start definieren"
        : "Im Alltag aktiv führen",
    workbookPosture: teamContext === "pre_founder" ? "define" : "regulate",
    triggerReason:
      "wird gesetzt, wenn eine Achse als komplementär gelesen wird und sichtbar produktiv sein kann",
    priority: 60,
  };
}

function buildHighRuleNeedMarker(
  entry: MatchingSelectionEntry,
  teamContext: TeamContext,
  source: FounderMatchingMarker["source"]
): FounderMatchingMarker {
  const blindSpot = source === "blind_spot_watch";

  return {
    markerClass: "high_rule_need",
    dimension: entry.dimension,
    source,
    label:
      teamContext === "pre_founder"
        ? blindSpot
          ? "Früh explizit machen"
          : "Vor dem Start klar regeln"
        : blindSpot
          ? "Stillen Drift nicht laufen lassen"
          : "Hoher Regelbedarf im Alltag",
    explanation:
      blindSpot
        ? teamContext === "pre_founder"
          ? `Hier gibt es keinen lauten Konflikt ${dimensionPrefix(entry.dimension)}. Genau deshalb solltet ihr vor dem Start explizit machen, was für euch als selbstverständlich gilt.`
          : `Hier gibt es keine offene Eskalation ${dimensionPrefix(entry.dimension)}. Genau deshalb sollte dieses Feld im Alltag nicht still mitlaufen, bis schon unterschiedliche Standards gelten.`
        : teamContext === "pre_founder"
          ? `In ${entry.dimension} reicht gute Absicht nicht. Bevor ihr eng zusammenarbeitet, braucht ihr dafür klare Regeln statt impliziter Erwartungen.`
          : `In ${entry.dimension} kostet Unklarheit im Alltag Zeit, Energie oder Zug. Dieses Feld sollte nicht weiter ungeklärt mitlaufen.`,
    workbookLabel:
      blindSpot
        ? teamContext === "pre_founder"
          ? "Vor dem Start sichtbar machen"
          : "Im Workbook früh nachschärfen"
        : teamContext === "pre_founder"
          ? "Regeln vor dem Start festlegen"
          : "Regeln zeitnah nachschärfen",
    workbookPosture:
      blindSpot || teamContext === "pre_founder" ? "define" : "regulate",
    triggerReason:
      blindSpot
        ? "wird gesetzt, wenn hohe Ähnlichkeit ohne offenes Spannungsfeld in stille Drift kippen kann"
        : "wird gesetzt, wenn eine Achse nicht kritisch ist, aber ohne explizite Regeln zuverlässig Reibung erzeugt",
    priority: blindSpot ? 75 : 80,
  };
}

function buildCriticalClarificationMarker(
  entry: MatchingSelectionEntry,
  compareResult: CompareFoundersResult,
  teamContext: TeamContext
): FounderMatchingMarker {
  const dimensionResult = getDimensionResult(compareResult, entry.dimension);
  const strategicRule = dimensionResult?.appliedRules?.includes(
    "RULE_E_COMPANY_LOGIC_STRATEGIC_TENSION"
  );

  return {
    markerClass: "critical_clarification_point",
    dimension: entry.dimension,
    source: "biggest_tension",
    label:
      teamContext === "pre_founder"
        ? "Kritischer Klärungspunkt"
        : "Kritischer Eskalationspunkt",
    explanation:
      teamContext === "pre_founder"
        ? strategicRule
          ? `In ${entry.dimension} liegt keine bloße Stilfrage, sondern eine strukturelle Richtungsfrage. Das solltet ihr vor dem Start klären, statt es erst unter gemeinsamer Abhängigkeit auszutragen.`
          : `In ${entry.dimension} liegt kein Randthema, sondern ein Feld, das euch vor dem Start klar werden sollte. Sonst tragt ihr die Unklarheit erst in die Zusammenarbeit hinein.`
        : strategicRule
          ? `In ${entry.dimension} liegt keine bloße Reibung, sondern eine strukturelle Belastung für Richtung und Zusammenarbeit. Das sollte im Alltag nicht weiterlaufen, ohne dass ihr es ausdrücklich bearbeitet.`
          : `In ${entry.dimension} liegt kein kleines Abstimmungsthema, sondern eine aktive Belastung. Dieses Feld sollte nicht weiterlaufen, ohne dass ihr es gezielt bearbeitet.`,
    workbookLabel:
      teamContext === "pre_founder"
        ? "Vor dem Start ausdrücklich klären"
        : "Zeitnah als Eskalationspunkt bearbeiten",
    workbookPosture:
      teamContext === "pre_founder" ? "escalate_for_discussion" : "repair",
    triggerReason:
      "wird gesetzt, wenn eine strukturell relevante Achse als kritisch eingestuft wird oder eine harte Regel greift",
    priority: strategicRule ? 110 : 100,
  };
}

function buildPrimaryMarker(
  compareResult: CompareFoundersResult,
  selection: FounderMatchingSelection,
  teamContext: TeamContext
) {
  switch (selection.heroSelection.mode) {
    case "tension_led":
      if (selection.biggestTension?.status === "kritisch") {
        return buildCriticalClarificationMarker(
          selection.biggestTension,
          compareResult,
          teamContext
        );
      }
      if (selection.biggestTension) {
        return buildHighRuleNeedMarker(
          selection.biggestTension,
          teamContext,
          "biggest_tension"
        );
      }
      return null;
    case "coordination_led":
      return selection.biggestTension
        ? buildHighRuleNeedMarker(selection.biggestTension, teamContext, "biggest_tension")
        : null;
    case "blind_spot_watch": {
      const anchor = selection.heroSelection.biggestRisk ?? selection.stableBase ?? selection.biggestTension;
      return anchor ? buildHighRuleNeedMarker(anchor, teamContext, "blind_spot_watch") : null;
    }
    case "complement_led":
      return selection.strongestComplement
        ? buildConditionalComplementMarker(selection.strongestComplement, teamContext)
        : null;
    case "alignment_led":
    default:
      return selection.stableBase
        ? buildStableBaseMarker(selection.stableBase, teamContext)
        : null;
  }
}

function dedupeMarkers(markers: FounderMatchingMarker[]) {
  const seen = new Set<string>();
  return markers.filter((marker) => {
    const key = `${marker.markerClass}:${marker.dimension ?? "none"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildFounderMatchingMarkers(
  compareResult: CompareFoundersResult,
  selection: FounderMatchingSelection,
  teamContext: TeamContext
): FounderMatchingMarkerSet {
  const primary = buildPrimaryMarker(compareResult, selection, teamContext);
  const markers: FounderMatchingMarker[] = [];

  if (primary) {
    markers.push(primary);
  }

  if (
    selection.biggestTension &&
    selection.biggestTension.status === "kritisch" &&
    (!primary || primary.markerClass !== "critical_clarification_point")
  ) {
    markers.push(
      buildCriticalClarificationMarker(selection.biggestTension, compareResult, teamContext)
    );
  } else if (
    selection.biggestTension &&
    selection.biggestTension.status === "abstimmung_nötig" &&
    (!primary || primary.markerClass !== "high_rule_need")
  ) {
    markers.push(
      buildHighRuleNeedMarker(selection.biggestTension, teamContext, "biggest_tension")
    );
  }

  if (
    selection.strongestComplement &&
    (!primary || primary.markerClass !== "conditional_complement")
  ) {
    markers.push(
      buildConditionalComplementMarker(selection.strongestComplement, teamContext)
    );
  }

  if (selection.stableBase && (!primary || primary.markerClass !== "stable_base")) {
    markers.push(buildStableBaseMarker(selection.stableBase, teamContext));
  }

  if (
    selection.meta.highSimilarityBlindSpotRisk &&
    (!primary || primary.source !== "blind_spot_watch")
  ) {
    const anchor = selection.heroSelection.biggestRisk ?? selection.stableBase ?? selection.biggestTension;
    if (anchor) {
      markers.push(buildHighRuleNeedMarker(anchor, teamContext, "blind_spot_watch"));
    }
  }

  const all = dedupeMarkers(markers).sort((a, b) => b.priority - a.priority);
  const resolvedPrimary =
    primary && all.find((entry) => entry.markerClass === primary.markerClass && entry.dimension === primary.dimension)
      ? all.find((entry) => entry.markerClass === primary.markerClass && entry.dimension === primary.dimension) ?? null
      : all[0] ?? null;

  return {
    primary: resolvedPrimary,
    secondary: all.filter((entry) => entry !== resolvedPrimary).slice(0, 2),
    all,
  };
}
