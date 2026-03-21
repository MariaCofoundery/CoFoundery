import { buildChallengesFromScores } from "@/features/reporting/challengeTextBuilder";
import { buildComplementsFromScores } from "@/features/reporting/complementTextBuilder";
import { buildHeroTextFromScores } from "@/features/reporting/heroTextBuilder";
import { buildPatternsFromScores } from "@/features/reporting/patternTextBuilder";
import {
  runSelfReportAudit,
  SELF_REPORT_SELECTION_DEBUG_CASES,
} from "@/features/reporting/selfReportSelection";
import type { SelfAlignmentReport } from "@/features/reporting/selfReportTypes";

type AuditDimension = ReturnType<typeof runSelfReportAudit>["dimensions"][number];
type AuditDecision = {
  dimensionName: string;
  reason?: string | null;
  status?: string;
};

export type HumanReadableAuditReport = {
  meta: {
    inputShape: string;
    balancedProfile: boolean;
    pathExplanation: string;
  };
  scoreOverview: Array<{
    name: string;
    rawScore: number;
    orientation: string;
    orientationStrength: number;
    strengthBand: string;
    zone: number;
    explanation: string;
  }>;
  frictionOverview: Array<{
    name: string;
    frictionScore: number;
    frictionReason: string;
    socialImpactWeight: number;
    coordinationRiskWeight: number;
    explanation: string;
  }>;
  selectionLogic: {
    hero: {
      primarySignal: null | { dimension: string; why: string };
      workModeSignal: null | { dimension: string; why: string };
      tensionCarrier: null | { dimension: string; why: string };
    };
    patterns: {
      allCandidates: Array<{ dimension: string; explanation: string }>;
      removed: Array<{ dimension: string; explanation: string }>;
      final: Array<{ dimension: string; explanation: string }>;
    };
    challenges: {
      path: string;
      final: Array<{ dimension: string; explanation: string }>;
    };
    complement: {
      counterweight: null | { dimension: string; why: string };
      regulator: null | { dimension: string; why: string };
      rhythmPartner: null | { dimension: string; why: string };
    };
  };
  textLinking: {
    hero: Array<{ placement: string; dimension: string; text: string }>;
    patterns: Array<{ placement: string; dimension: string; title: string }>;
    challenges: Array<{ placement: string; dimension: string; title: string }>;
    complements: Array<{ placement: string; role: string; dimension: string; title: string }>;
  };
  renderedText: {
    hero: string;
    patterns: ReturnType<typeof buildPatternsFromScores>;
    challenges: ReturnType<typeof buildChallengesFromScores>;
    complements: ReturnType<typeof buildComplementsFromScores>;
  };
  summary: {
    dominantProfileSignal: string;
    biggestFrictionSource: string;
    typicalComplementLogic: string;
  };
};

function describeStrength(dimension: AuditDimension) {
  const orientationLabel =
    dimension.orientation === "balanced"
      ? "balanciert"
      : dimension.orientation === "left"
        ? "links"
        : "rechts";

  if (dimension.strengthBand === "clear") {
    return `→ klar ${orientationLabel} ausgeprägt`;
  }

  if (dimension.strengthBand === "moderate") {
    return `→ eher ${orientationLabel} ausgeprägt`;
  }

  return "→ eher balanciert";
}

function explainFriction(dimension: AuditDimension) {
  switch (dimension.frictionReason) {
    case "clear_pole":
      return "Diese Dimension erzeugt Reibung, weil sie klar ausgeprägt ist und starke Auswirkungen auf Zusammenarbeit hat.";
    case "moderate_pole_dominant":
      return "Diese Dimension erzeugt Reibung, weil trotz mittlerer Ausprägung noch eine gut spürbare Präferenz im Alltag erkennbar bleibt.";
    case "moderate_coordination_risk":
      return "Diese Dimension erzeugt Reibung, weil sie nicht eindeutig festgelegt ist und dadurch im Alltag mehr Abstimmung verlangt.";
    case "open_coordination_field":
      return "Diese Dimension erzeugt Reibung, weil sie offen ist und im Alltag leicht unterschiedliche Erwartungen auslöst, wenn nichts ausdrücklich geklärt wird.";
    default:
      return "Diese Dimension trägt Reibung, weil sie im Alltag Zusammenarbeit und Abstimmung spürbar beeinflusst.";
  }
}

