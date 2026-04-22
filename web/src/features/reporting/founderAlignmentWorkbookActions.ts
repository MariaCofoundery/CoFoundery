"use server";

import { randomBytes } from "crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sendAdvisorInviteEmail } from "@/lib/email/sendAdvisorInviteEmail";
import { toPublicAppUrl } from "@/lib/publicAppOrigin";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import {
  sanitizeWorkbookStructuredOutputsByStep,
  sanitizeFounderAlignmentWorkbookPayload,
  sanitizeWorkbookStepWorkspaceV2,
  type FounderAlignmentWorkbookPatch,
  type FounderAlignmentWorkbookPayload,
  type FounderAlignmentWorkbookStepId,
} from "@/features/reporting/founderAlignmentWorkbook";
import {
  buildFounderAlignmentAdvisorInvitePath,
  type FounderAlignmentWorkbookAdvisorEntry,
  hashFounderAlignmentAdvisorToken,
  type FounderAlignmentWorkbookAdvisorInviteState,
} from "@/features/reporting/founderAlignmentWorkbookAdvisor";
import { resolveAdvisorRelationshipContext } from "@/features/reporting/advisorTeamContext";
import {
  hasAdvisorAccessToRelationship,
  listRelationshipAdvisorsForRelationship,
  resolveRelationshipIdForInvitation,
  syncRelationshipAdvisorFromLegacyInvitation,
  type RelationshipAdvisorRow,
} from "@/features/reporting/relationshipAdvisorAccess";
import { trackServerResearchEvent } from "@/features/research/server";

type SaveFounderAlignmentWorkbookInput = {
  invitationId: string;
  teamContext: TeamContext;
  expectedUpdatedAt: string | null;
  patches: FounderAlignmentWorkbookPatch[];
};

type InvitationAccessRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  invitee_email: string | null;
  label: string | null;
};

type AdvisorAccessRow = {
  invitation_id: string;
  advisor_user_id: string | null;
  advisor_name: string | null;
  token_hash: string | null;
  founder_a_approved: boolean;
  founder_b_approved: boolean;
  requested_by: string;
  approved_at: string | null;
  claimed_at: string | null;
};

type AdvisorAccessClaimRow = {
  invitation_id: string;
  advisor_user_id: string | null;
  advisor_name: string | null;
  founder_a_approved: boolean;
  founder_b_approved: boolean;
  approved_at: string | null;
  claimed_at: string | null;
};

type AdvisorInviteInvitationRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  invitee_email: string | null;
  team_context: string | null;
  status: string;
};

type AdvisorInviteProfileRow = {
  user_id: string;
  display_name: string | null;
};

type AdvisorInviteReportRunRow = {
  invitation_id: string;
  created_at: string;
  payload: {
    reportType?: string | null;
  } | null;
};

type WorkbookRow = {
  payload: unknown;
  updated_at?: string | null;
};

type WorkbookViewerRole = "founderA" | "founderB" | "advisor" | "unknown";
type WorkbookFounderRole = Extract<WorkbookViewerRole, "founderA" | "founderB">;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseLikeClient = Pick<SupabaseServerClient, "from">;
type SupabaseDbClient = SupabaseLikeClient & SupabaseClient;

type AdvisorProposalDebugInfo = {
  invitationId: string;
  relationshipId: string | null;
  userId: string | null;
  founderRole: WorkbookViewerRole;
  advisorName: string | null;
  advisorEmail: string;
  validationError: string | null;
  dbError: string | null;
  repairAttempted: boolean;
  repairResult: string | null;
  finalResult: string;
};

export type SaveFounderAlignmentWorkbookResult =
  | {
      ok: true;
      updatedAt: string;
    }
  | {
      ok: false;
      reason: "missing_invitation" | "not_authenticated" | "forbidden" | "save_failed" | "stale_version";
      updatedAt?: string | null;
    };

export type PrepareFounderAlignmentAdvisorInviteResult =
  | ({
      ok: true;
    } & (
      | ({
          status: "awaiting_other_founder";
        } & FounderAlignmentWorkbookAdvisorInviteState)
      | ({
          status: "invite_ready";
          inviteUrl: string;
        } & FounderAlignmentWorkbookAdvisorInviteState)
      | ({
          status: "advisor_linked";
        } & FounderAlignmentWorkbookAdvisorInviteState)
    ))
  | {
      ok: false;
      reason:
        | "missing_invitation"
        | "not_authenticated"
        | "forbidden"
        | "invite_failed";
    };

export type ProposeFounderAlignmentAdvisorResult =
  | {
      ok: true;
      entry: FounderAlignmentWorkbookAdvisorEntry;
    }
  | {
      ok: false;
      reason:
        | "missing_invitation"
        | "not_authenticated"
        | "forbidden"
        | "missing_relationship"
        | "invalid_email"
        | "save_failed";
      debug: AdvisorProposalDebugInfo;
    };

export type ApproveFounderAlignmentAdvisorProposalResult =
  | {
      ok: true;
      entry: FounderAlignmentWorkbookAdvisorEntry;
    }
  | {
      ok: false;
      reason:
        | "missing_invitation"
        | "not_authenticated"
        | "forbidden"
        | "missing_relationship"
        | "not_found"
        | "save_failed";
    };

export type SendFounderAlignmentAdvisorInviteResult =
  | {
      ok: true;
      entry: FounderAlignmentWorkbookAdvisorEntry;
      inviteUrl: string;
    }
  | {
      ok: false;
      reason:
        | "missing_invitation"
        | "not_authenticated"
        | "forbidden"
        | "missing_relationship"
        | "not_found"
        | "missing_email"
        | "not_ready"
        | "email_failed"
        | "save_failed";
      error?: string;
    };

export type CopyFounderAlignmentAdvisorInviteLinkResult =
  | {
      ok: true;
      entry: FounderAlignmentWorkbookAdvisorEntry;
      inviteUrl: string;
    }
  | {
      ok: false;
      reason:
        | "missing_invitation"
        | "not_authenticated"
        | "forbidden"
        | "missing_relationship"
        | "not_found"
        | "not_ready"
        | "save_failed";
    };

export type FounderAlignmentAdvisorInviteLookupResult =
  | {
      status: "ready";
      invitationId: string;
      teamContext: TeamContext;
      founderAName: string;
      founderBName: string;
      founderAApproved: boolean;
      founderBApproved: boolean;
      advisorName: string | null;
      advisorLinked: boolean;
      advisorUserId: string | null;
      reportReady: boolean;
      workbookReady: boolean;
      reportType: string | null;
    }
  | {
      status: "not_found";
    };

export type ClaimFounderAlignmentAdvisorAccessResult =
  | {
      ok: true;
      row: AdvisorAccessClaimRow;
    }
  | {
      ok: false;
      reason:
        | "missing_service_role"
        | "invalid_token"
        | "already_claimed"
        | "update_failed";
    };

