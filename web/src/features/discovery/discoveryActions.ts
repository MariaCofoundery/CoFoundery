"use server";

import { revalidatePath } from "next/cache";
import {
  DISCOVERY_ALIGNMENT_DIMENSIONS,
  DISCOVERY_PRIORITY_KEYS,
  type DiscoveryPreferencesInput,
  type DiscoveryProfileInput,
} from "@/features/discovery/discoveryTypes";
import {
  getOwnDiscoveryProfile,
  getOwnSearchPreferences,
  upsertOwnDiscoveryProfile,
  upsertOwnSearchPreferences,
  upsertOwnDiscoveryV2SearchPreferences,
} from "@/features/discovery/discoveryData";
import {
  mapDiscoveryProfilePublishIssues,
  type DiscoveryPreferencesResult,
  type DiscoveryProfileDraftResult,
  type DiscoveryProfilePauseResult,
  type DiscoveryProfilePublishResult,
} from "@/features/discovery/discoveryProfileFeedback";
import {
  getDiscoveryProfilePublishIssues,
  normalizeDiscoveryPreferencesInput,
  normalizeDiscoveryProfileInput,
} from "@/features/discovery/discoveryValidation";
import { createClient } from "@/lib/supabase/server";

const DISCOVERY_REVALIDATION_PATHS = ["/discovery", "/discovery/profile"] as const;

function revalidateDiscoveryPaths() {
  for (const path of DISCOVERY_REVALIDATION_PATHS) {
    revalidatePath(path);
  }
}

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return null;
  }

  return user.id;
}

function unauthenticatedPublishResult(): DiscoveryProfilePublishResult {
  return {
    ok: false,
    reason: "not_authenticated",
  };
}

function getFirstString(formData: FormData, names: string[]) {
  for (const name of names) {
    const value = formData.get(name);
    if (typeof value === "string") {
      return value;
    }
  }
  return "";
}

function getStringList(formData: FormData, names: string[]) {
  const values: string[] = [];
  for (const name of names) {
    for (const value of formData.getAll(name)) {
      if (typeof value !== "string") {
        continue;
      }

      values.push(...value.split(","));
    }
  }

  return values.map((value) => value.trim()).filter(Boolean);
}

