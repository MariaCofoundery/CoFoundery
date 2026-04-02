import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type DeleteFounderAccountRpcSummary = {
  remainingInvitations?: number | null;
  remainingReportRuns?: number | null;
  remainingAdvisorLinks?: number | null;
  remainingWorkbooks?: number | null;
  remainingAssessments?: number | null;
  remainingProfiles?: number | null;
  deletedAuthUsers?: number | null;
};

export type DeleteFounderAccountResult =
  | {
      ok: true;
      summary: DeleteFounderAccountRpcSummary;
    }
  | {
      ok: false;
      error: "missing_service_role" | "cleanup_failed";
    };

function createPrivilegedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isZero(value: number | null | undefined) {
  return value === 0;
}

export async function deleteFounderAccount(userId: string): Promise<DeleteFounderAccountResult> {
  const privileged = createPrivilegedClient();
  if (!privileged) {
    return { ok: false, error: "missing_service_role" };
  }

  const { data, error } = await privileged.rpc("delete_founder_account_data", {
    p_user_id: userId,
    p_research_hash_salt: process.env.RESEARCH_HASH_SALT?.trim() || null,
  });

  if (error) {
    console.error("deleteFounderAccount rpc failed", {
      userId,
      error: error.message,
    });
    return { ok: false, error: "cleanup_failed" };
  }

  const summary = (data ?? null) as DeleteFounderAccountRpcSummary | null;
  if (
    !summary ||
    summary.deletedAuthUsers !== 1 ||
    !isZero(summary.remainingInvitations) ||
    !isZero(summary.remainingReportRuns) ||
    !isZero(summary.remainingAdvisorLinks) ||
    !isZero(summary.remainingWorkbooks) ||
    !isZero(summary.remainingAssessments) ||
    !isZero(summary.remainingProfiles)
  ) {
    console.error("deleteFounderAccount verification failed", {
      userId,
      summary,
    });
    return { ok: false, error: "cleanup_failed" };
  }

  return {
    ok: true,
    summary,
  };
}
