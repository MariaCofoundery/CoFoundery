export const PROFILE_ROLE_OPTIONS = ["founder", "advisor"] as const;

export type ProfileRole = (typeof PROFILE_ROLE_OPTIONS)[number];

function isProfileRole(value: string): value is ProfileRole {
  return PROFILE_ROLE_OPTIONS.includes(value as ProfileRole);
}

export function normalizeProfileRoles(input: unknown): ProfileRole[] {
  const values = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? [input]
      : [];

  const normalized = values
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter((value): value is ProfileRole => isProfileRole(value));

  const unique = Array.from(new Set(normalized));
  return unique.length > 0 ? unique : ["founder"];
}

export function hasProfileRole(roles: unknown, role: ProfileRole) {
  return normalizeProfileRoles(roles).includes(role);
}

export function profileRoleLabel(role: ProfileRole) {
  return role === "advisor" ? "Advisor" : "Founder";
}