function createPrivilegedClient(): SupabaseDbClient | null {
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

function normalizeAdvisorEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeAdvisorName(value: string | null | undefined) {
  const normalized = (value ?? "").trim().slice(0, 120);
  return normalized.length > 0 ? normalized : null;
}

function normalizeRelationshipId(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveInvitationTeamName(label: string | null | undefined, inviteeEmail: string | null | undefined) {
  const normalizedLabel = label?.trim();
  if (!normalizedLabel) return null;

  const normalizedInviteeEmail = inviteeEmail?.trim().toLowerCase();
  if (normalizedInviteeEmail && normalizedLabel.toLowerCase() === normalizedInviteeEmail) {
    return null;
  }

  const inviteeLocalPart = normalizedInviteeEmail?.split("@")[0]?.trim();
  if (inviteeLocalPart && normalizedLabel.toLowerCase() === inviteeLocalPart) {
    return null;
  }

  return normalizedLabel;
}

function formatSupabaseError(
  error:
    | {
        code?: string | null;
        message?: string | null;
        details?: string | null;
        hint?: string | null;
      }
    | null
    | undefined
) {
  if (!error) {
    return null;
  }

  return [
    error.code?.trim(),
    error.message?.trim(),
    error.details?.trim(),
    error.hint?.trim(),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" | ");
}

function advisorSuggestedByRole(
  requestedByUserId: string | null | undefined,
  founderAUserId: string | null | undefined,
  founderBUserId: string | null | undefined
): "founderA" | "founderB" | "unknown" {
  if (requestedByUserId && founderAUserId && requestedByUserId === founderAUserId) return "founderA";
  if (requestedByUserId && founderBUserId && requestedByUserId === founderBUserId) return "founderB";
  return "unknown";
}

function mapRelationshipAdvisorToWorkbookEntry(params: {
  row: RelationshipAdvisorRow;
  invitationId: string | null;
  founderAUserId: string | null;
  founderBUserId: string | null;
  founderALabel: string;
  founderBLabel: string;
}): FounderAlignmentWorkbookAdvisorEntry {
  const suggestedByRole = advisorSuggestedByRole(
    params.row.requested_by_user_id,
    params.founderAUserId,
    params.founderBUserId
  );
  const suggestedByLabel =
    suggestedByRole === "founderA"
      ? params.founderALabel
      : suggestedByRole === "founderB"
        ? params.founderBLabel
        : "Unbekannt";

  return {
    id: params.row.id,
    relationshipId: params.row.relationship_id,
    invitationId: params.invitationId ?? params.row.source_invitation_id ?? null,
    advisorName: params.row.advisor_name ?? null,
    advisorEmail: params.row.advisor_email ?? null,
    status: params.row.status,
    founderAApproved: params.row.founder_a_approved,
    founderBApproved: params.row.founder_b_approved,
    suggestedByRole,
    suggestedByLabel,
    invitedAt: params.row.invited_at ?? null,
    linkedAt: params.row.linked_at ?? null,
  };
}

async function loadInvitationAccessRow(
  invitationId: string,
  supabase: SupabaseLikeClient
): Promise<InvitationAccessRow | null> {
  const { data, error } = await supabase
    .from("invitations")
    .select("id, inviter_user_id, invitee_user_id, invitee_email, label")
    .eq("id", invitationId)
    .maybeSingle();

  if (error || !data) return null;
  return data as InvitationAccessRow;
}

async function loadAdvisorAccessRow(
  invitationId: string,
  supabase: SupabaseLikeClient
): Promise<AdvisorAccessRow | null> {
  const { data, error } = await supabase
    .from("founder_alignment_workbook_advisors")
    .select(
      "invitation_id, advisor_user_id, advisor_name, token_hash, founder_a_approved, founder_b_approved, requested_by, approved_at, claimed_at"
    )
    .eq("invitation_id", invitationId)
    .maybeSingle();

  if (error || !data) return null;
  return data as AdvisorAccessRow;
}

async function loadAdvisorAccessRowByToken(
  token: string,
  supabase: SupabaseLikeClient
): Promise<AdvisorAccessRow | null> {
  const tokenHash = hashFounderAlignmentAdvisorToken(token);
  const { data, error } = await supabase
    .from("founder_alignment_workbook_advisors")
    .select(
      "invitation_id, advisor_user_id, advisor_name, token_hash, founder_a_approved, founder_b_approved, requested_by, approved_at, claimed_at"
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return null;
  return data as AdvisorAccessRow;
}

async function loadRelationshipAdvisorAccessRowByToken(
  token: string,
  supabase: SupabaseLikeClient
): Promise<RelationshipAdvisorRow | null> {
  const tokenHash = hashFounderAlignmentAdvisorToken(token);
  const { data, error } = await supabase
    .from("relationship_advisors")
    .select(
      "id, relationship_id, advisor_user_id, advisor_name, advisor_email, status, founder_a_approved, founder_b_approved, approved_at, invited_at, linked_at, revoked_at, requested_by_user_id, source_invitation_id, invite_token_hash, created_at, updated_at"
    )
    .eq("invite_token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return data as RelationshipAdvisorRow;
}

async function loadWorkbookRow(
  invitationId: string,
  supabase: SupabaseLikeClient
): Promise<{ payload: FounderAlignmentWorkbookPayload; updatedAt: string | null }> {
  const { data } = await supabase
    .from("founder_alignment_workbooks")
    .select("payload, updated_at")
    .eq("invitation_id", invitationId)
    .maybeSingle();

  const row = data as WorkbookRow | null;
  return {
    payload: sanitizeFounderAlignmentWorkbookPayload(row?.payload),
    updatedAt: row?.updated_at ?? null,
  };
}

async function resolveWorkbookViewerRole(
  invitationId: string,
  userId: string,
  supabase: SupabaseLikeClient,
  privileged?: SupabaseLikeClient | null
): Promise<WorkbookViewerRole> {
  const [invitation, advisorRow] = await Promise.all([
    loadInvitationAccessRow(invitationId, supabase).then((row) =>
      row ?? (privileged ? loadInvitationAccessRow(invitationId, privileged) : null)
    ),
    loadAdvisorAccessRow(invitationId, supabase).then((row) =>
      row ?? (privileged ? loadAdvisorAccessRow(invitationId, privileged) : null)
    ),
  ]);

  if (!invitation) return "unknown";
  if (invitation.inviter_user_id === userId) return "founderA";
  if (invitation.invitee_user_id === userId) return "founderB";
  const accessClient = privileged ?? supabase;
  const advisorRelationshipContext = await resolveAdvisorRelationshipContext({
    invitationId,
    advisorUserId: userId,
    client: accessClient,
  });
  if (advisorRelationshipContext.hasRelationshipAdvisorAccess) {
    return "advisor";
  }
  if (
    advisorRow?.advisor_user_id === userId &&
    advisorRow.founder_a_approved === true &&
    advisorRow.founder_b_approved === true
  ) {
    return "advisor";
  }
  return "unknown";
}

function advisorInviteStateFromRow(row: AdvisorAccessRow | null): FounderAlignmentWorkbookAdvisorInviteState {
  return {
    founderAApproved: row?.founder_a_approved ?? false,
    founderBApproved: row?.founder_b_approved ?? false,
    advisorLinked: Boolean(row?.advisor_user_id),
    advisorName: row?.advisor_name ?? null,
  };
}

function resetFounderApprovals(stepEntry: FounderAlignmentWorkbookPayload["steps"][FounderAlignmentWorkbookStepId]) {
  stepEntry.founderAApproved = false;
  stepEntry.founderBApproved = false;
}

function sanitizeDiscussionEntryPatchValue(value: unknown) {
  return sanitizeWorkbookStepWorkspaceV2({
    entries: [value],
    reactions: [],
  })?.entries[0] ?? null;
}

function sanitizeDiscussionReactionPatchValue(value: unknown) {
  const entryId =
    typeof value === "object" && value !== null && typeof (value as { entryId?: unknown }).entryId === "string"
      ? ((value as { entryId: string }).entryId)
      : "__anchor__";

  return sanitizeWorkbookStepWorkspaceV2({
    entries: [
      {
        id: entryId,
        content: "anchor",
        createdBy: "founderA",
        createdAt: new Date(0).toISOString(),
        sourceEntryId: null,
        updatedAt: null,
        updatedBy: null,
      },
    ],
    reactions: [
      typeof value === "object" && value !== null
        ? { ...(value as Record<string, unknown>), entryId }
        : { entryId: "__anchor__", userId: "founderA", signal: "important", updatedAt: null },
    ],
  })?.reactions[0] ?? null;
}

function sanitizeWorkspaceEntryUpdatePatchValue(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as {
    id?: unknown;
    content?: unknown;
    expectedUpdatedAt?: unknown;
    updatedAt?: unknown;
    updatedBy?: unknown;
  };

  if (typeof raw.id !== "string" || typeof raw.content !== "string") {
    return null;
  }

  const content = raw.content.trim();
  if (!content) {
    return null;
  }

  return {
    id: raw.id,
    content,
    expectedUpdatedAt: typeof raw.expectedUpdatedAt === "string" ? raw.expectedUpdatedAt : null,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
    updatedBy: raw.updatedBy === "founderA" || raw.updatedBy === "founderB" ? raw.updatedBy : null,
  };
}

function sanitizeWorkspaceEntryDeletePatchValue(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as {
    id?: unknown;
    expectedUpdatedAt?: unknown;
  };

  if (typeof raw.id !== "string") {
    return null;
  }

  return {
    id: raw.id,
    expectedUpdatedAt: typeof raw.expectedUpdatedAt === "string" ? raw.expectedUpdatedAt : null,
  };
}

function sanitizeWorkspaceReactionDeletePatchValue(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as {
    entryId?: unknown;
    userId?: unknown;
  };

  if (
    typeof raw.entryId !== "string" ||
    (raw.userId !== "founderA" && raw.userId !== "founderB")
  ) {
    return null;
  }

  return {
    entryId: raw.entryId,
    userId: raw.userId,
  };
}

function discussionEntryVersion(entry: { createdAt: string; updatedAt: string | null }) {
  return entry.updatedAt ?? entry.createdAt;
}

function canAttemptStaleWorkspaceMerge(patches: FounderAlignmentWorkbookPatch[]) {
  return patches.every((patch) => {
    if (patch.scope === "root") {
      return patch.field === "currentStepId";
    }

    if (patch.scope === "step") {
      if (patch.field === "founderAApproved" || patch.field === "founderBApproved") {
        return patch.value === false;
      }

      return (
        patch.field === "workspaceEntryCreate" ||
        patch.field === "workspaceEntryUpdate" ||
        patch.field === "workspaceEntryDelete" ||
        patch.field === "workspaceReactionUpsert" ||
        patch.field === "workspaceReactionDelete"
      );
    }

    return false;
  });
}

type MergeFounderPayloadResult =
  | {
      ok: true;
      payload: FounderAlignmentWorkbookPayload;
    }
  | {
      ok: false;
      reason: "invalid_patch" | "stale_conflict";
    };

function mergeFounderPayload(
  existingPayload: FounderAlignmentWorkbookPayload,
  patches: FounderAlignmentWorkbookPatch[],
  role: WorkbookFounderRole,
  options?: { allowStaleWorkspaceMerge?: boolean }
): MergeFounderPayloadResult {
  const nextPayload = sanitizeFounderAlignmentWorkbookPayload(existingPayload);
  const allowStaleWorkspaceMerge = options?.allowStaleWorkspaceMerge === true;

  for (const patch of patches) {
    if (patch.scope === "root") {
      if (allowStaleWorkspaceMerge && patch.field !== "currentStepId") {
        return { ok: false, reason: "stale_conflict" };
      }

      if (patch.field === "currentStepId") {
        const value = String(patch.value ?? "");
        if (value in nextPayload.steps) {
          nextPayload.currentStepId = value as FounderAlignmentWorkbookStepId;
        }
      } else if (patch.field === "advisorFollowUp") {
        nextPayload.advisorFollowUp =
          patch.value === "four_weeks" || patch.value === "three_months" ? patch.value : "none";
      }
      continue;
    }

    if (patch.scope === "advisorClosing") {
      if (allowStaleWorkspaceMerge) {
        return { ok: false, reason: "stale_conflict" };
      }
      nextPayload.advisorClosing = {
        ...nextPayload.advisorClosing,
        [patch.field]: typeof patch.value === "string" ? patch.value : "",
      };
      continue;
    }

    if (patch.scope === "founderReaction") {
      if (allowStaleWorkspaceMerge) {
        return { ok: false, reason: "stale_conflict" };
      }
      if (patch.field === "status") {
        nextPayload.founderReaction.status =
          patch.value === "understood" || patch.value === "open" || patch.value === "in_clarification"
            ? patch.value
            : null;
      } else {
        nextPayload.founderReaction.comment = typeof patch.value === "string" ? patch.value : "";
      }
      continue;
    }

    const stepEntry = nextPayload.steps[patch.stepId];
    if (!stepEntry) {
      continue;
    }

    const founderCanCollaborate =
      stepEntry.mode === "collaborative" && (role === "founderA" || role === "founderB");
    const workspace =
      stepEntry.workspaceV2 != null
        ? {
            entries: [...stepEntry.workspaceV2.entries],
            reactions: [...stepEntry.workspaceV2.reactions],
          }
        : {
            entries: [],
            reactions: [],
          };

    switch (patch.field) {
      case "mode":
        if (allowStaleWorkspaceMerge) {
          return { ok: false, reason: "stale_conflict" };
        }
        stepEntry.mode = patch.value === "collaborative" ? "collaborative" : "solo";
        break;
      case "founderA":
        if (allowStaleWorkspaceMerge) {
          return { ok: false, reason: "stale_conflict" };
        }
        if (typeof patch.value === "string" && (role === "founderA" || founderCanCollaborate)) {
          stepEntry.founderA = patch.value;
          resetFounderApprovals(stepEntry);
        }
        break;
      case "founderB":
        if (allowStaleWorkspaceMerge) {
          return { ok: false, reason: "stale_conflict" };
        }
        if (typeof patch.value === "string" && (role === "founderB" || founderCanCollaborate)) {
          stepEntry.founderB = patch.value;
          resetFounderApprovals(stepEntry);
        }
        break;
      case "agreement":
        if (allowStaleWorkspaceMerge) {
          return { ok: false, reason: "stale_conflict" };
        }
        if (typeof patch.value === "string") {
          stepEntry.agreement = patch.value;
          resetFounderApprovals(stepEntry);
        }
        break;
      case "structuredOutputs":
        if (allowStaleWorkspaceMerge) {
          return { ok: false, reason: "stale_conflict" };
        }
        stepEntry.structuredOutputs = sanitizeWorkbookStructuredOutputsByStep(
          patch.stepId,
          patch.value
        );
        resetFounderApprovals(stepEntry);
        break;
      case "founderAApproved":
        if (role === "founderA") {
          stepEntry.founderAApproved = patch.value === true;
        }
        break;
      case "founderBApproved":
        if (role === "founderB") {
          stepEntry.founderBApproved = patch.value === true;
        }
        break;
      case "advisorNotes":
      case "advisorReplies":
        break;
      case "workspaceEntryCreate": {
        const entry = sanitizeDiscussionEntryPatchValue(patch.value);
        if (!entry || entry.createdBy !== role) {
          return { ok: false, reason: "invalid_patch" };
        }

        if (
          entry.sourceEntryId &&
          !workspace.entries.some((candidate) => candidate.id === entry.sourceEntryId)
        ) {
          return {
            ok: false,
            reason: allowStaleWorkspaceMerge ? "stale_conflict" : "invalid_patch",
          };
        }

        const existingEntry = workspace.entries.find((candidate) => candidate.id === entry.id);
        if (existingEntry) {
          const sameEntry =
            existingEntry.content === entry.content &&
            existingEntry.createdBy === entry.createdBy &&
            existingEntry.sourceEntryId === entry.sourceEntryId;
          if (!sameEntry) {
            return {
              ok: false,
              reason: allowStaleWorkspaceMerge ? "stale_conflict" : "invalid_patch",
            };
          }
          break;
        }

        workspace.entries.push(entry);
        stepEntry.workspaceV2 = workspace;
        resetFounderApprovals(stepEntry);
        break;
      }
      case "workspaceEntryUpdate": {
        const value = sanitizeWorkspaceEntryUpdatePatchValue(patch.value);
        if (!value || value.updatedBy !== role) {
          return { ok: false, reason: "invalid_patch" };
        }

        const entryIndex = workspace.entries.findIndex((candidate) => candidate.id === value.id);
        if (entryIndex === -1) {
          return {
            ok: false,
            reason: allowStaleWorkspaceMerge ? "stale_conflict" : "invalid_patch",
          };
        }

        const existingEntry = workspace.entries[entryIndex];
        if (existingEntry.createdBy !== role) {
          return { ok: false, reason: "invalid_patch" };
        }

        if (
          allowStaleWorkspaceMerge &&
          discussionEntryVersion(existingEntry) !== value.expectedUpdatedAt
        ) {
          return { ok: false, reason: "stale_conflict" };
        }

        workspace.entries[entryIndex] = {
          ...existingEntry,
          content: value.content,
          updatedAt: value.updatedAt,
          updatedBy: value.updatedBy,
        };
        workspace.reactions = workspace.reactions.filter((reaction) => reaction.entryId !== value.id);
        stepEntry.workspaceV2 = workspace;
        resetFounderApprovals(stepEntry);
        break;
      }
      case "workspaceEntryDelete": {
        const value = sanitizeWorkspaceEntryDeletePatchValue(patch.value);
        if (!value) {
          return { ok: false, reason: "invalid_patch" };
        }

        const existingEntry = workspace.entries.find((candidate) => candidate.id === value.id);
        if (!existingEntry) {
          if (allowStaleWorkspaceMerge) {
            return { ok: false, reason: "stale_conflict" };
          }
          break;
        }

        if (existingEntry.createdBy !== role) {
          return { ok: false, reason: "invalid_patch" };
        }

        if (
          allowStaleWorkspaceMerge &&
          discussionEntryVersion(existingEntry) !== value.expectedUpdatedAt
        ) {
          return { ok: false, reason: "stale_conflict" };
        }

        workspace.entries = workspace.entries.filter((candidate) => candidate.id !== value.id);
        workspace.reactions = workspace.reactions.filter((reaction) => reaction.entryId !== value.id);
        stepEntry.workspaceV2 =
          workspace.entries.length > 0 || workspace.reactions.length > 0 ? workspace : undefined;
        resetFounderApprovals(stepEntry);
        break;
      }
      case "workspaceReactionUpsert": {
        const reaction = sanitizeDiscussionReactionPatchValue(patch.value);
        if (!reaction || reaction.userId !== role) {
          return { ok: false, reason: "invalid_patch" };
        }

        if (!workspace.entries.some((candidate) => candidate.id === reaction.entryId)) {
          return {
            ok: false,
            reason: allowStaleWorkspaceMerge ? "stale_conflict" : "invalid_patch",
          };
        }

        workspace.reactions = workspace.reactions.filter(
          (candidate) =>
            !(candidate.entryId === reaction.entryId && candidate.userId === reaction.userId)
        );
        workspace.reactions.push(reaction);
        stepEntry.workspaceV2 = workspace;
        resetFounderApprovals(stepEntry);
        break;
      }
      case "workspaceReactionDelete": {
        const value = sanitizeWorkspaceReactionDeletePatchValue(patch.value);
        if (!value || value.userId !== role) {
          return { ok: false, reason: "invalid_patch" };
        }

        if (!workspace.entries.some((candidate) => candidate.id === value.entryId)) {
          if (allowStaleWorkspaceMerge) {
            return { ok: false, reason: "stale_conflict" };
          }
          break;
        }

        workspace.reactions = workspace.reactions.filter(
          (candidate) =>
            !(candidate.entryId === value.entryId && candidate.userId === value.userId)
        );
        stepEntry.workspaceV2 = workspace;
        resetFounderApprovals(stepEntry);
        break;
      }
    }
  }

  return {
    ok: true,
    payload: sanitizeFounderAlignmentWorkbookPayload(nextPayload),
  };
}

function mergeAdvisorPayload(
  existingPayload: FounderAlignmentWorkbookPayload,
  patches: FounderAlignmentWorkbookPatch[],
  advisorId: string,
  advisorName: string | null
) {
  const nextPayload = sanitizeFounderAlignmentWorkbookPayload(existingPayload);

  nextPayload.advisorId = advisorId;
  nextPayload.advisorName = advisorName;

  for (const patch of patches) {
    if (patch.scope === "root") {
      if (patch.field === "currentStepId") {
        const value = String(patch.value ?? "");
        if (value in nextPayload.steps) {
          nextPayload.currentStepId = value as FounderAlignmentWorkbookStepId;
        }
      } else if (patch.field === "advisorFollowUp") {
        nextPayload.advisorFollowUp =
          patch.value === "four_weeks" || patch.value === "three_months" ? patch.value : "none";
      }
      continue;
    }

    if (patch.scope === "advisorClosing") {
      nextPayload.advisorClosing = {
        ...nextPayload.advisorClosing,
        [patch.field]: typeof patch.value === "string" ? patch.value : "",
      };
      continue;
    }

    if (
      patch.scope === "step" &&
      (patch.field === "advisorNotes" || patch.field === "advisorReplies")
    ) {
      const stepEntry = nextPayload.steps[patch.stepId];
      if (stepEntry) {
        if (patch.field === "advisorNotes") {
          stepEntry.advisorNotes = typeof patch.value === "string" ? patch.value : "";
        } else {
          stepEntry.advisorReplies = sanitizeFounderAlignmentWorkbookPayload({
            steps: {
              [patch.stepId]: {
                workspaceV2: stepEntry.workspaceV2,
                advisorReplies: patch.value,
              },
            },
          }).steps[patch.stepId].advisorReplies;
        }
      }
    }
  }

  return sanitizeFounderAlignmentWorkbookPayload(nextPayload);
}

export async function saveFounderAlignmentWorkbook({
  invitationId,
  teamContext,
  expectedUpdatedAt,
  patches,
}: SaveFounderAlignmentWorkbookInput): Promise<SaveFounderAlignmentWorkbookResult> {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId) {
    return { ok: false, reason: "missing_invitation" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "not_authenticated" };
  }

  const privileged = createPrivilegedClient();
  const role = await resolveWorkbookViewerRole(normalizedInvitationId, user.id, supabase, privileged);
  if (role === "unknown") {
    return { ok: false, reason: "forbidden" };
  }
  if (role === "advisor" && !privileged) {
    return { ok: false, reason: "save_failed" };
  }

  const dataClient = role === "advisor" && privileged ? privileged : supabase;
  const [{ payload: existingPayload, updatedAt: currentUpdatedAt }, advisorRow] = await Promise.all([
    loadWorkbookRow(normalizedInvitationId, dataClient),
    loadAdvisorAccessRow(normalizedInvitationId, dataClient),
  ]);

  if (patches.length === 0) {
    return {
      ok: true,
      updatedAt: currentUpdatedAt ?? expectedUpdatedAt ?? new Date().toISOString(),
    };
  }

  let payloadToPersist: FounderAlignmentWorkbookPayload;

  if (role === "advisor") {
    if ((expectedUpdatedAt ?? null) !== (currentUpdatedAt ?? null)) {
      return { ok: false, reason: "stale_version", updatedAt: currentUpdatedAt ?? null };
    }

    payloadToPersist = mergeAdvisorPayload(
      existingPayload,
      patches,
      user.id,
      advisorRow?.advisor_name ?? existingPayload.advisorName ?? null
    );
  } else {
    const founderMergeResult =
      (expectedUpdatedAt ?? null) === (currentUpdatedAt ?? null)
        ? mergeFounderPayload(existingPayload, patches, role)
        : canAttemptStaleWorkspaceMerge(patches)
          ? mergeFounderPayload(existingPayload, patches, role, {
              allowStaleWorkspaceMerge: true,
            })
          : { ok: false as const, reason: "stale_conflict" as const };

    if (!founderMergeResult.ok) {
      return founderMergeResult.reason === "invalid_patch"
        ? { ok: false, reason: "save_failed", updatedAt: currentUpdatedAt ?? null }
        : { ok: false, reason: "stale_version", updatedAt: currentUpdatedAt ?? null };
    }

    payloadToPersist = founderMergeResult.payload;
  }

  const writeClient = role === "advisor" && privileged ? privileged : supabase;
  const { data, error } = await writeClient
    .from("founder_alignment_workbooks")
    .upsert(
      {
        invitation_id: normalizedInvitationId,
        team_context: teamContext,
        payload: payloadToPersist,
        created_by: user.id,
        updated_by: user.id,
      },
      {
        onConflict: "invitation_id",
      }
    )
    .select("updated_at")
    .maybeSingle();

  if (error || !data?.updated_at) {
    return { ok: false, reason: "save_failed" };
  }

  return {
    ok: true,
    updatedAt: data.updated_at,
  };
}

export async function prepareFounderAlignmentAdvisorInvite({
  invitationId,
  teamContext,
}: {
  invitationId: string;
  teamContext: TeamContext;
}): Promise<PrepareFounderAlignmentAdvisorInviteResult> {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId) {
    return { ok: false, reason: "missing_invitation" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "not_authenticated" };
  }

  const invitation = await loadInvitationAccessRow(normalizedInvitationId, supabase);
  if (!invitation) {
    return { ok: false, reason: "forbidden" };
  }

  const founderRole =
    invitation.inviter_user_id === user.id
      ? "founderA"
      : invitation.invitee_user_id === user.id
        ? "founderB"
        : "unknown";

  if (founderRole === "unknown") {
    return { ok: false, reason: "forbidden" };
  }

  const existingRow = await loadAdvisorAccessRow(normalizedInvitationId, supabase);
  const nextFounderAApproved =
    founderRole === "founderA" ? true : (existingRow?.founder_a_approved ?? false);
  const nextFounderBApproved =
    founderRole === "founderB" ? true : (existingRow?.founder_b_approved ?? false);
  const privileged = createPrivilegedClient();

  if (!privileged) {
    return { ok: false, reason: "invite_failed" };
  }

  const commonPayload = {
    invitation_id: normalizedInvitationId,
    requested_by: existingRow?.requested_by ?? user.id,
    founder_a_approved: nextFounderAApproved,
    founder_b_approved: nextFounderBApproved,
    advisor_user_id: existingRow?.advisor_user_id ?? null,
    advisor_name: existingRow?.advisor_name ?? null,
    claimed_at: existingRow?.claimed_at ?? null,
  };

  if (existingRow?.advisor_user_id) {
    const { error } = await privileged
      .from("founder_alignment_workbook_advisors")
      .upsert(
        {
          ...commonPayload,
          token_hash: existingRow.token_hash,
          approved_at: existingRow.approved_at ?? new Date().toISOString(),
        },
        { onConflict: "invitation_id" }
      );

    if (error) {
      return { ok: false, reason: "invite_failed" };
    }

    const syncResult = await syncRelationshipAdvisorFromLegacyInvitation(
      normalizedInvitationId,
      privileged
    );
    if (!syncResult.ok && syncResult.reason !== "missing_relationship") {
      console.error("relationship advisor sync failed after linked advisor refresh", {
        invitationId: normalizedInvitationId,
        reason: syncResult.reason,
      });
    }

    return {
      ok: true,
      status: "advisor_linked",
      ...advisorInviteStateFromRow({
        ...existingRow,
        founder_a_approved: nextFounderAApproved,
        founder_b_approved: nextFounderBApproved,
      }),
    };
  }

  if (!nextFounderAApproved || !nextFounderBApproved) {
    const { error } = await privileged
      .from("founder_alignment_workbook_advisors")
      .upsert(
        {
          ...commonPayload,
          token_hash: existingRow?.token_hash ?? null,
          approved_at: existingRow?.approved_at ?? null,
        },
        { onConflict: "invitation_id" }
      );

    if (error) {
      return { ok: false, reason: "invite_failed" };
    }

    const syncResult = await syncRelationshipAdvisorFromLegacyInvitation(
      normalizedInvitationId,
      privileged
    );
    if (!syncResult.ok && syncResult.reason !== "missing_relationship") {
      console.error("relationship advisor sync failed after founder approval", {
        invitationId: normalizedInvitationId,
        reason: syncResult.reason,
      });
    }

    return {
      ok: true,
      status: "awaiting_other_founder",
      founderAApproved: nextFounderAApproved,
      founderBApproved: nextFounderBApproved,
      advisorLinked: false,
      advisorName: existingRow?.advisor_name ?? null,
    };
  }

  const token = randomBytes(24).toString("hex");
  const tokenHash = hashFounderAlignmentAdvisorToken(token);
  const { error } = await privileged
    .from("founder_alignment_workbook_advisors")
    .upsert(
      {
        ...commonPayload,
        token_hash: tokenHash,
        approved_at: new Date().toISOString(),
      },
      { onConflict: "invitation_id" }
    );

  if (error) {
    return { ok: false, reason: "invite_failed" };
  }

  const syncResult = await syncRelationshipAdvisorFromLegacyInvitation(
    normalizedInvitationId,
    privileged
  );
  if (!syncResult.ok && syncResult.reason !== "missing_relationship") {
    console.error("relationship advisor sync failed after invite preparation", {
      invitationId: normalizedInvitationId,
      reason: syncResult.reason,
    });
  }

  await trackServerResearchEvent({
    eventName: "advisor_invite_prepared",
    userId: user.id,
    invitationId: normalizedInvitationId,
    teamContext,
    properties: {
      founderRole,
      founderAApproved: true,
      founderBApproved: true,
    },
  });

  return {
    ok: true,
    status: "invite_ready",
    inviteUrl: buildFounderAlignmentAdvisorInvitePath({
      token,
    }),
    founderAApproved: true,
    founderBApproved: true,
    advisorLinked: false,
    advisorName: existingRow?.advisor_name ?? null,
  };
}

export async function proposeFounderAlignmentAdvisor({
  invitationId,
  relationshipId,
  advisorName,
  advisorEmail,
}: {
  invitationId: string;
  relationshipId?: string | null;
  advisorName: string | null;
  advisorEmail: string;
}): Promise<ProposeFounderAlignmentAdvisorResult> {
  const normalizedInvitationId = invitationId.trim();
  const normalizedRelationshipId = normalizeRelationshipId(relationshipId);
  const normalizedAdvisorName = normalizeAdvisorName(advisorName);
  if (!normalizedInvitationId) {
    return {
      ok: false,
      reason: "missing_invitation",
      debug: {
        invitationId: normalizedInvitationId,
        relationshipId: null,
        userId: null,
        founderRole: "unknown",
        advisorName: normalizedAdvisorName,
        advisorEmail: normalizeAdvisorEmail(advisorEmail),
        validationError: "invitationId_missing",
        dbError: null,
        repairAttempted: false,
        repairResult: null,
        finalResult: "missing_invitation",
      },
    };
  }

  const normalizedEmail = normalizeAdvisorEmail(advisorEmail);
  const debugInfo: AdvisorProposalDebugInfo = {
    invitationId: normalizedInvitationId,
    relationshipId: null,
    userId: null,
    founderRole: "unknown",
    advisorName: normalizedAdvisorName,
    advisorEmail: normalizedEmail,
    validationError: null,
    dbError: null,
    repairAttempted: false,
    repairResult: null,
    finalResult: "started",
  };
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    debugInfo.validationError = "advisor_email_invalid";
    debugInfo.finalResult = "invalid_email";
    return { ok: false, reason: "invalid_email", debug: debugInfo };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    debugInfo.validationError = "user_not_authenticated";
    debugInfo.finalResult = "not_authenticated";
    return { ok: false, reason: "not_authenticated", debug: debugInfo };
  }
  debugInfo.userId = user.id;

  const invitation = await loadInvitationAccessRow(normalizedInvitationId, supabase);
  if (!invitation) {
    debugInfo.validationError = "invitation_not_accessible";
    debugInfo.finalResult = "forbidden";
    return { ok: false, reason: "forbidden", debug: debugInfo };
  }

  const founderRole =
    invitation.inviter_user_id === user.id
      ? "founderA"
      : invitation.invitee_user_id === user.id
        ? "founderB"
        : "unknown";
  debugInfo.founderRole = founderRole;

  if (founderRole === "unknown") {
    debugInfo.validationError = "user_not_founder_a_or_b";
    debugInfo.finalResult = "forbidden";
    return { ok: false, reason: "forbidden", debug: debugInfo };
  }

  const resolvedRelationshipId =
    normalizedRelationshipId ?? (await resolveRelationshipIdForInvitation(normalizedInvitationId, supabase));
  debugInfo.relationshipId = resolvedRelationshipId;

  if (!resolvedRelationshipId) {
    debugInfo.validationError = normalizedRelationshipId
      ? "relationship_not_accessible_in_workbook_context"
      : "relationship_not_resolved_for_invitation";
    debugInfo.finalResult = "missing_relationship";
    console.error("advisor proposal failed before save", debugInfo);
    return { ok: false, reason: "missing_relationship", debug: debugInfo };
  }

  const existingRows = await listRelationshipAdvisorsForRelationship(resolvedRelationshipId, supabase);
  const existingRow =
    existingRows.find(
      (row) =>
        normalizeAdvisorEmail(row.advisor_email) === normalizedEmail && row.revoked_at == null
    ) ?? null;

  const nextFounderAApproved =
    founderRole === "founderA" ? true : (existingRow?.founder_a_approved ?? false);
  const nextFounderBApproved =
    founderRole === "founderB" ? true : (existingRow?.founder_b_approved ?? false);

  const { data: persisted, error } = existingRow
    ? await supabase
        .from("relationship_advisors")
        .update({
          advisor_name: normalizedAdvisorName ?? existingRow.advisor_name ?? null,
          advisor_email: normalizedEmail,
          founder_a_approved: nextFounderAApproved,
          founder_b_approved: nextFounderBApproved,
          status: nextFounderAApproved && nextFounderBApproved ? "approved" : "pending",
          approved_at:
            nextFounderAApproved && nextFounderBApproved
              ? existingRow.approved_at ?? new Date().toISOString()
              : existingRow.approved_at,
          requested_by_user_id: existingRow.requested_by_user_id ?? user.id,
          source_invitation_id: existingRow.source_invitation_id ?? normalizedInvitationId,
        })
        .eq("id", existingRow.id)
        .select(
          "id, relationship_id, advisor_user_id, advisor_name, advisor_email, status, founder_a_approved, founder_b_approved, approved_at, invited_at, linked_at, revoked_at, requested_by_user_id, source_invitation_id, invite_token_hash, created_at, updated_at"
        )
        .single()
    : await supabase
        .from("relationship_advisors")
        .insert({
          relationship_id: resolvedRelationshipId,
          advisor_name: normalizedAdvisorName,
          advisor_email: normalizedEmail,
          status: founderRole === "founderA" || founderRole === "founderB" ? "pending" : "pending",
          founder_a_approved: founderRole === "founderA",
          founder_b_approved: founderRole === "founderB",
          requested_by_user_id: user.id,
          source_invitation_id: normalizedInvitationId,
        })
        .select(
          "id, relationship_id, advisor_user_id, advisor_name, advisor_email, status, founder_a_approved, founder_b_approved, approved_at, invited_at, linked_at, revoked_at, requested_by_user_id, source_invitation_id, invite_token_hash, created_at, updated_at"
        )
        .single();

  if (error || !persisted) {
    debugInfo.dbError = formatSupabaseError(error);
    debugInfo.finalResult = "save_failed";
    console.error("advisor proposal persistence failed", {
      ...debugInfo,
      existingAdvisorEntryId: existingRow?.id ?? null,
    });
    return { ok: false, reason: "save_failed", debug: debugInfo };
  }

  const row = persisted as RelationshipAdvisorRow;
  const founderALabel = "Founder A";
  const founderBLabel = "Founder B";

  return {
    ok: true,
    entry: mapRelationshipAdvisorToWorkbookEntry({
      row,
      invitationId: normalizedInvitationId,
      founderAUserId: invitation.inviter_user_id,
      founderBUserId: invitation.invitee_user_id,
      founderALabel,
      founderBLabel,
    }),
  };
}

export async function approveFounderAlignmentAdvisorProposal({
  invitationId,
  relationshipId,
  advisorEntryId,
}: {
  invitationId: string;
  relationshipId?: string | null;
  advisorEntryId: string;
}): Promise<ApproveFounderAlignmentAdvisorProposalResult> {
  const normalizedInvitationId = invitationId.trim();
  const normalizedEntryId = advisorEntryId.trim();
  if (!normalizedInvitationId || !normalizedEntryId) {
    return { ok: false, reason: "missing_invitation" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "not_authenticated" };
  }

  const invitation = await loadInvitationAccessRow(normalizedInvitationId, supabase);
  if (!invitation) {
    return { ok: false, reason: "forbidden" };
  }

  const founderRole =
    invitation.inviter_user_id === user.id
      ? "founderA"
      : invitation.invitee_user_id === user.id
        ? "founderB"
        : "unknown";

  if (founderRole === "unknown") {
    return { ok: false, reason: "forbidden" };
  }

  const resolvedRelationshipId =
    normalizeRelationshipId(relationshipId) ??
    (await resolveRelationshipIdForInvitation(normalizedInvitationId, supabase));
  if (!resolvedRelationshipId) {
    return { ok: false, reason: "missing_relationship" };
  }

  const { data: existing, error: loadError } = await supabase
    .from("relationship_advisors")
    .select(
      "id, relationship_id, advisor_user_id, advisor_name, advisor_email, status, founder_a_approved, founder_b_approved, approved_at, invited_at, linked_at, revoked_at, requested_by_user_id, source_invitation_id, invite_token_hash, created_at, updated_at"
    )
    .eq("id", normalizedEntryId)
    .eq("relationship_id", resolvedRelationshipId)
    .maybeSingle();

  if (loadError) {
    return { ok: false, reason: "save_failed" };
  }

  if (!existing) {
    return { ok: false, reason: "not_found" };
  }

  const row = existing as RelationshipAdvisorRow;
  const nextFounderAApproved = founderRole === "founderA" ? true : row.founder_a_approved;
  const nextFounderBApproved = founderRole === "founderB" ? true : row.founder_b_approved;
  const nextStatus =
    row.status === "linked" || row.status === "invited"
      ? row.status
      : nextFounderAApproved && nextFounderBApproved
        ? "approved"
        : "pending";

  const { data: updated, error: updateError } = await supabase
    .from("relationship_advisors")
    .update({
      founder_a_approved: nextFounderAApproved,
      founder_b_approved: nextFounderBApproved,
      status: nextStatus,
      approved_at:
        nextFounderAApproved && nextFounderBApproved
          ? row.approved_at ?? new Date().toISOString()
          : row.approved_at,
    })
    .eq("id", row.id)
    .select(
      "id, relationship_id, advisor_user_id, advisor_name, advisor_email, status, founder_a_approved, founder_b_approved, approved_at, invited_at, linked_at, revoked_at, requested_by_user_id, source_invitation_id, invite_token_hash, created_at, updated_at"
    )
    .single();

  if (updateError || !updated) {
    return { ok: false, reason: "save_failed" };
  }

  return {
    ok: true,
    entry: mapRelationshipAdvisorToWorkbookEntry({
      row: updated as RelationshipAdvisorRow,
      invitationId: normalizedInvitationId,
      founderAUserId: invitation.inviter_user_id,
      founderBUserId: invitation.invitee_user_id,
      founderALabel: "Founder A",
      founderBLabel: "Founder B",
    }),
  };
}

async function loadRelationshipAdvisorEntryForFounder(params: {
  invitationId: string;
  relationshipId?: string | null;
  advisorEntryId: string;
  supabase: SupabaseServerClient;
  userId: string;
}): Promise<
  | {
      ok: true;
      invitation: InvitationAccessRow;
      founderRole: WorkbookFounderRole;
      relationshipId: string;
      row: RelationshipAdvisorRow;
    }
  | {
      ok: false;
      reason:
        | "missing_invitation"
        | "forbidden"
        | "missing_relationship"
        | "not_found"
        | "save_failed";
    }
> {
  const normalizedInvitationId = params.invitationId.trim();
  const normalizedEntryId = params.advisorEntryId.trim();
  if (!normalizedInvitationId || !normalizedEntryId) {
    return { ok: false, reason: "missing_invitation" };
  }

  const invitation = await loadInvitationAccessRow(normalizedInvitationId, params.supabase);
  if (!invitation) {
    return { ok: false, reason: "forbidden" };
  }

  const founderRole =
    invitation.inviter_user_id === params.userId
      ? "founderA"
      : invitation.invitee_user_id === params.userId
        ? "founderB"
        : "unknown";

  if (founderRole === "unknown") {
    return { ok: false, reason: "forbidden" };
  }

  const relationshipId =
    normalizeRelationshipId(params.relationshipId) ??
    (await resolveRelationshipIdForInvitation(normalizedInvitationId, params.supabase));
  if (!relationshipId) {
    return { ok: false, reason: "missing_relationship" };
  }

  const { data: row, error } = await params.supabase
    .from("relationship_advisors")
    .select(
      "id, relationship_id, advisor_user_id, advisor_name, advisor_email, status, founder_a_approved, founder_b_approved, approved_at, invited_at, linked_at, revoked_at, requested_by_user_id, source_invitation_id, invite_token_hash, created_at, updated_at"
    )
    .eq("id", normalizedEntryId)
    .eq("relationship_id", relationshipId)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: "save_failed" };
  }

  if (!row) {
    return { ok: false, reason: "not_found" };
  }

  return {
    ok: true,
    invitation,
    founderRole,
    relationshipId,
    row: row as RelationshipAdvisorRow,
  };
}

