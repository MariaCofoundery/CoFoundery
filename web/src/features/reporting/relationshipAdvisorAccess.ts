import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type RelationshipAdvisorStatus = "pending" | "approved" | "invited" | "linked" | "revoked";

export type RelationshipAdvisorRow = {
  id: string;
  relationship_id: string;
  advisor_user_id: string | null;
  advisor_name: string | null;
  advisor_email: string | null;
  status: RelationshipAdvisorStatus;
  founder_a_approved: boolean;
  founder_b_approved: boolean;
  approved_at: string | null;
  invited_at: string | null;
  linked_at: string | null;
  revoked_at: string | null;
  requested_by_user_id: string | null;
  source_invitation_id: string | null;
  invite_token_hash: string | null;
  created_at: string;
  updated_at: string;
};

type InvitationRelationshipRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  relationship_id: string | null;
};

type LegacyWorkbookAdvisorRow = {
  invitation_id: string;
  advisor_user_id: string | null;
  advisor_name: string | null;
  token_hash: string | null;
  founder_a_approved: boolean;
  founder_b_approved: boolean;
  requested_by: string | null;
  approved_at: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseLikeClient = Pick<SupabaseServerClient, "from">;

export function createPrivilegedAccessClient(): SupabaseLikeClient | null {
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

export function deriveRelationshipAdvisorStatus(params: {
  founderAApproved: boolean;
  founderBApproved: boolean;
  advisorUserId: string | null;
  inviteTokenHash?: string | null;
  invitedAt?: string | null;
  revokedAt?: string | null;
}): RelationshipAdvisorStatus {
  if (params.revokedAt) {
    return "revoked";
  }
  if (params.advisorUserId) {
    return "linked";
  }
  if (params.invitedAt || params.inviteTokenHash) {
    return "invited";
  }
  if (params.founderAApproved && params.founderBApproved) {
    return "approved";
  }
  return "pending";
}

export async function resolveRelationshipIdForInvitation(
  invitationId: string,
  client: SupabaseLikeClient
): Promise<string | null> {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId) {
    return null;
  }

  const { data, error } = await client
    .from("invitations")
    .select("id, inviter_user_id, invitee_user_id, relationship_id")
    .eq("id", normalizedInvitationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const invitation = data as InvitationRelationshipRow;
  if (invitation.relationship_id) {
    return invitation.relationship_id;
  }

  const { data: reportRunData, error: reportRunError } = await client
    .from("report_runs")
    .select("relationship_id, created_at")
    .eq("invitation_id", normalizedInvitationId)
    .not("relationship_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!reportRunError) {
    const reportRunRelationshipId =
      (reportRunData as { relationship_id?: string | null } | null)?.relationship_id ?? null;
    if (reportRunRelationshipId) {
      return reportRunRelationshipId;
    }
  }

  if (!invitation.inviter_user_id || !invitation.invitee_user_id) {
    return null;
  }

  const { data: relationshipData, error: relationshipError } = await client
    .from("relationships")
    .select("id")
    .or(
      `and(user_a_id.eq.${invitation.inviter_user_id},user_b_id.eq.${invitation.invitee_user_id}),and(user_a_id.eq.${invitation.invitee_user_id},user_b_id.eq.${invitation.inviter_user_id})`
    )
    .maybeSingle();

  if (relationshipError || !relationshipData) {
    return null;
  }

  return (relationshipData as { id?: string } | null)?.id ?? null;
}

export async function syncRelationshipAdvisorFromLegacyInvitation(
  invitationId: string,
  client: SupabaseLikeClient
): Promise<
  | { ok: true; row: RelationshipAdvisorRow | null }
  | { ok: false; reason: "missing_relationship" | "legacy_not_found" | "upsert_failed" }
> {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId) {
    return { ok: false, reason: "legacy_not_found" };
  }

  const [{ data: legacyData, error: legacyError }, relationshipId] = await Promise.all([
    client
      .from("founder_alignment_workbook_advisors")
      .select(
        "invitation_id, advisor_user_id, advisor_name, token_hash, founder_a_approved, founder_b_approved, requested_by, approved_at, claimed_at, created_at, updated_at"
      )
      .eq("invitation_id", normalizedInvitationId)
      .maybeSingle(),
    resolveRelationshipIdForInvitation(normalizedInvitationId, client),
  ]);

  if (legacyError || !legacyData) {
    return { ok: false, reason: "legacy_not_found" };
  }

  if (!relationshipId) {
    return { ok: false, reason: "missing_relationship" };
  }

  const legacy = legacyData as LegacyWorkbookAdvisorRow;
  const payload = {
    relationship_id: relationshipId,
    advisor_user_id: legacy.advisor_user_id,
    advisor_name: legacy.advisor_name,
    advisor_email: null,
    status: deriveRelationshipAdvisorStatus({
      founderAApproved: legacy.founder_a_approved,
      founderBApproved: legacy.founder_b_approved,
      advisorUserId: legacy.advisor_user_id,
      inviteTokenHash: legacy.token_hash,
      invitedAt: legacy.advisor_user_id ? null : legacy.approved_at ?? legacy.updated_at,
    }),
    founder_a_approved: legacy.founder_a_approved,
    founder_b_approved: legacy.founder_b_approved,
    approved_at: legacy.approved_at,
    invited_at: legacy.advisor_user_id ? null : legacy.approved_at ?? legacy.updated_at,
    linked_at: legacy.advisor_user_id ? legacy.claimed_at ?? legacy.updated_at : null,
    revoked_at: null,
    requested_by_user_id: legacy.requested_by,
    source_invitation_id: legacy.invitation_id,
    invite_token_hash: legacy.token_hash,
    created_at: legacy.created_at,
    updated_at: legacy.updated_at,
  };

  const existingQuery = client
    .from("relationship_advisors")
    .select(
      "id, relationship_id, advisor_user_id, advisor_name, advisor_email, status, founder_a_approved, founder_b_approved, approved_at, invited_at, linked_at, revoked_at, requested_by_user_id, source_invitation_id, invite_token_hash, created_at, updated_at"
    )
    .eq("source_invitation_id", legacy.invitation_id);

  const { data: existingRow, error: existingError } = await (legacy.advisor_user_id
    ? existingQuery.eq("advisor_user_id", legacy.advisor_user_id).maybeSingle()
    : existingQuery.is("advisor_user_id", null).maybeSingle());

  if (existingError) {
    return { ok: false, reason: "upsert_failed" };
  }

  const writeQuery = existingRow
    ? client
        .from("relationship_advisors")
        .update(payload)
        .eq("id", (existingRow as { id: string }).id)
    : client.from("relationship_advisors").insert(payload);

  const { data: persistedRow, error: writeError } = await writeQuery
    .select(
      "id, relationship_id, advisor_user_id, advisor_name, advisor_email, status, founder_a_approved, founder_b_approved, approved_at, invited_at, linked_at, revoked_at, requested_by_user_id, source_invitation_id, invite_token_hash, created_at, updated_at"
    )
    .maybeSingle();

  if (writeError) {
    return { ok: false, reason: "upsert_failed" };
  }

  return {
    ok: true,
    row: (persistedRow as RelationshipAdvisorRow | null) ?? null,
  };
}

export async function hasAdvisorAccessToRelationship(
  userId: string,
  relationshipId: string,
  client?: SupabaseLikeClient
): Promise<boolean> {
  const normalizedUserId = userId.trim();
  const normalizedRelationshipId = relationshipId.trim();
  if (!normalizedUserId || !normalizedRelationshipId) {
    return false;
  }

  const resolvedClient = client ?? (await createClient());
  const { data, error } = await resolvedClient
    .from("relationship_advisors")
    .select("id")
    .eq("relationship_id", normalizedRelationshipId)
    .eq("advisor_user_id", normalizedUserId)
    .in("status", ["approved", "invited", "linked"])
    .eq("founder_a_approved", true)
    .eq("founder_b_approved", true)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  return !error && Boolean((data as { id?: string } | null)?.id);
}

export async function listRelationshipAdvisorsForUser(
  userId: string,
  client?: SupabaseLikeClient
): Promise<RelationshipAdvisorRow[]> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return [];
  }

  const resolvedClient = client ?? (await createClient());
  const { data, error } = await resolvedClient
    .from("relationship_advisors")
    .select(
      "id, relationship_id, advisor_user_id, advisor_name, advisor_email, status, founder_a_approved, founder_b_approved, approved_at, invited_at, linked_at, revoked_at, requested_by_user_id, source_invitation_id, invite_token_hash, created_at, updated_at"
    )
    .eq("advisor_user_id", normalizedUserId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as RelationshipAdvisorRow[];
}

export async function listRelationshipAdvisorsForRelationship(
  relationshipId: string,
  client?: SupabaseLikeClient
): Promise<RelationshipAdvisorRow[]> {
  const normalizedRelationshipId = relationshipId.trim();
  if (!normalizedRelationshipId) {
    return [];
  }

  const resolvedClient = client ?? (await createClient());
  const { data, error } = await resolvedClient
    .from("relationship_advisors")
    .select(
      "id, relationship_id, advisor_user_id, advisor_name, advisor_email, status, founder_a_approved, founder_b_approved, approved_at, invited_at, linked_at, revoked_at, requested_by_user_id, source_invitation_id, invite_token_hash, created_at, updated_at"
    )
    .eq("relationship_id", normalizedRelationshipId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as RelationshipAdvisorRow[];
}
