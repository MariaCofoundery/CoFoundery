import { normalizeProfileRoles } from "@/features/profile/profileRoles";

export type ProfileBasicsRow = {
  display_name: string | null;
  focus_skill: string | null;
  intention: string | null;
  roles: string[] | null;
};

type SupabaseLikeClient = {
  from: (table: string) => unknown;
};

type ProfilesTableAccess = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{ data: unknown; error: { message?: string | null } | null }>;
    };
  };
  upsert: (
    values: Record<string, unknown>,
    options: { onConflict: string }
  ) => Promise<{ error: { message?: string | null } | null }>;
};

export function isMissingRolesColumnError(error: { message?: string | null } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes("could not find the 'roles' column of 'profiles'") ||
    message.includes('could not find the "roles" column of "profiles"') ||
    message.includes("column profiles.roles does not exist") ||
    message.includes("schema cache")
  );
}

export async function getProfileBasicsRow(
  supabase: SupabaseLikeClient,
  userId: string
): Promise<ProfileBasicsRow | null> {
  // The helper stays intentionally tolerant because older remote schemas may still miss `roles`.
  const profilesTable = supabase.from("profiles") as ProfilesTableAccess;
  const withRolesResult = await profilesTable
    .select("display_name, focus_skill, intention, roles")
    .eq("user_id", userId)
    .maybeSingle();

  if (!withRolesResult.error) {
    const row =
      (withRolesResult.data as Omit<ProfileBasicsRow, "roles"> & { roles?: unknown } | null) ?? null;
    return row
      ? {
          display_name: row.display_name ?? null,
          focus_skill: row.focus_skill ?? null,
          intention: row.intention ?? null,
          roles: normalizeProfileRoles(row.roles ?? null),
        }
      : null;
  }

  if (!isMissingRolesColumnError(withRolesResult.error)) {
    throw new Error(withRolesResult.error.message ?? "profile_load_failed");
  }

  const withoutRoles = await profilesTable
    .select("display_name, focus_skill, intention")
    .eq("user_id", userId)
    .maybeSingle();

  if (withoutRoles.error) {
    throw new Error(withoutRoles.error.message ?? "profile_load_failed");
  }

  const row = (withoutRoles.data as Omit<ProfileBasicsRow, "roles"> | null) ?? null;
  return row
    ? {
        display_name: row.display_name ?? null,
        focus_skill: row.focus_skill ?? null,
        intention: row.intention ?? null,
        roles: null,
      }
    : null;
}

export async function upsertProfileBasicsRow(
  supabase: SupabaseLikeClient,
  values: ProfileBasicsRow & { user_id: string; updated_at: string }
) {
  const profilesTable = supabase.from("profiles") as ProfilesTableAccess;
  const withRoles = await profilesTable.upsert(values, { onConflict: "user_id" });
  if (!withRoles.error || !isMissingRolesColumnError(withRoles.error)) {
    return withRoles;
  }

  const { roles: _roles, ...withoutRoles } = values;
  void _roles;
  return profilesTable.upsert(withoutRoles, { onConflict: "user_id" });
}