async function loadFounderLabelsForInvitation(
  invitation: InvitationAccessRow,
  supabase: SupabaseLikeClient
): Promise<{ founderALabel: string; founderBLabel: string }> {
  const profileIds = [invitation.inviter_user_id, invitation.invitee_user_id].filter(
    (value): value is string => Boolean(value)
  );

  if (profileIds.length === 0) {
    return { founderALabel: "Founder A", founderBLabel: "Founder B" };
  }

  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", profileIds);

  const profileByUserId = new Map(
    ((data ?? []) as AdvisorInviteProfileRow[]).map((row) => [
      row.user_id,
      row.display_name?.trim() ?? "",
    ])
  );

  return {
    founderALabel: profileByUserId.get(invitation.inviter_user_id)?.trim() || "Founder A",
    founderBLabel:
      profileByUserId.get(invitation.invitee_user_id ?? "")?.trim() ||
      invitation.invitee_email?.split("@")[0]?.trim() ||
      "Founder B",
  };
}

function mapRelationshipAdvisorEntryWithInvitation(params: {
  row: RelationshipAdvisorRow;
  invitationId: string;
  invitation: InvitationAccessRow;
  founderALabel: string;
  founderBLabel: string;
}) {
  return mapRelationshipAdvisorToWorkbookEntry({
    row: params.row,
    invitationId: params.invitationId,
    founderAUserId: params.invitation.inviter_user_id,
    founderBUserId: params.invitation.invitee_user_id,
    founderALabel: params.founderALabel,
    founderBLabel: params.founderBLabel,
  });
}

