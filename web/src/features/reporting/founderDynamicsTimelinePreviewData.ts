import {
  compareFounders,
  FOUNDER_MATCHING_TEST_CASES,
} from "@/features/reporting/founderMatchingEngine";
import { type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import {
  buildFounderDynamicsTimelineDetailPhases,
  type FounderDynamicsTimelineDetailPhase,
} from "@/features/reporting/founderDynamicsTimelineDetails";
import {
  buildFounderDynamicsTimelineNodes,
  FOUNDER_DYNAMICS_TIMELINE_PHASES,
  type FounderDynamicsTimelineGraphPhase,
  type FounderDynamicsTimelineNode,
} from "@/features/reporting/timelineLogic";

export type FounderDynamicsPreviewCaseId =
  | "balanced_but_manageable_pair"
  | "misaligned_pressure_pair"
  | "highly_similar_but_blind_spot_pair"
  | "complementary_builders";

export type FounderDynamicsTimelinePhase = FounderDynamicsTimelineDetailPhase;

export type FounderDynamicsPreviewCase = {
  id: FounderDynamicsPreviewCaseId;
  title: string;
  shortLabel: string;
  stance: "stable" | "tension" | "blind_spot" | "complement";
  participantAName: string;
  participantBName: string;
  summary: string;
  alignmentScore: number | null;
  workingCompatibilityScore: number | null;
  topAlignments: FounderDimensionKey[];
  topTensions: FounderDimensionKey[];
  timelinePhases: FounderDynamicsTimelineGraphPhase[];
  timelineNodes: FounderDynamicsTimelineNode[];
  phases: FounderDynamicsTimelinePhase[];
};

type CaseMeta = {
  title: string;
  shortLabel: string;
  stance: FounderDynamicsPreviewCase["stance"];
  participantAName: string;
  participantBName: string;
  summary: string;
};

const CASE_ORDER: FounderDynamicsPreviewCaseId[] = [
  "balanced_but_manageable_pair",
  "misaligned_pressure_pair",
  "highly_similar_but_blind_spot_pair",
  "complementary_builders",
];

const CASE_META: Record<FounderDynamicsPreviewCaseId, CaseMeta> = {
  balanced_but_manageable_pair: {
    title: "Tragfähige Mitte",
    shortLabel: "Stabile Mitte",
    stance: "stable",
    participantAName: "Nora Weiss",
    participantBName: "David Kern",
    summary:
      "Die Grunddynamik wirkt derzeit tragfähig und relativ ausgewogen. Relevant wird vor allem, ob diese Balance auch unter realem Zeitdruck und wachsender Komplexität hält.",
  },
  misaligned_pressure_pair: {
    title: "Spannung unter Druck",
    shortLabel: "Klare Spannung",
    stance: "tension",
    participantAName: "Lea Hoffmann",
    participantBName: "Tim Becker",
    summary:
      "Strategisch und operativ liegen hier klare Unterschiede. Das muss nicht kippen, verlangt aber deutlich früher explizite Regeln für Tempo, Abstimmung und Eingriffsschwellen.",
  },
  highly_similar_but_blind_spot_pair: {
    title: "Gemeinsamer Zug, gemeinsamer Blind Spot",
    shortLabel: "Blind Spot",
    stance: "blind_spot",
    participantAName: "Clara Neumann",
    participantBName: "Felix Hartmann",
    summary:
      "Die beiden wirken nah und schnell anschlussfähig. Genau darin liegt das Risiko: Gemeinsame starke Tendenzen können früh entlasten und später denselben blinden Fleck erzeugen.",
  },
  complementary_builders: {
    title: "Produktive Ergänzung mit Klärungsbedarf",
    shortLabel: "Ergänzung",
    stance: "complement",
    participantAName: "Mara Keller",
    participantBName: "Jonas Brandt",
    summary:
      "Die Dynamik bringt echte Ergänzung mit. Der Wert entsteht aber nur dann, wenn Unterschiede nicht romantisiert, sondern in konkrete Entscheidungs- und Arbeitsregeln übersetzt werden.",
  },
};

function roundScore(value: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value);
}

export function resolveFounderDynamicsPreviewCase(
  value: string | undefined
): FounderDynamicsPreviewCaseId {
  if (value === "misaligned_pressure_pair") return value;
  if (value === "complementary_builders") return value;
  if (value === "balanced_but_manageable_pair") return value;
  return "highly_similar_but_blind_spot_pair";
}

export function getFounderDynamicsPreviewCaseIds() {
  return CASE_ORDER;
}

export function getFounderDynamicsPreviewCaseOptions() {
  return CASE_ORDER.map((caseId) => ({
    id: caseId,
    shortLabel: CASE_META[caseId].shortLabel,
    title: CASE_META[caseId].title,
  }));
}

export function getFounderDynamicsPreviewCase(
  caseId: FounderDynamicsPreviewCaseId
): FounderDynamicsPreviewCase {
  const meta = CASE_META[caseId];
  const scores = FOUNDER_MATCHING_TEST_CASES[caseId];
  const compareResult = compareFounders(scores.a, scores.b);

  return {
    id: caseId,
    title: meta.title,
    shortLabel: meta.shortLabel,
    stance: meta.stance,
    participantAName: meta.participantAName,
    participantBName: meta.participantBName,
    summary: meta.summary,
    alignmentScore: roundScore(compareResult.alignmentScore),
    workingCompatibilityScore: roundScore(compareResult.workingCompatibilityScore),
    topAlignments: compareResult.topAlignments,
    topTensions: compareResult.topTensions,
    timelinePhases: FOUNDER_DYNAMICS_TIMELINE_PHASES,
    timelineNodes: buildFounderDynamicsTimelineNodes(compareResult),
    phases: buildFounderDynamicsTimelineDetailPhases(compareResult),
  };
}
