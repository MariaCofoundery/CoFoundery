export const DISCOVERY_STATUSES = ["draft", "active", "paused"] as const;
export type DiscoveryStatus = (typeof DISCOVERY_STATUSES)[number];

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
  industries: string[];
  locationLabel: string | null;
  remoteMode: DiscoveryRemoteMode;
  availabilityHoursPerWeek: number | null;
  commitmentLevel: DiscoveryCommitmentLevel;
  ventureStage: DiscoveryVentureStage;
  ventureGoal: DiscoveryVentureGoal;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FounderSearchPreferences = {
  id: string;
  userId: string;
  priorityWeights: DiscoveryPriorityWeights;
  mustHaves: DiscoveryMustHaves;
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
  industries: unknown;
  locationLabel: unknown;
  remoteMode: unknown;
  availabilityHoursPerWeek: unknown;
  commitmentLevel: unknown;
  ventureStage: unknown;
  ventureGoal: unknown;
  publishedAt: string | null;
}>;

export type DiscoveryPreferencesInput = Partial<{
  priorityWeights: unknown;
  mustHaves: unknown;
}>;

export type DiscoveryProfilePreview = Pick<
  FounderDiscoveryProfile,
  | "id"
  | "displayName"
  | "headline"
  | "bio"
  | "ownRoles"
  | "seekingRoles"
  | "industries"
  | "locationLabel"
  | "remoteMode"
  | "availabilityHoursPerWeek"
  | "commitmentLevel"
  | "ventureStage"
  | "ventureGoal"
  | "publishedAt"
>;

export type DiscoveryCandidate = {
  profile: DiscoveryProfilePreview;
  reasons: string[];
  conversationTopics: string[];
  score?: number;
};