export async function sendFounderAlignmentAdvisorInvite({
  invitationId,
  relationshipId,
  advisorEntryId,
  teamContext,
}: {
  invitationId: string;
  relationshipId?: string | null;
  advisorEntryId: string;
  teamContext: TeamContext;
}): Promise<SendFounderAlignmentAdvisorInviteResult> {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId) {
    return { ok: false, reason: "missing_invitation" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "not_authenticated" };
  }

  const loaded = await loadRelationshipAdvisorEntryForFounder({
    invitationId: normalizedInvitationId,
    relationshipId,
    advisorEntryId,
    supabase,
    userId: user.id,
  });
  if (!loaded.ok) {
    return loaded;
  }

  if (!loaded.row.advisor_email) {
    return { ok: false, reason: "missing_email" };
  }

  if (
    loaded.row.revoked_at ||
    !loaded.row.founder_a_approved ||
    !loaded.row.founder_b_approved ||
    !["approved", "invited"].includes(loaded.row.status)
  ) {
    return { ok: false, reason: "not_ready" };
  }

  const [labels, invitationContext] = await Promise.all([
    loadFounderLabelsForInvitation(loaded.invitation, supabase),
    supabase
      .from("invitations")
      .select("team_context")
      .eq("id", normalizedInvitationId)
      .maybeSingle(),
  ]);

  const token = randomBytes(24).toString("hex");
  const tokenHash = hashFounderAlignmentAdvisorToken(token);
  const invitePath = buildFounderAlignmentAdvisorInvitePath({ token });
  const inviteUrl = toPublicAppUrl(invitePath);
  const effectiveTeamContext =
    invitationContext.data?.team_context === "existing_team" ? "existing_team" : teamContext;

  const emailResult = await sendAdvisorInviteEmail({
    advisorEmail: loaded.row.advisor_email,
    advisorName: loaded.row.advisor_name,
    inviteUrl,
    founderAName: labels.founderALabel,
    founderBName: labels.founderBLabel,
    teamName: resolveInvitationTeamName(loaded.invitation.label, loaded.invitation.invitee_email),
    teamContext: effectiveTeamContext,
  });

  if (!emailResult.ok) {
    return {
      ok: false,
      reason: "email_failed",
      error: emailResult.error,
    };
  }

  const sentAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("relationship_advisors")
    .update({
      status: "invited",
      invited_at: sentAt,
      invite_token_hash: tokenHash,
      source_invitation_id: loaded.row.source_invitation_id ?? normalizedInvitationId,
    })
    .eq("id", loaded.row.id)
    .select(
      "id, relationship_id, advisor_user_id, advisor_name, advisor_email, status, founder_a_approved, founder_b_approved, approved_at, invited_at, linked_at, revoked_at, requested_by_user_id, source_invitation_id, invite_token_hash, created_at, updated_at"
    )
    .single();

  if (updateError || !updated) {
    return { ok: false, reason: "save_failed" };
  }

  await trackServerResearchEvent({
    eventName: "advisor_invite_sent",
    userId: user.id,
    invitationId: normalizedInvitationId,
    teamContext: effectiveTeamContext,
    properties: {
      advisorEntryId: loaded.row.id,
      advisorEmail: loaded.row.advisor_email,
      resent: loaded.row.status === "invited",
    },
  });

  return {
    ok: true,
    inviteUrl,
    entry: mapRelationshipAdvisorEntryWithInvitation({
      row: updated as RelationshipAdvisorRow,
      invitationId: normalizedInvitationId,
      invitation: loaded.invitation,
      founderALabel: labels.founderALabel,
      founderBLabel: labels.founderBLabel,
    }),
  };
}

