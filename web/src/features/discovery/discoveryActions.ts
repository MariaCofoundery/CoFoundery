"use server";

import { revalidatePath } from "next/cache";
import {
  DISCOVERY_PRIORITY_KEYS,
  type DiscoveryPreferencesInput,
  type DiscoveryProfileInput,
} from "@/features/discovery/discoveryTypes";
import {
  getOwnDiscoveryProfile,
  upsertOwnDiscoveryProfile,
  upsertOwnSearchPreferences,
} from "@/features/discovery/discoveryData";
import {
  getDiscoveryProfilePublishIssues,
  normalizeDiscoveryPreferencesInput,
  normalizeDiscoveryProfileInput,
} from "@/features/discovery/discoveryValidation";
import { createClient } from "@/lib/supabase/server";

export type DiscoveryActionState = {
  ok: boolean;
  message?: string;
  issues?: string[];
};

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

function unauthenticatedState(): DiscoveryActionState {
  return {
    ok: false,
    message: "Bitte melde dich an, um dein Discovery-Profil zu bearbeiten.",
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
    industries: getStringList(formData, ["industries", "industry"]),
    locationLabel: getFirstString(formData, ["locationLabel", "location_label"]),
    remoteMode: getFirstString(formData, ["remoteMode", "remote_mode"]),
    availabilityHoursPerWeek: getFirstString(formData, [
      "availabilityHoursPerWeek",
      "availability_hours_per_week",
    ]),
    commitmentLevel: getFirstString(formData, ["commitmentLevel", "commitment_level"]),
    ventureStage: getFirstString(formData, ["ventureStage", "venture_stage"]),
    ventureGoal: getFirstString(formData, ["ventureGoal", "venture_goal"]),
  };
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

  return error.message
    .replace("discovery_profile_not_publishable:", "")
    .split("|")
    .map((issue: string) => issue.trim())
    .filter(Boolean);
}

export async function saveDiscoveryProfileDraftAction(
  formData: FormData
): Promise<DiscoveryActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthenticatedState();
  }

  try {
    const input = normalizeDiscoveryProfileInput(parseDiscoveryProfileFormData(formData));
    await upsertOwnDiscoveryProfile(userId, {
      ...input,
      status: "draft",
      publishedAt: null,
    });

    revalidateDiscoveryPaths();
    return {
      ok: true,
      message: "Dein Discovery-Entwurf wurde gespeichert.",
    };
  } catch {
    return {
      ok: false,
      message: "Dein Discovery-Profil konnte gerade nicht gespeichert werden.",
    };
  }
}

export async function publishDiscoveryProfileAction(): Promise<DiscoveryActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthenticatedState();
  }

  try {
    const profile = await getOwnDiscoveryProfile(userId);
    if (!profile) {
      return {
        ok: false,
        message: "Lege zuerst ein Discovery-Profil als Entwurf an.",
        issues: ["Lege zuerst ein Discovery-Profil als Entwurf an."],
      };
    }

    const issues = getDiscoveryProfilePublishIssues(profile);
    if (issues.length > 0) {
      return {
        ok: false,
        message: "Dein Profil ist noch nicht bereit zur Veröffentlichung.",
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
      message: "Dein Discovery-Profil ist jetzt aktiv.",
    };
  } catch (error) {
    const issues = getPublishabilityIssues(error);
    if (issues.length > 0) {
      return {
        ok: false,
        message: "Dein Profil ist noch nicht bereit zur Veröffentlichung.",
        issues,
      };
    }

    return {
      ok: false,
      message: "Dein Discovery-Profil konnte gerade nicht veröffentlicht werden.",
    };
  }
}

export async function publishDiscoveryProfileFromFormAction(
  formData: FormData
): Promise<DiscoveryActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthenticatedState();
  }

  try {
    const input = normalizeDiscoveryProfileInput(parseDiscoveryProfileFormData(formData));
    const draftInput = {
      ...input,
      status: "draft" as const,
      publishedAt: null,
    };

    await upsertOwnDiscoveryProfile(userId, draftInput);

    const issues = getDiscoveryProfilePublishIssues(draftInput);
    if (issues.length > 0) {
      revalidateDiscoveryPaths();
      return {
        ok: false,
        message: "Dein Profil ist noch nicht bereit zur Veröffentlichung.",
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
      message: "Dein Discovery-Profil ist jetzt aktiv.",
    };
  } catch (error) {
    const issues = getPublishabilityIssues(error);
    if (issues.length > 0) {
      return {
        ok: false,
        message: "Dein Profil ist noch nicht bereit zur Veröffentlichung.",
        issues,
      };
    }

    return {
      ok: false,
      message: "Dein Discovery-Profil konnte gerade nicht veröffentlicht werden.",
    };
  }
}

export async function pauseDiscoveryProfileAction(): Promise<DiscoveryActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthenticatedState();
  }

  try {
    const profile = await getOwnDiscoveryProfile(userId);
    if (!profile) {
      return {
        ok: false,
        message: "Es gibt noch kein Discovery-Profil, das pausiert werden kann.",
      };
    }

    await upsertOwnDiscoveryProfile(userId, {
      ...profile,
      status: "paused",
    });

    revalidateDiscoveryPaths();
    return {
      ok: true,
      message: "Deine Co-Founder-Suche ist pausiert.",
    };
  } catch {
    return {
      ok: false,
      message: "Deine Co-Founder-Suche konnte gerade nicht pausiert werden.",
    };
  }
}

export async function saveDiscoveryPreferencesAction(
  formData: FormData
): Promise<DiscoveryActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return unauthenticatedState();
  }

  try {
    const input = normalizeDiscoveryPreferencesInput(parseDiscoveryPreferencesFormData(formData));
    await upsertOwnSearchPreferences(userId, input);

    revalidateDiscoveryPaths();
    return {
      ok: true,
      message: "Deine Suchprioritäten wurden gespeichert.",
    };
  } catch {
    return {
      ok: false,
      message: "Deine Suchprioritäten konnten gerade nicht gespeichert werden.",
    };
  }
}
