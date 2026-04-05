import { isCoreProfileComplete } from "@/features/profile/profileCompletion";
import { getProfileBasicsRow } from "@/features/profile/profileData";

type SupabaseAuthUserClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: { message?: string | null } | null;
    }>;
  };
  from: (table: string) => unknown;
};

function normalizePath(value: string | null | undefined, fallback = "/dashboard") {
  const trimmed = (value ?? "").trim();
  return trimmed.startsWith("/") ? trimmed : fallback;
}

export function isJoinContinuationPath(path: string) {
  return path === "/join" || path.startsWith("/join/");
}

export function buildWelcomeRedirectPath(nextPath: string) {
  const normalizedNext = normalizePath(nextPath);
  if (normalizedNext === "/dashboard") {
    return "/welcome";
  }

  return `/welcome?next=${encodeURIComponent(normalizedNext)}`;
}

export async function resolvePostAuthRedirectPath(
  supabase: SupabaseAuthUserClient,
  nextPath: string
) {
  const normalizedNext = normalizePath(nextPath);

  if (isJoinContinuationPath(normalizedNext)) {
    return normalizedNext;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return normalizedNext;
  }

  const profile = await getProfileBasicsRow(supabase, user.id).catch(() => null);
  if (!isCoreProfileComplete(profile)) {
    return buildWelcomeRedirectPath(normalizedNext);
  }

  return normalizedNext;
}