function parseJsonObject(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(normalized);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getJsonObject(formData: FormData, names: string[]) {
  for (const name of names) {
    const value = formData.get(name);
    if (typeof value !== "string") {
      continue;
    }

    const parsed = parseJsonObject(value);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function parseDiscoveryProfileFormData(formData: FormData): DiscoveryProfileInput {
  return {
    displayName: getFirstString(formData, ["displayName", "display_name"]),
    headline: getFirstString(formData, ["headline"]),
    bio: getFirstString(formData, ["bio"]),
    ownRoles: getStringList(formData, ["ownRoles", "own_roles"]),
    seekingRoles: getStringList(formData, ["seekingRoles", "seeking_roles"]),
    expertise: getStringList(formData, ["expertise"]),
    industries: getStringList(formData, ["industries", "industry"]),
    locationLabel: getFirstString(formData, ["locationLabel", "location_label"]),
    locationRegion: getFirstString(formData, ["locationRegion", "location_region"]),
    remoteMode: getFirstString(formData, ["remoteMode", "remote_mode"]),
    availabilityHoursPerWeek: getFirstString(formData, [
      "availabilityHoursPerWeek",
      "availability_hours_per_week",
    ]),
    commitmentLevel: getFirstString(formData, ["commitmentLevel", "commitment_level"]),
    ventureStage: getFirstString(formData, ["ventureStage", "venture_stage"]),
    ventureGoal: getFirstString(formData, ["ventureGoal", "venture_goal"]),
    searchIntent: getFirstString(formData, ["searchIntent", "search_intent"]),
    startHorizon: getFirstString(formData, ["startHorizon", "start_horizon"]),
  };
}

function parseDiscoveryV2AlignmentPreferences(formData: FormData) {
  return Object.fromEntries(
    DISCOVERY_ALIGNMENT_DIMENSIONS.map((dimension) => [
      dimension,
      {
        importance: getFirstString(formData, [`alignmentImportance.${dimension}`]),
        relationPreference: getFirstString(formData, [
          `alignmentRelationPreference.${dimension}`,
        ]),
      },
    ])
  );
}

function parsePriorityWeightsFormData(formData: FormData) {
  const parsed = getJsonObject(formData, ["priorityWeights", "priority_weights"]);
  if (parsed) {
    return parsed;
  }

  const weights: Record<string, string> = {};
  for (const key of DISCOVERY_PRIORITY_KEYS) {
    const value = getFirstString(formData, [
      `priorityWeights.${key}`,
      `priority_weights.${key}`,
      `priority_${key}`,
    ]);
    if (value !== "") {
      weights[key] = value;
    }
  }

  return weights;
}

function parseMustHavesFormData(formData: FormData) {
  const parsed = getJsonObject(formData, ["mustHaves", "must_haves"]);
  if (parsed) {
    return parsed;
  }

  return {
    minimumAvailabilityHoursPerWeek: getFirstString(formData, [
      "minimumAvailabilityHoursPerWeek",
      "minimum_availability_hours_per_week",
    ]),
    acceptedRemoteModes: getStringList(formData, ["acceptedRemoteModes", "accepted_remote_modes"]),
    requiredRolesAny: getStringList(formData, ["requiredRolesAny", "required_roles_any"]),
    requiredIndustriesAny: getStringList(formData, [
      "requiredIndustriesAny",
      "required_industries_any",
    ]),
    acceptedCommitmentLevels: getStringList(formData, [
      "acceptedCommitmentLevels",
      "accepted_commitment_levels",
    ]),
    acceptedVentureStages: getStringList(formData, [
      "acceptedVentureStages",
      "accepted_venture_stages",
    ]),
    acceptedVentureGoals: getStringList(formData, [
      "acceptedVentureGoals",
      "accepted_venture_goals",
    ]),
  };
}

function parseDiscoveryPreferencesFormData(formData: FormData): DiscoveryPreferencesInput {
  return {
    priorityWeights: parsePriorityWeightsFormData(formData),
    mustHaves: parseMustHavesFormData(formData),
    includeAssessmentSignals: getFirstString(formData, [
      "includeAssessmentSignals",
      "include_assessment_signals",
    ]),
  };
}

function isPublishabilityError(error: unknown): error is Error {
  return error instanceof Error && error.message.startsWith("discovery_profile_not_publishable:");
}

function getPublishabilityIssues(error: unknown) {
  if (!isPublishabilityError(error)) {
    return [];
  }

  return mapDiscoveryProfilePublishIssues(
    error.message
      .replace("discovery_profile_not_publishable:", "")
      .split("|")
      .map((issue: string) => issue.trim())
      .filter(Boolean)
  );
}

export async function saveDiscoveryProfileDraftAction(
  formData: FormData
): Promise<DiscoveryProfileDraftResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      reason: "not_authenticated",
    };
  }

  try {
    const input = normalizeDiscoveryProfileInput(parseDiscoveryProfileFormData(formData));
    const existing = await getOwnDiscoveryProfile(userId);
    const keepPublished = existing?.status === "active";
    await upsertOwnDiscoveryProfile(userId, {
      ...input,
      status: keepPublished ? "active" : "draft",
      publishedAt: keepPublished ? existing.publishedAt : null,
    });

    revalidateDiscoveryPaths();
    return {
      ok: true,
      reason: "draft_saved",
    };
  } catch {
    return {
      ok: false,
      reason: "draft_save_failed",
    };
  }
}

export async function saveDiscoveryV2SearchPreferencesAction(
  formData: FormData
): Promise<DiscoveryPreferencesResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { ok: false, reason: "not_authenticated" };
  }

  try {
    await upsertOwnDiscoveryV2SearchPreferences(userId, {
      requiredRolesAny: getStringList(formData, ["requiredRolesAny"]),
      requiredExpertiseAny: getStringList(formData, ["requiredExpertiseAny"]),
      desiredLocationRegion: getFirstString(formData, ["desiredLocationRegion"]),
      acceptedRemoteModes: getStringList(formData, ["acceptedRemoteModes"]),
      minimumAvailabilityHoursPerWeek: getFirstString(formData, [
        "minimumAvailabilityHoursPerWeek",
      ]),
    });
    revalidateDiscoveryPaths();
    return { ok: true, reason: "preferences_saved" };
  } catch {
    return { ok: false, reason: "preferences_save_failed" };
  }
}

