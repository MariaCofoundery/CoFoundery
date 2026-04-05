import { normalizeProfileRoles } from "@/features/profile/profileRoles";

export type ProfileBasicsRow = {
  display_name: string | null;
  focus_skill: string | null;
  intention: string | null;
  roles: string[] | null;
  avatar_id: string | null;
  avatar_url: string | null;
  headline: string | null;
  experience: string[] | null;
  skills: string[] | null;
  linkedin_url: string | null;
  imported_at: string | null;
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

const OPTIONAL_PROFILE_COLUMNS = [
  "roles",
  "avatar_id",
  "avatar_url",
  "headline",
  "experience",
  "skills",
  "linkedin_url",
  "imported_at",
] as const;

type OptionalProfileColumn = (typeof OPTIONAL_PROFILE_COLUMNS)[number];

function isMissingProfileColumnError(
  error: { message?: string | null } | null | undefined,
  column: string
) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes(`could not find the '${column}' column of 'profiles'`) ||
    message.includes(`could not find the "${column}" column of "profiles"`) ||
    message.includes(`column profiles.${column} does not exist`) ||
    (message.includes("schema cache") &&
      message.includes(column.toLowerCase()) &&
      message.includes("profiles"))
  );
}

function getMissingOptionalProfileColumn(
  error: { message?: string | null } | null | undefined
): OptionalProfileColumn | null {
  for (const column of OPTIONAL_PROFILE_COLUMNS) {
    if (isMissingProfileColumnError(error, column)) {
      return column;
    }
  }

  return null;
}

export function isMissingRolesColumnError(error: { message?: string | null } | null | undefined) {
  return getMissingOptionalProfileColumn(error) === "roles";
}

function normalizeStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry.length > 0);
  return normalized.length > 0 ? normalized : [];
}

function buildProfileSelectColumns(optionalColumns: ReadonlySet<OptionalProfileColumn>) {
  return [
    "display_name",
    "focus_skill",
    "intention",
    ...OPTIONAL_PROFILE_COLUMNS.filter((column) => optionalColumns.has(column)),
  ].join(", ");
}

function normalizeProfileRow(
  row: Partial<Record<keyof ProfileBasicsRow, unknown>>,
  optionalColumns: ReadonlySet<OptionalProfileColumn>
): ProfileBasicsRow {
  return {
    display_name: typeof row.display_name === "string" ? row.display_name : null,
    focus_skill: typeof row.focus_skill === "string" ? row.focus_skill : null,
    intention: typeof row.intention === "string" ? row.intention : null,
    roles: optionalColumns.has("roles") ? normalizeProfileRoles(row.roles ?? null) : null,
    avatar_id: optionalColumns.has("avatar_id") && typeof row.avatar_id === "string" ? row.avatar_id : null,
    avatar_url: optionalColumns.has("avatar_url") && typeof row.avatar_url === "string" ? row.avatar_url : null,
    headline: optionalColumns.has("headline") && typeof row.headline === "string" ? row.headline : null,
    experience: optionalColumns.has("experience") ? normalizeStringArray(row.experience ?? null) : null,
    skills: optionalColumns.has("skills") ? normalizeStringArray(row.skills ?? null) : null,
    linkedin_url:
      optionalColumns.has("linkedin_url") && typeof row.linkedin_url === "string" ? row.linkedin_url : null,
    imported_at:
      optionalColumns.has("imported_at") && typeof row.imported_at === "string" ? row.imported_at : null,
  };
}

export async function getProfileBasicsRow(
  supabase: SupabaseLikeClient,
  userId: string
): Promise<ProfileBasicsRow | null> {
  const profilesTable = supabase.from("profiles") as ProfilesTableAccess;
  const optionalColumns = new Set<OptionalProfileColumn>(OPTIONAL_PROFILE_COLUMNS);

  while (true) {
    const result = await profilesTable
      .select(buildProfileSelectColumns(optionalColumns))
      .eq("user_id", userId)
      .maybeSingle();

    if (!result.error) {
      const row = (result.data as Partial<Record<keyof ProfileBasicsRow, unknown>> | null) ?? null;
      return row ? normalizeProfileRow(row, optionalColumns) : null;
    }

    const missingColumn = getMissingOptionalProfileColumn(result.error);
    if (!missingColumn || !optionalColumns.has(missingColumn)) {
      throw new Error(result.error.message ?? "profile_load_failed");
    }

    optionalColumns.delete(missingColumn);
  }
}

export async function upsertProfileBasicsRow(
  supabase: SupabaseLikeClient,
  values: ProfileBasicsRow & { user_id: string; updated_at: string }
) {
  const profilesTable = supabase.from("profiles") as ProfilesTableAccess;
  const omittedColumns = new Set<OptionalProfileColumn>();

  while (true) {
    const { roles: _roles, avatar_id: _avatarId, avatar_url: _avatarUrl, headline: _headline, experience: _experience, skills: _skills, linkedin_url: _linkedinUrl, imported_at: _importedAt, ...baseValues } =
      values;
    void _roles;
    void _avatarId;
    void _avatarUrl;
    void _headline;
    void _experience;
    void _skills;
    void _linkedinUrl;
    void _importedAt;

    const result = await profilesTable.upsert(
      {
        ...baseValues,
        ...(omittedColumns.has("roles") ? {} : { roles: values.roles }),
        ...(omittedColumns.has("avatar_id") ? {} : { avatar_id: values.avatar_id }),
        ...(omittedColumns.has("avatar_url") ? {} : { avatar_url: values.avatar_url }),
        ...(omittedColumns.has("headline") ? {} : { headline: values.headline }),
        ...(omittedColumns.has("experience") ? {} : { experience: values.experience }),
        ...(omittedColumns.has("skills") ? {} : { skills: values.skills }),
        ...(omittedColumns.has("linkedin_url") ? {} : { linkedin_url: values.linkedin_url }),
        ...(omittedColumns.has("imported_at") ? {} : { imported_at: values.imported_at }),
      },
      { onConflict: "user_id" }
    );

    if (!result.error) {
      return result;
    }

    const missingColumn = getMissingOptionalProfileColumn(result.error);
    if (!missingColumn || omittedColumns.has(missingColumn)) {
      return result;
    }

    omittedColumns.add(missingColumn);
  }
}
