import { createClient } from "@/lib/supabase/server";
import {
  hasAdvisorAccessToRelationship,
  resolveRelationshipIdForInvitation,
} from "@/features/reporting/relationshipAdvisorAccess";
import { resolveWorkbookRelationshipAccess } from "@/features/reporting/workbookRelationshipAccess";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseLikeClient = Pick<SupabaseServerClient, "from">;

type RelationshipAdvisorAccessRow = {
  relationship_id: string;
};

export async function loadAdvisorRelationshipIdWithClient(
  invitationId: string,
  advisorUserId: string | null | undefined,
  supabase: SupabaseLikeClient
): Promise<string | null> {
  const normalizedInvitationId = invitationId.trim();
  const normalizedAdvisorUserId = advisorUserId?.trim() ?? "";
  if (!normalizedInvitationId || !normalizedAdvisorUserId) {
    return null;
  }

  const { data, error } = await supabase
    .from("relationship_advisors")
    .select("relationship_id")
    .eq("source_invitation_id", normalizedInvitationId)
    .eq("advisor_user_id", normalizedAdvisorUserId)
    .in("status", ["approved", "invited", "linked"])
    .eq("founder_a_approved", true)
    .eq("founder_b_approved", true)
    .is("revoked_at", null)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return ((data as RelationshipAdvisorAccessRow[])[0]?.relationship_id ?? null)?.trim() || null;
}

export async function loadReportRunRelationshipIdWithClient(
  invitationId: string,
  supabase: SupabaseLikeClient
): Promise<string | null> {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId) {
    return null;
  }

  const { data, error } = await supabase
    .from("report_runs")
    .select("relationship_id")
    .eq("invitation_id", normalizedInvitationId)
    .not("relationship_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return ((data as { relationship_id?: string | null } | null)?.relationship_id ?? null)?.trim() || null;
}

export async function resolveAdvisorRelationshipContext(params: {
  invitationId: string;
  advisorUserId: string | null | undefined;
  client: SupabaseLikeClient;
}): Promise<{
  relationshipId: string | null;
  hasRelationshipAdvisorAccess: boolean;
}> {
  const normalizedInvitationId = params.invitationId.trim();
  if (!normalizedInvitationId) {
    return {
      relationshipId: null,
      hasRelationshipAdvisorAccess: false,
    };
  }

  const [
    advisorRelationshipId,
    reportRunRelationshipId,
    invitationRelationshipId,
  ] = await Promise.all([
    loadAdvisorRelationshipIdWithClient(normalizedInvitationId, params.advisorUserId, params.client),
    loadReportRunRelationshipIdWithClient(normalizedInvitationId, params.client),
    resolveRelationshipIdForInvitation(normalizedInvitationId, params.client),
  ]);

  const candidateRelationshipId =
    advisorRelationshipId ?? reportRunRelationshipId ?? invitationRelationshipId;
  const checkedRelationshipAdvisorAccess =
    params.advisorUserId && candidateRelationshipId
      ? await hasAdvisorAccessToRelationship(
          params.advisorUserId,
          candidateRelationshipId,
          params.client
        )
      : false;

  return resolveWorkbookRelationshipAccess({
    advisorContext: true,
    relationshipIdFromAdvisorAccess: advisorRelationshipId,
    relationshipIdFromReportRun: reportRunRelationshipId,
    relationshipIdFromInvitation: invitationRelationshipId,
    hasRelationshipAdvisorAccess: checkedRelationshipAdvisorAccess,
  });
}
