import { isCoreProfileComplete } from "@/features/profile/profileCompletion";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { hasProfileRole } from "@/features/profile/profileRoles";
import { resolveProductEntryPath } from "@/features/auth/productEntry";

type SupabaseAuthUserClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: { message?: string | null } | null;
    }>;
  };
  from: (table: string) => unknown;
  rpc: (fn: string) => PromiseLike<{ data: unknown; error: { message?: string | null } | null }>;
};

function normalizePath(value: string | null | undefined, fallback = "/dashboard") {
  const trimmed = (value ?? "").trim();
  return trimmed.startsWith("/") ? trimmed : fallback;
}

export function isJoinContinuationPath(path: string) {
  return path === "/join" || path.startsWith("/join/");
}

export function isAdvisorInviteContinuationPath(path: string) {
  return path === "/advisor/invite/continue" || path.startsWith("/advisor/invite/continue?");
}

export function buildWelcomeRedirectPath(nextPath: string) {
  const normalizedNext = normalizePath(nextPath);
  if (normalizedNext === "/dashboard") {
    return "/welcome";
  }

  return `/welcome?next=${encodeURIComponent(normalizedNext)}`;
}

function withProfileIntent(path: string, intent: "founder" | "advisor" | null) {
  if (!intent) return path;
  const url = new URL(path, "https://cofoundery.local");
  url.searchParams.set("intent", intent);
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function resolvePostAuthRedirectPath(
  supabase: SupabaseAuthUserClient,
  nextPath: string,
  profileSignupIntent: "founder" | "advisor" | null = null
) {
  const normalizedNext = normalizePath(nextPath);

  if (isJoinContinuationPath(normalizedNext) || isAdvisorInviteContinuationPath(normalizedNext)) {
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
  const [hasFounder, hasAdvisor] = [
    hasProfileRole(profile?.roles, "founder"),
    hasProfileRole(profile?.roles, "advisor"),
  ];
  let hasNetwork = false;
  let hasNetworkAccount = false;
  let networkProfileReady = false;
  try {
    const [networkResult, networkAccountResult] = await Promise.all([
      supabase.rpc("is_network_member"),
      supabase.rpc("has_network_account"),
    ]);
    hasNetwork = networkResult.data === true;
    hasNetworkAccount = networkAccountResult.data === true;
    if (hasNetwork && !hasFounder && !hasAdvisor) {
      const profileResult = await (supabase.from("network_profiles") as {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            maybeSingle: () => Promise<{ data: { status?: string | null } | null; error: unknown }>;
          };
        };
      }).select("status").eq("user_id", user.id).maybeSingle();
      networkProfileReady = !profileResult.error && profileResult.data?.status === "active";
    }
  } catch {
    hasNetwork = false;
    hasNetworkAccount = false;
  }

  return resolveProductEntryPath(normalizedNext, {
    hasFounder,
    hasAdvisor,
    hasNetwork,
    hasNetworkAccount,
    networkProfileReady,
    profileOnboardingAllowed: profileSignupIntent !== null,
    coreProfileComplete: isCoreProfileComplete(profile),
  }, withProfileIntent(buildWelcomeRedirectPath(normalizedNext), profileSignupIntent));
}
