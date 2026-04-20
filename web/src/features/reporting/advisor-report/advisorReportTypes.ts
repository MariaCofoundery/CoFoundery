import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import type { JointState, RiskLevel } from "@/features/scoring/founderMatching";

export type AdvisorDimensionKey = FounderDimensionKey;
export type AdvisorClassification = "risk" | "chance" | "neutral";
export type AdvisorIntensity = "low" | "medium" | "high";
export type AdvisorJointState = JointState;
export type AdvisorRiskLevel = RiskLevel;

export type AdvisorInterventionType =
  | "roles_clarity"
  | "decision_rules"
  | "conflict_rules"
  | "prioritization_system"
  | "risk_guardrails"
  | "collaboration_rules";

export interface AdvisorDimensionInput {
  dimensionKey: AdvisorDimensionKey;
  founderAScore?: number | null;
  founderBScore?: number | null;
  jointState: AdvisorJointState | null;
  riskLevel: AdvisorRiskLevel | null;
  hasSharedBlindSpotRisk: boolean;
}

export interface AdvisorDimensionAssessment {
  dimensionKey: AdvisorDimensionKey;
  founderAScore: number | null;
  founderBScore: number | null;
  jointState: AdvisorJointState | null;
  riskLevel: AdvisorRiskLevel | null;
  hasSharedBlindSpotRisk: boolean;

  distanceValue: number | null;
  intensity: AdvisorIntensity;
  classification: AdvisorClassification;

  priorityScore: number;
  clusteredPriorityScore: number;
  stabilityScore: number;

  tensionRisk: string;
  strengthPotential: string;
  tippingPoint: string;
  moderationQuestion: string;

  observationMarkers: string[];
  interventionType: AdvisorInterventionType;
}

export interface AdvisorTopTension {
  dimensionKey: AdvisorDimensionKey;
  priorityScore: number;
  intensity: AdvisorIntensity;
  classification: "risk" | "chance";
  title: string;
  summary: string;
  tensionRisk: string;
  strengthPotential: string;
  tippingPoint: string;
  moderationQuestion: string;
  observationMarkers: string[];
  interventionType: AdvisorInterventionType;
}

export interface AdvisorStabilityFactor {
  dimensionKey: AdvisorDimensionKey;
  stabilityScore: number;
  title: string;
  rationale: string;
  constraintNote: string;
}

export interface AdvisorObservationPoint {
  id: string;
  dimensionKey: AdvisorDimensionKey;
  priorityScore: number;
  marker: string;
  whyItMatters: string;
}

export interface AdvisorIntervention {
  dimensionKey: AdvisorDimensionKey;
  interventionType: AdvisorInterventionType;
  priorityScore: number;
  title: string;
  objective: string;
  prompt: string;
}

export interface AdvisorTeamSummary {
  leadStatement: string;
  topPatternKeys: AdvisorDimensionKey[];
}

export interface AdvisorReportData {
  teamSummary: AdvisorTeamSummary;
  dimensions: AdvisorDimensionAssessment[];
  topTensions: AdvisorTopTension[];
  stabilityFactors: AdvisorStabilityFactor[];
  observationPoints: AdvisorObservationPoint[];
  interventions: AdvisorIntervention[];
}
