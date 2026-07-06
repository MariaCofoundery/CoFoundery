import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  isMatchingWorkspaceStatus,
  type MatchingWorkspace,
} from "@/features/matchingCore/matchingWorkspaceTypes";
import {
  isMatchingWorkspaceAgreementStatus,
  normalizeMatchingWorkspaceAgreementSections,
  type MatchingWorkspaceAgreement,
  type MatchingWorkspaceAgreementSummary,
} from "@/features/matchingCore/matchingWorkspaceAgreementTypes";

const MATCHING_WORKSPACE_COLUMNS = [
  "id",
  "matching_session_id",
  "matching_report_run_id",
  "relationship_id",
  "created_by_user_id",
  "status",
  "created_at",
  "updated_at",
].join(", ");

const MATCHING_WORKSPACE_AGREEMENT_COLUMNS = [
  "id",
  "matching_workspace_id",
  "relationship_id",
  "status",
  "sections",
  "created_by_user_id",
  "updated_by_user_id",
  "created_at",
  "updated_at",
].join(", ");

type SupabaseError = {
  message?: string | null;
};

type MatchingWorkspaceRow = {
  id: string;
  matching_session_id: string;
  matching_report_run_id: string;
  relationship_id: string;
  created_by_user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type MatchingWorkspaceAgreementRow = {
  id: string;
  matching_workspace_id: string;
  relationship_id: string;
  status: string;
  sections: unknown;
  created_by_user_id: string;
  updated_by_user_id: string;
  created_at: string;
  updated_at: string;
};

type CreateAgreementRpcRow = {
  agreement_id: string;
  matching_workspace_id: string;
  status: string;
};

function getErrorMessage(error: SupabaseError | null | undefined, fallback: string) {
  return error?.message ?? fallback;
}

function assertUserId(userId: string) {
  const normalized = userId.trim();
  if (!normalized) {
    throw new Error("matching_workspace_agreement_missing_user_id");
  }
  return normalized;
}

function assertWorkspaceId(workspaceId: string) {
  const normalized = workspaceId.trim();
  if (!normalized) {
    throw new Error("matching_workspace_agreement_missing_workspace_id");
  }
  return normalized;
}

function mapWorkspace(row: MatchingWorkspaceRow): MatchingWorkspace {
  if (!isMatchingWorkspaceStatus(row.status)) {
    throw new Error("matching_workspace_status_invalid");
  }

  return {
    id: row.id,
    matchingSessionId: row.matching_session_id,
    matchingReportRunId: row.matching_report_run_id,
    relationshipId: row.relationship_id,
    createdByUserId: row.created_by_user_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAgreement(row: MatchingWorkspaceAgreementRow): MatchingWorkspaceAgreement {
  if (!isMatchingWorkspaceAgreementStatus(row.status)) {
    throw new Error("matching_workspace_agreement_status_invalid");
  }

  return {
    id: row.id,
    matchingWorkspaceId: row.matching_workspace_id,
    relationshipId: row.relationship_id,
    status: row.status,
    sections: normalizeMatchingWorkspaceAgreementSections(row.sections),
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseCreateAgreementResult(value: unknown): CreateAgreementRpcRow | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") {
    return null;
  }

  const typed = row as Partial<CreateAgreementRpcRow>;
  if (
    typeof typed.agreement_id !== "string" ||
    typeof typed.matching_workspace_id !== "string" ||
    typeof typed.status !== "string"
  ) {
    return null;
  }

  return {
    agreement_id: typed.agreement_id,
    matching_workspace_id: typed.matching_workspace_id,
    status: typed.status,
  };
}

export async function getMatchingWorkspaceAgreementForWorkspace(
  workspaceId: string,
  userId: string
): Promise<MatchingWorkspaceAgreementSummary | null> {
  const normalizedWorkspaceId = assertWorkspaceId(workspaceId);
  const normalizedUserId = assertUserId(userId);
  const supabase = await createClient();

  const { data: workspaceData, error: workspaceError } = await supabase
    .from("matching_workspaces")
    .select(MATCHING_WORKSPACE_COLUMNS)
    .eq("id", normalizedWorkspaceId)
    .maybeSingle();

  if (workspaceError) {
    throw new Error(getErrorMessage(workspaceError, "matching_workspace_agreement_workspace_load_failed"));
  }

  if (!workspaceData) {
    return null;
  }

  const workspace = mapWorkspace(workspaceData as unknown as MatchingWorkspaceRow);
  const { data: isParticipant, error: participantError } = await supabase.rpc(
    "is_matching_session_active_participant",
    {
      p_matching_session_id: workspace.matchingSessionId,
      p_user_id: normalizedUserId,
    }
  );

  if (participantError) {
    throw new Error(
      getErrorMessage(participantError, "matching_workspace_agreement_participant_check_failed")
    );
  }

  if (isParticipant !== true) {
    return null;
  }

  const { data: agreementData, error: agreementError } = await supabase
    .from("matching_workspace_agreements")
    .select(MATCHING_WORKSPACE_AGREEMENT_COLUMNS)
    .eq("matching_workspace_id", normalizedWorkspaceId)
    .maybeSingle();

  if (agreementError) {
    throw new Error(getErrorMessage(agreementError, "matching_workspace_agreement_load_failed"));
  }

  return {
    workspace,
    agreement: agreementData
      ? mapAgreement(agreementData as unknown as MatchingWorkspaceAgreementRow)
      : null,
  };
}

export async function createOrGetMatchingWorkspaceAgreement(params: {
  workspaceId: string;
  userId: string;
}): Promise<MatchingWorkspaceAgreementSummary> {
  const normalizedWorkspaceId = assertWorkspaceId(params.workspaceId);
  const normalizedUserId = assertUserId(params.userId);
  const existing = await getMatchingWorkspaceAgreementForWorkspace(
    normalizedWorkspaceId,
    normalizedUserId
  );
  if (existing?.agreement) {
    return existing;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_or_get_matching_workspace_agreement", {
    p_matching_workspace_id: normalizedWorkspaceId,
  });

  if (error) {
    throw new Error(getErrorMessage(error, "matching_workspace_agreement_create_failed"));
  }

  const result = parseCreateAgreementResult(data);
  if (!result || result.matching_workspace_id !== normalizedWorkspaceId) {
    throw new Error("matching_workspace_agreement_create_failed");
  }

  const summary = await getMatchingWorkspaceAgreementForWorkspace(
    normalizedWorkspaceId,
    normalizedUserId
  );
  if (!summary?.agreement || summary.agreement.id !== result.agreement_id) {
    throw new Error("matching_workspace_agreement_create_failed");
  }

  return summary;
}
