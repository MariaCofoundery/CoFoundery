type SupabaseAuthCleanupClient = {
  auth: {
    updateUser: (params: {
      data: Record<string, unknown>;
    }) => Promise<{ error: { message?: string | null } | null }>;
  };
};

type AuthUserLike = {
  user_metadata?: Record<string, unknown> | null;
} | null;

function readStringMetadata(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

export function hasOversizedAvatarMetadata(user: AuthUserLike) {
  const avatarUrl = readStringMetadata(user?.user_metadata, "avatar_url");
  return avatarUrl?.startsWith("data:image/") ?? false;
}

export async function cleanupOversizedAvatarMetadata(
  supabase: SupabaseAuthCleanupClient,
  user: AuthUserLike
) {
  if (!hasOversizedAvatarMetadata(user)) {
    return null;
  }

  const result = await supabase.auth.updateUser({
    data: {
      avatar_url: null,
    },
  });

  return result.error?.message ?? null;
}
