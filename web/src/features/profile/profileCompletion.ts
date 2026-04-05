import { normalizeProfileRoles, profileRoleLabel, type ProfileRole } from "@/features/profile/profileRoles";
import type { ProfileBasicsRow } from "@/features/profile/profileData";

const CORE_COMPLETION_TARGET = 40;
const EXTENDED_COMPLETION_TARGET = 60;

const EXTENDED_WEIGHTS = {
  headline: 10,
  experience: 20,
  skills: 20,
  linkedin_url: 5,
  imported_at: 5,
} as const;

export type ProfileCoreModel = {
  name: string | null;
  role: ProfileRole;
  focus: string | null;
  intention: string | null;
  avatarId: string | null;
};

export type ProfileExtendedModel = {
  headline: string | null;
  experience: string[];
  skills: string[];
  linkedin_url: string | null;
  imported_at: string | null;
};

export type ProfileModel = {
  core: ProfileCoreModel;
  extended: ProfileExtendedModel;
};

export type ProfileCompletion = {
  corePercent: number;
  extendedPercent: number;
  percent: number;
  isCoreComplete: boolean;
  hasExtendedProfile: boolean;
  ctaLabel: string | null;
};

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeStringArray(values: string[] | null | undefined) {
  return (values ?? [])
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length > 0);
}

export function buildProfileModel(profile: ProfileBasicsRow | null): ProfileModel {
  const roles = normalizeProfileRoles(profile?.roles ?? null);
  return {
    core: {
      name: normalizeText(profile?.display_name),
      role: roles[0] ?? "founder",
      focus: normalizeText(profile?.focus_skill),
      intention: normalizeText(profile?.intention),
      avatarId: normalizeText(profile?.avatar_id),
    },
    extended: {
      headline: normalizeText(profile?.headline),
      experience: normalizeStringArray(profile?.experience),
      skills: normalizeStringArray(profile?.skills),
      linkedin_url: normalizeText(profile?.linkedin_url),
      imported_at: normalizeText(profile?.imported_at),
    },
  };
}

export function isCoreProfileComplete(profile: ProfileBasicsRow | null) {
  const model = buildProfileModel(profile);
  return Boolean(model.core.name && model.core.role && model.core.focus && model.core.intention);
}

export function getPrimaryProfileRoleLabel(profile: ProfileBasicsRow | null) {
  return profileRoleLabel(buildProfileModel(profile).core.role);
}

export function computeProfileCompletion(profile: ProfileBasicsRow | null): ProfileCompletion {
  const model = buildProfileModel(profile);
  const coreChecks = [model.core.name, model.core.role, model.core.focus, model.core.intention];
  const completedCoreChecks = coreChecks.filter(Boolean).length;
  const corePercent = Math.round((completedCoreChecks / coreChecks.length) * CORE_COMPLETION_TARGET);

  const extendedPercent =
    (model.extended.headline ? EXTENDED_WEIGHTS.headline : 0) +
    (model.extended.experience.length > 0 ? EXTENDED_WEIGHTS.experience : 0) +
    (model.extended.skills.length > 0 ? EXTENDED_WEIGHTS.skills : 0) +
    (model.extended.linkedin_url ? EXTENDED_WEIGHTS.linkedin_url : 0) +
    (model.extended.imported_at ? EXTENDED_WEIGHTS.imported_at : 0);

  const percent = Math.min(100, corePercent + extendedPercent);
  return {
    corePercent,
    extendedPercent,
    percent,
    isCoreComplete: completedCoreChecks === coreChecks.length,
    hasExtendedProfile:
      Boolean(model.extended.headline) ||
      model.extended.experience.length > 0 ||
      model.extended.skills.length > 0 ||
      Boolean(model.extended.linkedin_url) ||
      Boolean(model.extended.imported_at),
    ctaLabel: completedCoreChecks === coreChecks.length && percent < 100 ? "Profil vervollständigen" : null,
  };
}
