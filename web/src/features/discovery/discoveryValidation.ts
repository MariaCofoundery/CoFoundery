import {
  DISCOVERY_COMMITMENT_LEVELS,
  DISCOVERY_FOUNDER_ROLES,
  DISCOVERY_PRIORITY_KEYS,
  DISCOVERY_REMOTE_MODES,
  DISCOVERY_STATUSES,
  DISCOVERY_VENTURE_GOALS,
  DISCOVERY_VENTURE_STAGES,
  type DiscoveryCommitmentLevel,
  type DiscoveryFounderRole,
  type DiscoveryMustHaves,
  type DiscoveryPreferencesInput,
  type DiscoveryPriorityKey,
  type DiscoveryPriorityWeights,
  type DiscoveryProfileInput,
  type DiscoveryRemoteMode,
  type DiscoveryStatus,
  type DiscoveryVentureGoal,
  type DiscoveryVentureStage,
} from "@/features/discovery/discoveryTypes";
import { DISCOVERY_TEXT_LIMITS } from "@/features/discovery/discoveryConfig";

const DEFAULT_MUST_HAVES: DiscoveryMustHaves = {
  minimumAvailabilityHoursPerWeek: null,
  acceptedRemoteModes: [],
  requiredRolesAny: [],
  requiredIndustriesAny: [],
  acceptedCommitmentLevels: [],
  acceptedVentureStages: [],
  acceptedVentureGoals: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeSingleSpace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeText(value: unknown, maxLength: number) {
  const normalized = normalizeSingleSpace(String(value ?? ""));
  return normalized.slice(0, Math.max(0, maxLength));
}

function isAllowedValue<T extends string>(value: unknown, allowedValues: readonly T[]): value is T {
  return typeof value === "string" && allowedValues.includes(value as T);
}

export function normalizeAllowedArray<T extends string>(
  value: unknown,
  allowedValues: readonly T[]
): T[] {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const normalized = values.filter((entry): entry is T => isAllowedValue(entry, allowedValues));
  return Array.from(new Set(normalized));
}

export function normalizeStringArray(value: unknown, maxItemLength = DISCOVERY_TEXT_LIMITS.industry) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const normalized = values
    .map((entry) => normalizeText(entry, maxItemLength))
    .filter((entry) => entry.length > 0);
  return Array.from(new Set(normalized));
}

export function normalizeAvailabilityHours(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const rounded = Math.round(numeric);
  return rounded >= 1 && rounded <= 100 ? rounded : null;
}

function normalizeStatus(value: unknown): DiscoveryStatus {
  return isAllowedValue(value, DISCOVERY_STATUSES) ? value : "draft";
}

function normalizeRemoteMode(value: unknown): DiscoveryRemoteMode {
  return isAllowedValue(value, DISCOVERY_REMOTE_MODES) ? value : "flexible";
}

function normalizeCommitmentLevel(value: unknown): DiscoveryCommitmentLevel {
  return isAllowedValue(value, DISCOVERY_COMMITMENT_LEVELS) ? value : "exploring";
}

function normalizeVentureStage(value: unknown): DiscoveryVentureStage {
  return isAllowedValue(value, DISCOVERY_VENTURE_STAGES) ? value : "undecided";
}

function normalizeVentureGoal(value: unknown): DiscoveryVentureGoal {
  return isAllowedValue(value, DISCOVERY_VENTURE_GOALS) ? value : "undecided";
}

export function normalizePriorityWeights(value: unknown): DiscoveryPriorityWeights {
  if (!isRecord(value)) {
    return {};
  }

  const weights: DiscoveryPriorityWeights = {};
  for (const key of DISCOVERY_PRIORITY_KEYS) {
    const rawValue = value[key];
    if (rawValue == null || rawValue === "") {
      continue;
    }

    const numeric = typeof rawValue === "number" ? rawValue : Number(String(rawValue).trim());
    if (!Number.isFinite(numeric)) {
      continue;
    }

    weights[key] = Math.min(5, Math.max(0, Math.round(numeric)));
  }

  return weights;
}