export async function copyFounderAlignmentAdvisorInviteLink({
  invitationId,
  relationshipId,
  advisorEntryId,
}: {
  invitationId: string;
  relationshipId?: string | null;
  advisorEntryId: string;
}): Promise<CopyFounderAlignmentAdvisorInviteLinkResult> {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId) {
    return { ok: false, reason: "missing_invitation" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "not_authenticated" };
  }

  const loaded = await loadRelationshipAdvisorEntryForFounder({
    invitationId: normalizedInvitationId,
    relationshipId,
    advisorEntryId,
    supabase,
    userId: user.id,
  });
  if (!loaded.ok) {
    return loaded;
  }

  if (
    loaded.row.revoked_at ||
    !loaded.row.founder_a_approved ||
    !loaded.row.founder_b_approved ||
    !["approved", "invited"].includes(loaded.row.status)
  ) {
    return { ok: false, reason: "not_ready" };
  }

  const labels = await loadFounderLabelsForInvitation(loaded.invitation, supabase);
  const token = randomBytes(24).toString("hex");
  const tokenHash = hashFounderAlignmentAdvisorToken(token);
  const invitePath = buildFounderAlignmentAdvisorInvitePath({ token });
  const inviteUrl = toPublicAppUrl(invitePath);

  const { data: updated, error: updateError } = await supabase
    .from("relationship_advisors")
    .update({
      invite_token_hash: tokenHash,
      source_invitation_id: loaded.row.source_invitation_id ?? normalizedInvitationId,
    })
    .eq("id", loaded.row.id)
    .select(
      "id, relationship_id, advisor_user_id, advisor_name, advisor_email, status, founder_a_approved, founder_b_approved, approved_at, invited_at, linked_at, revoked_at, requested_by_user_id, source_invitation_id, invite_token_hash, created_at, updated_at"
    )
    .single();

  if (updateError || !updated) {
    return { ok: false, reason: "save_failed" };
  }

  return {
    ok: true,
    inviteUrl,
    entry: mapRelationshipAdvisorEntryWithInvitation({
      row: updated as RelationshipAdvisorRow,
      invitationId: normalizedInvitationId,
      invitation: loaded.invitation,
      founderALabel: labels.founderALabel,
      founderBLabel: labels.founderBLabel,
    }),
  };
}

