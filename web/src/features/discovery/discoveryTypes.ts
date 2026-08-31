export const DISCOVERY_STATUSES = ["draft", "active", "paused"] as const;
export type DiscoveryStatus = (typeof DISCOVERY_STATUSES)[number];

export const DISCOVERY_SEARCH_INTENTS = ["ready_now", "actively_exploring", "open_later"] as const;
export type DiscoverySearchIntent = (typeof DISCOVERY_SEARCH_INTENTS)[number];

export const DISCOVERY_START_HORIZONS = [
  "now",
  "next_3_months",
  "next_6_months",
  "later_or_flexible",
] as const;
export type DiscoveryStartHorizon = (typeof DISCOVERY_START_HORIZONS)[number];

export const DISCOVERY_FOUNDER_ROLES = [
  "tech",
  "product",
  "sales",
  "growth",
  "marketing",
  "operations",
  "finance",
  "design",
  "strategy",
  "research",
  "community",
  "other",
] as const;
export type DiscoveryFounderRole = (typeof DISCOVERY_FOUNDER_ROLES)[number];

export const DISCOVERY_REMOTE_MODES = ["onsite", "hybrid", "remote", "flexible"] as const;
export type DiscoveryRemoteMode = (typeof DISCOVERY_REMOTE_MODES)[number];

export const DISCOVERY_COMMITMENT_LEVELS = [
  "exploring",
  "side_project",
  "part_time",
  "full_time",
  "all_in",
] as const;
export type DiscoveryCommitmentLevel = (typeof DISCOVERY_COMMITMENT_LEVELS)[number];

export const DISCOVERY_VENTURE_STAGES = [
  "undecided",
  "no_idea_open_to_join",
  "exploring_ideas",
  "idea_validating",
  "already_building",
] as const;
export type DiscoveryVentureStage = (typeof DISCOVERY_VENTURE_STAGES)[number];

export const DISCOVERY_VENTURE_GOALS = [
  "undecided",
  "explore",
  "side_project",
  "profitable_business",
  "venture_scale",
  "exit_oriented",
] as const;
export type DiscoveryVentureGoal = (typeof DISCOVERY_VENTURE_GOALS)[number];

export const DISCOVERY_PRIORITY_KEYS = [
  "shared_vision",
  "commitment",
  "skill_complementarity",
  "venture_goal",
  "exit_logic",
  "availability",
  "work_style",
  "execution_strength",
  "location",
  "industry",
  "communication",
] as const;
export type DiscoveryPriorityKey = (typeof DISCOVERY_PRIORITY_KEYS)[number];

export type DiscoveryPriorityWeights = Partial<Record<DiscoveryPriorityKey, number>>;

export type DiscoveryMustHaves = {
  minimumAvailabilityHoursPerWeek: number | null;
  acceptedRemoteModes: DiscoveryRemoteMode[];
  requiredRolesAny: DiscoveryFounderRole[];
  requiredExpertiseAny: string[];
  desiredLocationRegion: string | null;
  requiredIndustriesAny: string[];
  acceptedCommitmentLevels: DiscoveryCommitmentLevel[];
  acceptedVentureStages: DiscoveryVentureStage[];
  acceptedVentureGoals: DiscoveryVentureGoal[];
};