export function normalizeMustHaves(value: unknown): DiscoveryMustHaves {
  if (!isRecord(value)) {
    return { ...DEFAULT_MUST_HAVES };
  }

  return {
    minimumAvailabilityHoursPerWeek: normalizeAvailabilityHours(
      value.minimumAvailabilityHoursPerWeek ?? value.minimum_availability_hours_per_week
    ),
    acceptedRemoteModes: normalizeAllowedArray(
      value.acceptedRemoteModes ?? value.accepted_remote_modes,
      DISCOVERY_REMOTE_MODES
    ),
    requiredRolesAny: normalizeAllowedArray(
      value.requiredRolesAny ?? value.required_roles_any,
      DISCOVERY_FOUNDER_ROLES
    ),
    requiredIndustriesAny: normalizeStringArray(
      value.requiredIndustriesAny ?? value.required_industries_any
    ),
    acceptedCommitmentLevels: normalizeAllowedArray(
      value.acceptedCommitmentLevels ?? value.accepted_commitment_levels,
      DISCOVERY_COMMITMENT_LEVELS
    ),
    acceptedVentureStages: normalizeAllowedArray(
      value.acceptedVentureStages ?? value.accepted_venture_stages,
      DISCOVERY_VENTURE_STAGES
    ),
    acceptedVentureGoals: normalizeAllowedArray(
      value.acceptedVentureGoals ?? value.accepted_venture_goals,
      DISCOVERY_VENTURE_GOALS
    ),
  };
}

export function normalizeDiscoveryProfileInput(input: DiscoveryProfileInput = {}) {
  return {
    status: normalizeStatus(input.status),
    displayName: normalizeText(input.displayName, DISCOVERY_TEXT_LIMITS.displayName),
    headline: normalizeText(input.headline, DISCOVERY_TEXT_LIMITS.headline),
    bio: normalizeText(input.bio, DISCOVERY_TEXT_LIMITS.bio),
    ownRoles: normalizeAllowedArray<DiscoveryFounderRole>(input.ownRoles, DISCOVERY_FOUNDER_ROLES),
    seekingRoles: normalizeAllowedArray<DiscoveryFounderRole>(
      input.seekingRoles,
      DISCOVERY_FOUNDER_ROLES
    ),
    industries: normalizeStringArray(input.industries),
    locationLabel: normalizeText(input.locationLabel, DISCOVERY_TEXT_LIMITS.locationLabel) || null,
    remoteMode: normalizeRemoteMode(input.remoteMode),
    availabilityHoursPerWeek: normalizeAvailabilityHours(input.availabilityHoursPerWeek),
    commitmentLevel: normalizeCommitmentLevel(input.commitmentLevel),
    ventureStage: normalizeVentureStage(input.ventureStage),
    ventureGoal: normalizeVentureGoal(input.ventureGoal),
    publishedAt: input.publishedAt ?? null,
  };
}

export function normalizeDiscoveryPreferencesInput(input: DiscoveryPreferencesInput = {}) {
  return {
    priorityWeights: normalizePriorityWeights(input.priorityWeights),
    mustHaves: normalizeMustHaves(input.mustHaves),
  };
}

export function getDiscoveryProfilePublishIssues(input: DiscoveryProfileInput): string[] {
  const normalized = normalizeDiscoveryProfileInput(input);
  const issues: string[] = [];

  if (normalized.displayName.trim().length < 2) {
    issues.push("Gib deinem Suchprofil einen Namen, der mindestens 2 Zeichen lang ist.");
  }

  if (normalized.headline.trim().length < 3) {
    issues.push("Ergänze eine kurze Headline, damit andere dich einordnen können.");
  }

  if (normalized.ownRoles.length === 0) {
    issues.push("Wähle mindestens eine Rolle, die du selbst einbringst.");
  }

  if (normalized.seekingRoles.length === 0) {
    issues.push("Wähle mindestens eine Rolle, die du bei einem Co-Founder suchst.");
  }

  if (normalized.availabilityHoursPerWeek == null) {
    issues.push("Gib an, wie viel Zeit du pro Woche ungefähr einbringen kannst.");
  }

  if (normalized.commitmentLevel === "exploring") {
    issues.push("Wähle ein Commitment-Level, bevor du dein Profil veröffentlichst.");
  }

  if (normalized.ventureStage === "undecided") {
    issues.push("Wähle, wo du gerade mit deiner Idee oder Suche stehst.");
  }

  if (normalized.ventureGoal === "undecided") {
    issues.push("Wähle, welche Art von Aufbau du gerade suchst.");
  }

  return issues;
}

export function isDiscoveryPriorityKey(value: string): value is DiscoveryPriorityKey {
  return DISCOVERY_PRIORITY_KEYS.includes(value as DiscoveryPriorityKey);
}