export async function saveDiscoveryV2AlignmentPreferencesAction(
  formData: FormData
): Promise<DiscoveryPreferencesResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, reason: "not_authenticated" };

  try {
    const existing = await getOwnSearchPreferences(userId);
    await upsertOwnSearchPreferences(userId, {
      priorityWeights: existing?.priorityWeights ?? {},
      mustHaves: existing?.mustHaves,
      includeAssessmentSignals: existing?.includeAssessmentSignals ?? false,
      discoveryV2AlignmentEnabled: getFirstString(formData, [
        "discoveryV2AlignmentEnabled",
      ]),
      discoveryV2AlignmentPreferences: parseDiscoveryV2AlignmentPreferences(formData),
    });
    revalidateDiscoveryPaths();
    return { ok: true, reason: "preferences_saved" };
  } catch {
    return { ok: false, reason: "preferences_save_failed" };
  }
}

export async function publishDiscoveryProfileAction(): Promise<DiscoveryProfilePublishResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthenticatedPublishResult();
  }

  try {
    const profile = await getOwnDiscoveryProfile(userId);
    if (!profile) {
      return {
        ok: false,
        reason: "profile_missing",
      };
    }

    const issues = mapDiscoveryProfilePublishIssues(getDiscoveryProfilePublishIssues(profile));
    if (issues.length > 0) {
      return {
        ok: false,
        reason: "profile_not_publishable",
        issues,
      };
    }

    await upsertOwnDiscoveryProfile(userId, {
      ...profile,
      status: "active",
      publishedAt: profile.publishedAt ?? new Date().toISOString(),
    });

    revalidateDiscoveryPaths();
    return {
      ok: true,
      reason: "profile_published",
    };
  } catch (error) {
    const issues = getPublishabilityIssues(error);
    if (issues.length > 0) {
      return {
        ok: false,
        reason: "profile_not_publishable",
        issues,
      };
    }

    return {
      ok: false,
      reason: "publish_failed",
    };
  }
}

export async function publishDiscoveryProfileFromFormAction(
  formData: FormData
): Promise<DiscoveryProfilePublishResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthenticatedPublishResult();
  }

  try {
    const input = normalizeDiscoveryProfileInput(parseDiscoveryProfileFormData(formData));
    const draftInput = {
      ...input,
      status: "draft" as const,
      publishedAt: null,
    };

    await upsertOwnDiscoveryProfile(userId, draftInput);

    const issues = mapDiscoveryProfilePublishIssues(getDiscoveryProfilePublishIssues(draftInput));
    if (issues.length > 0) {
      revalidateDiscoveryPaths();
      return {
        ok: false,
        reason: "profile_not_publishable",
        issues,
      };
    }

    await upsertOwnDiscoveryProfile(userId, {
      ...input,
      status: "active",
      publishedAt: new Date().toISOString(),
    });

    revalidateDiscoveryPaths();
    return {
      ok: true,
      reason: "profile_published",
    };
  } catch (error) {
    const issues = getPublishabilityIssues(error);
    if (issues.length > 0) {
      return {
        ok: false,
        reason: "profile_not_publishable",
        issues,
      };
    }

    return {
      ok: false,
      reason: "publish_failed",
    };
  }
}

export async function pauseDiscoveryProfileAction(): Promise<DiscoveryProfilePauseResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      reason: "not_authenticated",
    };
  }

  try {
    const profile = await getOwnDiscoveryProfile(userId);
    if (!profile) {
      return {
        ok: false,
        reason: "profile_missing",
      };
    }

    await upsertOwnDiscoveryProfile(userId, {
      ...profile,
      status: "paused",
    });

    revalidateDiscoveryPaths();
    return {
      ok: true,
      reason: "profile_paused",
    };
  } catch {
    return {
      ok: false,
      reason: "pause_failed",
    };
  }
}

export async function saveDiscoveryPreferencesAction(
  formData: FormData
): Promise<DiscoveryPreferencesResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      reason: "not_authenticated",
    };
  }

  try {
    const input = normalizeDiscoveryPreferencesInput(parseDiscoveryPreferencesFormData(formData));
    await upsertOwnSearchPreferences(userId, input);

    revalidateDiscoveryPaths();
    return {
      ok: true,
      reason: "preferences_saved",
    };
  } catch {
    return {
      ok: false,
      reason: "preferences_save_failed",
    };
  }
}