export async function claimFounderAlignmentAdvisorAccess({
  invitationId,
  advisorToken,
  userId,
  fallbackName,
  teamContext = null,
}: {
  invitationId: string;
  advisorToken: string;
  userId: string;
  fallbackName: string | null;
  teamContext?: TeamContext | null;
}): Promise<ClaimFounderAlignmentAdvisorAccessResult> {
  const privileged = createPrivilegedClient();
  if (!privileged) {
    return { ok: false, reason: "missing_service_role" };
  }

  const tokenHash = hashFounderAlignmentAdvisorToken(advisorToken);
  const { data: relationshipAdvisorRow, error: relationshipError } = await privileged
    .from("relationship_advisors")
    .select(
      "id, relationship_id, advisor_user_id, advisor_name, advisor_email, status, founder_a_approved, founder_b_approved, approved_at, invited_at, linked_at, revoked_at, requested_by_user_id, source_invitation_id, invite_token_hash, created_at, updated_at"
    )
    .eq("source_invitation_id", invitationId)
    .eq("invite_token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (relationshipError) {
    return { ok: false, reason: "invalid_token" };
  }

  if (relationshipAdvisorRow) {
    const typedRelationshipRow = relationshipAdvisorRow as RelationshipAdvisorRow;
    const nextAdvisorName = typedRelationshipRow.advisor_name ?? fallbackName;

    if (
      typedRelationshipRow.founder_a_approved !== true ||
      typedRelationshipRow.founder_b_approved !== true
    ) {
      return { ok: false, reason: "invalid_token" };
    }

    if (typedRelationshipRow.advisor_user_id && typedRelationshipRow.advisor_user_id !== userId) {
      return { ok: false, reason: "already_claimed" };
    }

    const claimedAt = typedRelationshipRow.linked_at ?? new Date().toISOString();
    const { data: updatedRelationshipRow, error: updateRelationshipError } = await privileged
      .from("relationship_advisors")
      .update({
        advisor_user_id: userId,
        advisor_name: nextAdvisorName,
        status: "linked",
        linked_at: claimedAt,
      })
      .eq("id", typedRelationshipRow.id)
      .select(
        "id, relationship_id, advisor_user_id, advisor_name, advisor_email, status, founder_a_approved, founder_b_approved, approved_at, invited_at, linked_at, revoked_at, requested_by_user_id, source_invitation_id, invite_token_hash, created_at, updated_at"
      )
      .maybeSingle();

    if (updateRelationshipError || !updatedRelationshipRow) {
      return { ok: false, reason: "update_failed" };
    }

    const { payload: currentPayload } = await loadWorkbookRow(invitationId, privileged);
    const nextPayload = {
      ...currentPayload,
      advisorId: userId,
      advisorName: nextAdvisorName,
    } satisfies FounderAlignmentWorkbookPayload;

    await privileged
      .from("founder_alignment_workbooks")
      .update({
        payload: nextPayload,
        updated_by: userId,
      })
      .eq("invitation_id", invitationId);

    await trackServerResearchEvent({
      eventName: "advisor_invite_claimed",
      userId,
      invitationId,
      teamContext,
      properties: {
        hasFallbackName: Boolean(fallbackName),
        advisorFlow: "relationship_advisors",
      },
    });

    return {
      ok: true,
      row: {
        invitation_id: invitationId,
        advisor_user_id: userId,
        advisor_name: nextAdvisorName,
        founder_a_approved: typedRelationshipRow.founder_a_approved,
        founder_b_approved: typedRelationshipRow.founder_b_approved,
        approved_at: typedRelationshipRow.approved_at,
        claimed_at:
          (updatedRelationshipRow as RelationshipAdvisorRow).linked_at ?? claimedAt,
      },
    };
  }

  const { data: advisorRow, error } = await privileged
    .from("founder_alignment_workbook_advisors")
    .select(
      "invitation_id, advisor_user_id, advisor_name, token_hash, founder_a_approved, founder_b_approved, requested_by, approved_at, claimed_at"
    )
    .eq("invitation_id", invitationId)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !advisorRow) {
    return { ok: false, reason: "invalid_token" };
  }

  const typedAdvisorRow = advisorRow as AdvisorAccessRow;
  const nextAdvisorName = typedAdvisorRow.advisor_name ?? fallbackName;

  if (
    typedAdvisorRow.founder_a_approved !== true ||
    typedAdvisorRow.founder_b_approved !== true
  ) {
    return { ok: false, reason: "invalid_token" };
  }

  if (typedAdvisorRow.advisor_user_id && typedAdvisorRow.advisor_user_id !== userId) {
    return { ok: false, reason: "already_claimed" };
  }

  const { data: updatedAdvisorRow, error: updateError } = await privileged
    .from("founder_alignment_workbook_advisors")
    .update({
      advisor_user_id: userId,
      advisor_name: nextAdvisorName,
      claimed_at: typedAdvisorRow.claimed_at ?? new Date().toISOString(),
    })
    .eq("invitation_id", invitationId)
    .eq("token_hash", tokenHash)
    .select(
      "invitation_id, advisor_user_id, advisor_name, token_hash, founder_a_approved, founder_b_approved, requested_by, approved_at, claimed_at"
    )
    .maybeSingle();

  if (updateError || !updatedAdvisorRow) {
    return { ok: false, reason: "update_failed" };
  }

  const syncResult = await syncRelationshipAdvisorFromLegacyInvitation(invitationId, privileged);
  if (!syncResult.ok && syncResult.reason !== "missing_relationship") {
    console.error("relationship advisor sync failed after advisor claim", {
      invitationId,
      reason: syncResult.reason,
    });
  }

  const { payload: currentPayload } = await loadWorkbookRow(invitationId, privileged);
  const nextPayload = {
    ...currentPayload,
    advisorId: userId,
    advisorName: nextAdvisorName,
  } satisfies FounderAlignmentWorkbookPayload;

  await privileged
    .from("founder_alignment_workbooks")
    .update({
      payload: nextPayload,
      updated_by: userId,
    })
    .eq("invitation_id", invitationId);

  await trackServerResearchEvent({
    eventName: "advisor_invite_claimed",
    userId,
    invitationId,
    teamContext,
    properties: {
      hasFallbackName: Boolean(fallbackName),
      advisorFlow: "legacy_single_advisor",
    },
  });

  return {
    ok: true,
    row: {
      invitation_id: updatedAdvisorRow.invitation_id,
      advisor_user_id: updatedAdvisorRow.advisor_user_id,
      advisor_name: updatedAdvisorRow.advisor_name,
      founder_a_approved: updatedAdvisorRow.founder_a_approved,
      founder_b_approved: updatedAdvisorRow.founder_b_approved,
      approved_at: updatedAdvisorRow.approved_at,
      claimed_at: updatedAdvisorRow.claimed_at,
    },
  };
}

