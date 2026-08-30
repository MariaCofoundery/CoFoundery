import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type DeleteFounderAccountRpcSummary = {
  remainingInvitations?: number | null;
  remainingReportRuns?: number | null;
  remainingAdvisorLinks?: number | null;
  remainingWorkbooks?: number | null;
  remainingAdvisorPayloadResidues?: number | null;
  remainingAssessments?: number | null;
  remainingProfiles?: number | null;
  remainingResearchEvents?: number | null;
  remainingProductFeedback?: number | null;
  remainingMatchingInputs?: number | null;
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

async function deleteOwnedAvatarObjects(
  privileged: NonNullable<ReturnType<typeof createPrivilegedClient>>,
  userId: string
) {
  const { data, error } = await privileged.storage.from("avatars").list(userId, {
    limit: 1000,
  });
  if (error) {
    return false;
  }

  const objectPaths = (data ?? [])
    .filter((object) => object.name && object.id)
    .map((object) => `${userId}/${object.name}`);
  if (objectPaths.length === 0) {
    return true;
  }

  const removal = await privileged.storage.from("avatars").remove(objectPaths);
  return !removal.error;
}

export async function deleteFounderAccount(userId: string): Promise<DeleteFounderAccountResult> {
  const privileged = createPrivilegedClient();
  if (!privileged) {
    return { ok: false, error: "missing_service_role" };
  }

  // Storage is outside the database transaction. Remove only the authenticated
  // founder's own avatar prefix before the atomic DB/auth cleanup and stop safely
  // if Storage cannot confirm the deletion.
  if (!(await deleteOwnedAvatarObjects(privileged, userId))) {
    console.error("deleteFounderAccount avatar cleanup failed");
    return { ok: false, error: "cleanup_failed" };
  }

  const { data, error } = await privileged.rpc("delete_founder_account_data", {
    p_user_id: userId,
    p_research_hash_salt: process.env.RESEARCH_HASH_SALT?.trim() || null,
  });

  if (error) {
    console.error("deleteFounderAccount rpc failed", {
      code: error.code,
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
    !isZero(summary.remainingAdvisorPayloadResidues) ||
    !isZero(summary.remainingAssessments) ||
    !isZero(summary.remainingProfiles)
    || !isZero(summary.remainingResearchEvents)
    || !isZero(summary.remainingProductFeedback)
    || !isZero(summary.remainingMatchingInputs)
  ) {
    console.error("deleteFounderAccount verification failed");
    return { ok: false, error: "cleanup_failed" };
  }

  return {
    ok: true,
    summary,
  };
}
