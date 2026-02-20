export const REPORT_DIMENSIONS = [
  "Vision",
  "Entscheidung",
  "Risiko",
  "Autonomie",
  "Verbindlichkeit",
  "Konflikt",
] as const;

export type ReportDimension = (typeof REPORT_DIMENSIONS)[number];

export type PersonBStatus = "invitation_open" | "in_progress" | "match_ready";

export type RadarSeries = Record<ReportDimension, number | null>;

export type KeyInsight = {
  dimension: ReportDimension;
  title: string;
  text: string;
  priority: number;
};

export type DebugQuestionEntry = {
  questionId: string;
  value: number;
  max: number;
  normalized: number;
};

export type DimensionDebugEntry = {
  dimension: ReportDimension;
  rawScore: number | null;
  normalizedScore: number | null;
  category: string | null;
  questions: DebugQuestionEntry[];
};

export type ParticipantDebugReport = {
  participantName: string;
  dimensions: DimensionDebugEntry[];
};

export type SessionAlignmentReport = {
  sessionId: string;
  createdAt: string | null;
  personBInvitedAt: string | null;
  personACompletedAt: string | null;
  personBCompletedAt: string | null;
  participantAId: string | null;
  participantBId: string | null;
  participantAName: string;
  participantBName: string | null;
  personBStatus: PersonBStatus;
  personACompleted: boolean;
  personBCompleted: boolean;
  comparisonEnabled: boolean;
  scoresA: RadarSeries;
  scoresB: RadarSeries;
  keyInsights: KeyInsight[];
  commonTendencies: string[];
  frictionPoints: string[];
  conversationGuideQuestions: string[];
  valuesModulePreview: string;
  valuesModuleStatus: "not_started" | "in_progress" | "completed";
  valuesAnsweredA: number;
  valuesAnsweredB: number;
  valuesTotal: number;
  basisAnsweredA: number;
  basisAnsweredB: number;
  basisTotal: number;
  valuesAlignmentPercent: number | null;
  valuesIdentityCategoryA: string | null;
  valuesIdentityCategoryB: string | null;
  requestedScope: "basis" | "basis_plus_values";
  inviteConsentCaptured: boolean;
  debugA: ParticipantDebugReport;
  debugB: ParticipantDebugReport | null;
};

export type ZoneBand = "low" | "mid" | "high";

export type DiffClass = "SMALL" | "MEDIUM" | "LARGE";

export type CompareLabel = "MATCH" | "KOMPLEMENTAER" | "FOKUS_THEMA";

export type ArchetypeCopy = {
  id: string;
  name: string;
  superpower: string;
  caution: string;
  descriptionShort: string;
};

export type DimensionDefinition = {
  id: ReportDimension;
  name: string;
  axisLeft: string;
  axisRight: string;
  thresholds: {
    lowMax: number;
    highMin: number;
  };
  diffThresholds: {
    smallMax: number;
    mediumMax: number;
  };
  archetypesByZone: Record<ZoneBand, ArchetypeCopy>;
  reflectionQuestions: Record<DiffClass, string>;
  dailyPressureByZoneOrPair: {
    low: string;
    mid: string;
    high: string;
    low_high_pair: string;
  };
};

export type ProfileResult = {
  profileId: string;
  displayName: string;
  dimensionScores: RadarSeries;
  dimensionZones: Record<ReportDimension, ZoneBand>;
  archetypeIdPerDimension: Record<ReportDimension, string>;
  valuesScore: number | null;
  valuesArchetypeId: string | null;
};

export type CompareDimensionBlock = {
  dimension: ReportDimension;
  scoreA: number | null;
  scoreB: number | null;
  zoneA: ZoneBand;
  zoneB: ZoneBand;
  archetypeA: ArchetypeCopy;
  archetypeB: ArchetypeCopy;
  diff: number | null;
  diffClass: DiffClass;
  label: CompareLabel;
  summaryA: string;
  summaryB: string;
  dailyPressure: string;
  reflectionQuestion: string;
};

export type CompareResult = {
  pairId: string;
  perDimension: CompareDimensionBlock[];
  topMatches: ReportDimension[];
  topTensions: ReportDimension[];
  summaryType:
    | "Die Harmonischen Stabilisatoren"
    | "Das High-Friction Power-Duo"
    | "Die balancierten Strategen";
};

export type ReportJsonSection = {
  id: string;
  title: string;
};

export type CompareReportJson = {
  sections: ReportJsonSection[];
  cover: {
    reportType: "Basis" | "Basis + Werte-Kern";
    matchStatus: string;
    dimensions: string[];
  };
  executiveSummary: {
    summaryType: CompareResult["summaryType"];
    topMatches: string[];
    topTensions: string[];
    bullets: string[];
    valuesMatchSentence: string;
  };
  keyInsights: Array<{
    dimension: ReportDimension;
    title: string;
    text: string;
  }>;
  deepDive: CompareDimensionBlock[];
  valuesModule: {
    alignmentPercent: number | null;
    identityA: string | null;
    identityB: string | null;
    text: string;
  };
  conversationGuide: string[];
};