export type FounderDiscoveryProfile = {
  id: string;
  userId: string;
  status: DiscoveryStatus;
  displayName: string;
  headline: string;
  bio: string;
  ownRoles: DiscoveryFounderRole[];
  seekingRoles: DiscoveryFounderRole[];
  expertise: string[];
  industries: string[];
  locationLabel: string | null;
  locationRegion: string | null;
  remoteMode: DiscoveryRemoteMode;
  availabilityHoursPerWeek: number | null;
  commitmentLevel: DiscoveryCommitmentLevel;
  ventureStage: DiscoveryVentureStage;
  ventureGoal: DiscoveryVentureGoal;
  searchIntent?: DiscoverySearchIntent | null;
  startHorizon?: DiscoveryStartHorizon | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FounderSearchPreferences = {
  id: string;
  userId: string;
  priorityWeights: DiscoveryPriorityWeights;
  mustHaves: DiscoveryMustHaves;
  includeAssessmentSignals: boolean;
  assessmentSignalsConsentedAt: string | null;
  discoveryV2AlignmentEnabled: boolean;
  discoveryV2AlignmentDimensions: DiscoveryAlignmentDimension[];
  discoveryV2AlignmentPreferences: DiscoveryAlignmentPreferences;
  discoveryV2AlignmentConsentedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DiscoveryProfileInput = Partial<{
  status: DiscoveryStatus;
  displayName: unknown;
  headline: unknown;
  bio: unknown;
  ownRoles: unknown;
  seekingRoles: unknown;
  expertise: unknown;
  industries: unknown;
  locationLabel: unknown;
  locationRegion: unknown;
  remoteMode: unknown;
  availabilityHoursPerWeek: unknown;
  commitmentLevel: unknown;
  ventureStage: unknown;
  ventureGoal: unknown;
  searchIntent: unknown;
  startHorizon: unknown;
  publishedAt: string | null;
}>;

export type DiscoveryPreferencesInput = Partial<{
  priorityWeights: unknown;
  mustHaves: unknown;
  includeAssessmentSignals: unknown;
  discoveryV2AlignmentEnabled: unknown;
  discoveryV2AlignmentDimensions: unknown;
  discoveryV2AlignmentPreferences: unknown;
}>;

export const DISCOVERY_ALIGNMENT_DIMENSIONS = [
  "company_logic",
  "decision_logic",
  "work_structure",
  "commitment",
  "risk_orientation",
  "conflict_style",
] as const;
export type DiscoveryAlignmentDimension = (typeof DISCOVERY_ALIGNMENT_DIMENSIONS)[number];

export const DISCOVERY_ALIGNMENT_IMPORTANCE = [
  "not_prioritized",
  "important",
  "very_important",
] as const;
export type DiscoveryAlignmentImportance = (typeof DISCOVERY_ALIGNMENT_IMPORTANCE)[number];

export const DISCOVERY_ALIGNMENT_RELATION_PREFERENCES = [
  "prefer_similar",
  "different_perspective_welcome",
  "no_direction_preference",
] as const;
export type DiscoveryAlignmentRelationPreference =
  (typeof DISCOVERY_ALIGNMENT_RELATION_PREFERENCES)[number];

export type DiscoveryAlignmentPreference = {
  importance: Exclude<DiscoveryAlignmentImportance, "not_prioritized">;
  relationPreference: DiscoveryAlignmentRelationPreference;
};
export type DiscoveryAlignmentPreferences = Partial<
  Record<DiscoveryAlignmentDimension, DiscoveryAlignmentPreference>
>;

export type DiscoveryAlignmentSignalKind =
  | "similar_tendency"
  | "different_tendency"
  | "insufficient_data";
export type DiscoveryAlignmentSignal = {
  dimension: DiscoveryAlignmentDimension;
  signal: DiscoveryAlignmentSignalKind;
};

export type DiscoveryOwnAlignmentTendency = {
  dimension: DiscoveryAlignmentDimension;
  tendency: "left" | "center" | "right";
  label: string;
};

export type DiscoveryProfilePreview = Pick<
  FounderDiscoveryProfile,
  | "id"
  | "displayName"
  | "headline"
  | "bio"
  | "ownRoles"
  | "seekingRoles"
  | "expertise"
  | "industries"
  | "locationLabel"
  | "locationRegion"
  | "remoteMode"
  | "availabilityHoursPerWeek"
  | "commitmentLevel"
  | "ventureStage"
  | "ventureGoal"
  | "searchIntent"
  | "startHorizon"
  | "publishedAt"
>;

export type DiscoveryCandidate = {
  profile: DiscoveryProfilePreview;
  reasons: string[];
  conversationTopics: string[];
  practicalMatches?: DiscoveryPracticalMatch[];
  alignmentSimilarDimensions?: DiscoveryAlignmentDimension[];
  alignmentSignals?: DiscoveryAlignmentSignal[];
  score?: number;
};

export type DiscoveryPracticalMatch =
  | "role"
  | "expertise"
  | "location"
  | "remote"
  | "availability";

export type DiscoverySearchPage = {
  candidates: DiscoveryCandidate[];
  page: number;
  pageSize: number;
  totalCount: number;
};