function explainSelectionReason(reason: string | null | undefined) {
  if (!reason) return "ohne zusätzliche Begründung";
  if (reason === "highest_clear_dimension_by_signal_priority") {
    return "gewählt als stärkste klar ausgeprägte Dimension";
  }
  if (reason === "highest_moderate_dimension_by_signal_priority") {
    return "gewählt als stärkste moderate Dimension";
  }
  if (reason === "fallback_highest_signal_priority") {
    return "gewählt als stärkstes verbleibendes Signal";
  }
  if (reason === "strongest_signal_from_other_family") {
    return "gewählt als stärkstes Signal aus einer anderen Familie";
  }
  if (reason === "highest_non_redundant_friction_candidate_in_balanced_path") {
    return "gewählt als stärkste Reibungsquelle im balancierten Profilpfad";
  }
  if (reason.startsWith("highest_non_redundant_friction_candidate:")) {
    return "gewählt als stärkster nicht redundanter Reibungsträger";
  }
  if (reason === "highest_open_tension_in_balanced_profile") {
    return "gewählt, weil dieses balancierte Profil hier die meiste offene Abstimmungsspannung trägt";
  }
  if (reason === "first_non_redundant_open_tension_candidate_from_other_family") {
    return "gewählt als nächstes offenes Signal aus einer anderen Familie";
  }
  if (reason === "counterweight_from_primary_signal") {
    return "dieselbe Dimension liefert den funktionalen Ausgleich zum dominanten Profilsignal";
  }
  if (reason === "preferred_tension_carrier_as_regulator") {
    return "gewählt, weil dieser Bereich Reibung trägt und deshalb besonders gut regulierend ergänzt";
  }
  if (reason === "first_non_redundant_high_social_impact_friction_candidate") {
    return "gewählt als nächster Reibungsbereich mit hoher sozialer Wirkung";
  }
  if (reason === "preferred_work_mode_signal_as_rhythm_partner") {
    return "gewählt, weil dieses Signal den täglichen Arbeitsmodus am besten ergänzt";
  }
  if (reason === "preferred_work_mode_signal_as_balanced_rhythm_partner") {
    return "gewählt, weil dieses Signal im balancierten Profil den Arbeitsrhythmus am besten stabilisiert";
  }
  if (reason === "first_functionally_distinct_balanced_regulator_candidate") {
    return "gewählt als funktional anderer Regulator im balancierten Profil";
  }
  if (reason === "first_functionally_distinct_balanced_rhythm_candidate") {
    return "gewählt als funktional anderer Rhythmuspartner im balancierten Profil";
  }
  if (reason === "seeded_from_primary_signal") {
    return "vom Primärsignal aus direkt in diesen Abschnitt übernommen";
  }
  if (reason === "selected_for_pattern_section") {
    return "final für die Muster-Auswahl übernommen";
  }
  if (reason === "selected_for_challenge_section") {
    return "final für die Herausforderungen-Auswahl übernommen";
  }
  if (reason === "balanced_switcher_candidate") {
    return "gewählt als balanciertes Umschaltsignal";
  }
  if (reason === "best_remaining_family_candidate") {
    return "gewählt als bestes verbleibendes Signal einer noch freien Familie";
  }
  if (reason === "first_non_redundant_candidate") {
    return "gewählt als erster passender nicht redundanter Kandidat";
  }
  if (reason.startsWith("same_family_as_selected:")) {
    return "entfernt, weil diese Familie bereits vertreten war";
  }
  if (reason.startsWith("same_family_as_required_reference:")) {
    return "entfernt, weil bewusst eine andere Familie gesucht wurde";
  }
  if (reason.startsWith("same_duplication_group_as:")) {
    return "entfernt, weil dieselbe inhaltliche Dopplungsgruppe bereits vertreten war";
  }
  if (reason.startsWith("already_selected:")) {
    return "entfernt, weil diese Dimension bereits ausgewählt war";
  }
  if (reason.startsWith("same_dimension_as_selected:")) {
    return "entfernt, weil dieselbe Dimension bereits für eine andere Rolle genutzt wurde";
  }
  if (reason === "explicitly_excluded_dimension") {
    return "entfernt, weil diese Dimension an dieser Stelle bewusst ausgeschlossen wurde";
  }
  if (reason === "pattern_slots_already_filled") {
    return "entfernt, weil die drei Pattern-Slots bereits belegt waren";
  }
  if (reason.startsWith("signal_priority_rank:")) {
    return "nur Kandidat in der Rangfolge nach Signalstärke";
  }
  if (reason.startsWith("other_family_signal_priority_rank:")) {
    return "nur Kandidat in der Rangfolge anderer Familien";
  }
  if (reason.startsWith("open_tension_rank:")) {
    return "nur Kandidat in der Rangfolge offener Abstimmungsspannung";
  }
  return reason.replaceAll("_", " ");
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function toDecisionLine(decision: AuditDecision) {
  return {
    dimension: decision.dimensionName,
    explanation: `${decision.dimensionName}: ${explainSelectionReason(decision.reason)}`,
  };
}

export function buildHumanReadableAuditReport(
  scores: SelfAlignmentReport["scoresA"]
): HumanReadableAuditReport {
  const audit = runSelfReportAudit(scores);
  const heroText = buildHeroTextFromScores(scores);
  const heroSentences = splitSentences(heroText);
  const patterns = buildPatternsFromScores(scores);
  const challenges = buildChallengesFromScores(scores);
  const complements = buildComplementsFromScores(scores);
  const heroLinks = [
    audit.hero.primarySignal && heroSentences[0]
      ? {
          placement: "Hero Satz 1",
          dimension: audit.hero.primarySignal.dimensionName,
          text: heroSentences[0],
        }
      : null,
    audit.hero.workModeSignal && heroSentences[1]
      ? {
          placement: "Hero Satz 2",
          dimension: audit.hero.workModeSignal.dimensionName,
          text: heroSentences[1],
        }
      : null,
    audit.hero.tensionCarrier && heroSentences[2]
      ? {
          placement: "Hero Satz 3",
          dimension: audit.hero.tensionCarrier.dimensionName,
          text: heroSentences[2],
        }
      : null,
    audit.hero.tensionCarrier && heroSentences[3]
      ? {
          placement: "Hero Satz 4",
          dimension: audit.hero.tensionCarrier.dimensionName,
          text: heroSentences[3],
        }
      : null,
  ].filter(Boolean) as Array<{ placement: string; dimension: string; text: string }>;

  return {
    meta: {
      inputShape: audit.inputShape,
      balancedProfile: audit.balancedProfile,
      pathExplanation: audit.balancedProfile
        ? "Für dieses Profil wurde der balancierte Sonderpfad genutzt."
        : "Für dieses Profil wurde der reguläre, orientierte Auswahlpfad genutzt.",
    },
    scoreOverview: audit.dimensions.map((dimension) => ({
      name: dimension.dimensionName,
      rawScore: dimension.rawScore,
      orientation: dimension.orientation,
      orientationStrength: dimension.orientationStrength,
      strengthBand: dimension.strengthBand,
      zone: dimension.zone,
      explanation: describeStrength(dimension),
    })),
    frictionOverview: audit.dimensions.map((dimension) => ({
      name: dimension.dimensionName,
      frictionScore: dimension.frictionScore,
      frictionReason: dimension.frictionReason,
      socialImpactWeight: dimension.socialImpactWeight,
      coordinationRiskWeight: dimension.coordinationRiskWeight,
      explanation: explainFriction(dimension),
    })),
    selectionLogic: {
      hero: {
        primarySignal: audit.hero.primarySignal
          ? {
              dimension: audit.hero.primarySignal.dimensionName,
              why: explainSelectionReason(audit.hero.primarySignal.reason),
            }
          : null,
        workModeSignal: audit.hero.workModeSignal
          ? {
              dimension: audit.hero.workModeSignal.dimensionName,
              why: explainSelectionReason(audit.hero.workModeSignal.reason),
            }
          : null,
        tensionCarrier: audit.hero.tensionCarrier
          ? {
              dimension: audit.hero.tensionCarrier.dimensionName,
              why: explainSelectionReason(audit.hero.tensionCarrier.reason),
            }
          : null,
      },
      patterns: {
        allCandidates: audit.patterns.allCandidatesBeforeFilter.map(toDecisionLine),
        removed: audit.patterns.decisions
          .filter((decision: AuditDecision) => decision.status === "removed")
          .map(toDecisionLine),
        final: audit.patterns.finalSelection.map((entry: AuditDecision) => ({
          dimension: entry.dimensionName,
          explanation: `${entry.dimensionName}: ${explainSelectionReason(entry.reason)}`,
        })),
      },
      challenges: {
        path: audit.challenges.path === "balanced"
          ? "Auswahl über Primärsignal + offenes Feld + Reibungsfeld"
          : "Auswahl über Primärsignal + Reibung aus anderer Familie + offenes Feld/Fallback",
        final: audit.challenges.finalSelection.map((entry: AuditDecision) => ({
          dimension: entry.dimensionName,
          explanation: `${entry.dimensionName}: ${explainSelectionReason(entry.reason)}`,
        })),
      },
      complement: {
        counterweight: audit.complement.counterweight
          ? {
              dimension: audit.complement.counterweight.dimensionName,
              why: explainSelectionReason(audit.complement.counterweight.reason),
            }
          : null,
        regulator: audit.complement.regulator
          ? {
              dimension: audit.complement.regulator.dimensionName,
              why: explainSelectionReason(audit.complement.regulator.reason),
            }
          : null,
        rhythmPartner: audit.complement.rhythmPartner
          ? {
              dimension: audit.complement.rhythmPartner.dimensionName,
              why: explainSelectionReason(audit.complement.rhythmPartner.reason),
            }
          : null,
      },
    },
    textLinking: {
      hero: heroLinks,
      patterns: audit.patterns.finalSelection.map((entry, index: number) => ({
        placement: `Pattern ${index + 1}`,
        dimension: entry.dimensionName,
        title: patterns[index]?.title ?? "",
      })),
      challenges: audit.challenges.finalSelection.map((entry, index: number) => ({
        placement: `Challenge ${index + 1}`,
        dimension: entry.dimensionName,
        title: challenges[index]?.title ?? "",
      })),
      complements: audit.complement.finalSelection.map(
        (entry, index: number) => ({
          placement: `Complement ${index + 1}`,
          role: entry.role,
          dimension: entry.dimensionName,
          title: complements[index]?.title ?? "",
        })
      ),
    },
    renderedText: {
      hero: heroText,
      patterns,
      challenges,
      complements,
    },
    summary: {
      dominantProfileSignal: audit.selectionSummary.primarySignal ?? "nicht eindeutig",
      biggestFrictionSource:
        audit.selectionSummary.tensionCarrier ??
        audit.dimensions.sort((left, right) => right.frictionScore - left.frictionScore)[0]?.dimensionName ??
        "nicht eindeutig",
      typicalComplementLogic:
        complements.length > 0
          ? complements.map((entry) => `${entry.role}: ${entry.title}`).join(" | ")
          : "keine klare Ergänzungslogik ableitbar",
    },
  };
}

export function runFullAuditDemo() {
  return SELF_REPORT_SELECTION_DEBUG_CASES.filter((entry) =>
    ["stark_ausgepraegtes_profil", "komplett_balanciertes_profil", "gemischtes_profil"].includes(
      entry.name
    )
  ).map((entry) => ({
    name: entry.name,
    report: buildHumanReadableAuditReport(entry.scores),
  }));
}
