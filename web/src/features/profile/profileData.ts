import { normalizeProfileRoles } from "@/features/profile/profileRoles";

export type ProfileBasicsRow = {
  display_name: string | null;
  focus_skill: string | null;
  intention: string | null;
  roles: string[] | null;
  avatar_id: string | null;
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

function isMissingProfileColumnError(
  error: { message?: string | null } | null | undefined,
  column: string
) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes(`could not find the '${column}' column of 'profiles'`) ||
    message.includes(`could not find the "${column}" column of "profiles"`) ||
    message.includes(`column profiles.${column} does not exist`) ||
    message.includes("schema cache")
  );
}

export function isMissingRolesColumnError(error: { message?: string | null } | null | undefined) {
  return isMissingProfileColumnError(error, "roles");
}

function isMissingAvatarColumnError(error: { message?: string | null } | null | undefined) {
  return isMissingProfileColumnError(error, "avatar_id");
}

export async function getProfileBasicsRow(
  supabase: SupabaseLikeClient,
  userId: string
): Promise<ProfileBasicsRow | null> {
  // The helper stays intentionally tolerant because older remote schemas may still miss `roles`.
  const profilesTable = supabase.from("profiles") as ProfilesTableAccess;
  const withRolesResult = await profilesTable
    .select("display_name, focus_skill, intention, roles, avatar_id")
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
          avatar_id: row.avatar_id ?? null,
        }
      : null;
  }

  const missingRolesColumn = isMissingRolesColumnError(withRolesResult.error);
  const missingAvatarColumn = isMissingAvatarColumnError(withRolesResult.error);

  if (!missingRolesColumn && !missingAvatarColumn) {
    throw new Error(withRolesResult.error.message ?? "profile_load_failed");
  }

  const fallbackColumns = [
    "display_name",
    "focus_skill",
    "intention",
    missingRolesColumn ? null : "roles",
    missingAvatarColumn ? null : "avatar_id",
  ]
    .filter(Boolean)
    .join(", ");

  const fallbackResult = await profilesTable
    .select(fallbackColumns)
    .eq("user_id", userId)
    .maybeSingle();

  if (fallbackResult.error) {
    throw new Error(fallbackResult.error.message ?? "profile_load_failed");
  }

  const row =
    (fallbackResult.data as
      | (Omit<ProfileBasicsRow, "roles" | "avatar_id"> & {
          roles?: unknown;
          avatar_id?: string | null;
        })
      | null) ?? null;
  return row
    ? {
        display_name: row.display_name ?? null,
        focus_skill: row.focus_skill ?? null,
        intention: row.intention ?? null,
        roles: missingRolesColumn ? null : normalizeProfileRoles(row.roles ?? null),
        avatar_id: missingAvatarColumn ? null : row.avatar_id ?? null,
      }
    : null;
}

export async function upsertProfileBasicsRow(
  supabase: SupabaseLikeClient,
  values: ProfileBasicsRow & { user_id: string; updated_at: string }
) {
  const profilesTable = supabase.from("profiles") as ProfilesTableAccess;
  const withRoles = await profilesTable.upsert(values, { onConflict: "user_id" });
  if (!withRoles.error) {
    return withRoles;
  }

  const missingRolesColumn = isMissingRolesColumnError(withRoles.error);
  const missingAvatarColumn = isMissingAvatarColumnError(withRoles.error);
  if (!missingRolesColumn && !missingAvatarColumn) {
    return withRoles;
  }

  const { roles: _roles, avatar_id: _avatarId, ...baseValues } = values;
  void _roles;
  void _avatarId;
  return profilesTable.upsert(
    {
      ...baseValues,
      ...(missingRolesColumn ? {} : { roles: values.roles }),
      ...(missingAvatarColumn ? {} : { avatar_id: values.avatar_id }),
    },
    { onConflict: "user_id" }
  );
}