function normalizeAdvisorInviteTeamContext(value: string | null | undefined): TeamContext {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

export async function getFounderAlignmentAdvisorInviteByToken(
  advisorToken: string
): Promise<FounderAlignmentAdvisorInviteLookupResult> {
  const normalizedToken = advisorToken.trim();
  if (!normalizedToken) {
    return { status: "not_found" };
  }

  const privileged = createPrivilegedClient();
  if (!privileged) {
    return { status: "not_found" };
  }

  const relationshipAdvisorRow = await loadRelationshipAdvisorAccessRowByToken(
    normalizedToken,
    privileged
  );
  const advisorRow = relationshipAdvisorRow
    ? null
    : await loadAdvisorAccessRowByToken(normalizedToken, privileged);
  const invitationId =
    relationshipAdvisorRow?.source_invitation_id ?? advisorRow?.invitation_id ?? null;

  if (!invitationId) {
    return { status: "not_found" };
  }

  const [invitationResult, reportRunResult, workbookResult] = await Promise.all([
    privileged
      .from("invitations")
      .select("id, inviter_user_id, invitee_user_id, invitee_email, team_context, status")
      .eq("id", invitationId)
      .maybeSingle(),
    privileged
      .from("report_runs")
      .select("invitation_id, created_at, payload")
      .eq("invitation_id", invitationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    privileged
      .from("founder_alignment_workbooks")
      .select("invitation_id")
      .eq("invitation_id", invitationId)
      .maybeSingle(),
  ]);

  const invitation = invitationResult.data as AdvisorInviteInvitationRow | null;
  if (!invitation) {
    return { status: "not_found" };
  }

  const profileIds = [invitation.inviter_user_id, invitation.invitee_user_id].filter(
    (value): value is string => Boolean(value)
  );
  const { data: profileRows } = await privileged
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", profileIds);

  const profileByUserId = new Map(
    ((profileRows ?? []) as AdvisorInviteProfileRow[]).map((row) => [
      row.user_id,
      row.display_name?.trim() ?? "",
    ])
  );
  const latestReportRun = reportRunResult.data as AdvisorInviteReportRunRow | null;
  const founderAApproved =
    relationshipAdvisorRow?.founder_a_approved ?? advisorRow?.founder_a_approved ?? false;
  const founderBApproved =
    relationshipAdvisorRow?.founder_b_approved ?? advisorRow?.founder_b_approved ?? false;
  const advisorUserId =
    relationshipAdvisorRow?.advisor_user_id ?? advisorRow?.advisor_user_id ?? null;
  const advisorName =
    relationshipAdvisorRow?.advisor_name ?? advisorRow?.advisor_name ?? null;

  return {
    status: "ready",
    invitationId: invitation.id,
    teamContext: normalizeAdvisorInviteTeamContext(invitation.team_context),
    founderAName: profileByUserId.get(invitation.inviter_user_id)?.trim() || "Founder A",
    founderBName:
      (invitation.invitee_user_id
        ? profileByUserId.get(invitation.invitee_user_id)?.trim()
        : invitation.invitee_email?.split("@")[0]?.trim()) || "Founder B",
    founderAApproved,
    founderBApproved,
    advisorName,
    advisorLinked: Boolean(advisorUserId),
    advisorUserId,
    reportReady: Boolean(latestReportRun),
    workbookReady: Boolean(workbookResult.data || latestReportRun),
    reportType: latestReportRun?.payload?.reportType ?? null,
  };
}
