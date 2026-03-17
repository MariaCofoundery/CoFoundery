"use server";

import { randomBytes } from "crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import {
  sanitizeFounderAlignmentWorkbookPayload,
  type FounderAlignmentWorkbookPayload,
  type FounderAlignmentWorkbookStepId,
} from "@/features/reporting/founderAlignmentWorkbook";
import {
  buildFounderAlignmentAdvisorInvitePath,
  hashFounderAlignmentAdvisorToken,
  type FounderAlignmentWorkbookAdvisorInviteState,
} from "@/features/reporting/founderAlignmentWorkbookAdvisor";
import { trackServerResearchEvent } from "@/features/research/server";

type SaveFounderAlignmentWorkbookInput = {
  invitationId: string;
  teamContext: TeamContext;
  payload: FounderAlignmentWorkbookPayload;
  editingMode: "personal" | "joint";
};

type InvitationAccessRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
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
};

type WorkbookViewerRole = "founderA" | "founderB" | "advisor" | "unknown";
type WorkbookFounderRole = Extract<WorkbookViewerRole, "founderA" | "founderB">;
type WorkbookEditingMode = "personal" | "joint";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseLikeClient = Pick<SupabaseServerClient, "from">;
type SupabaseDbClient = SupabaseLikeClient & SupabaseClient;

export type SaveFounderAlignmentWorkbookResult =
  | {
      ok: true;
      updatedAt: string;
    }
  | {
      ok: false;
      reason:
        | "missing_invitation"
        | "not_authenticated"
        | "forbidden"
        | "save_failed";
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
      row: AdvisorAccessRow;
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

async function loadInvitationAccessRow(
  invitationId: string,
  supabase: SupabaseLikeClient
): Promise<InvitationAccessRow | null> {
  const { data, error } = await supabase
    .from("invitations")
    .select("id, inviter_user_id, invitee_user_id")
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

async function loadWorkbookPayload(
  invitationId: string,
  supabase: SupabaseLikeClient
): Promise<FounderAlignmentWorkbookPayload> {
  const { data } = await supabase
    .from("founder_alignment_workbooks")
    .select("payload")
    .eq("invitation_id", invitationId)
    .maybeSingle();

  return sanitizeFounderAlignmentWorkbookPayload((data as WorkbookRow | null)?.payload);
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
  if (advisorRow?.advisor_user_id === userId) return "advisor";
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

function mergeFounderPayload(
  existingPayload: FounderAlignmentWorkbookPayload,
  incomingPayload: FounderAlignmentWorkbookPayload,
  role: WorkbookFounderRole,
  editingMode: WorkbookEditingMode
) {
  const nextPayload = sanitizeFounderAlignmentWorkbookPayload(incomingPayload);

  return {
    ...existingPayload,
    currentStepId: nextPayload.currentStepId,
    advisorId: existingPayload.advisorId,
    advisorName: existingPayload.advisorName,
    advisorClosing: existingPayload.advisorClosing,
    advisorFollowUp: existingPayload.advisorFollowUp,
    founderReaction: {
      status: nextPayload.founderReaction.status,
      comment: nextPayload.founderReaction.comment,
    },
    steps: Object.fromEntries(
      Object.keys(existingPayload.steps).map((stepId) => {
        const typedStepId = stepId as FounderAlignmentWorkbookStepId;
        const existingEntry = existingPayload.steps[typedStepId];
        const incomingEntry = nextPayload.steps[typedStepId];

        const founderA =
          editingMode === "joint" || role === "founderA"
            ? incomingEntry.founderA
            : existingEntry.founderA;
        const founderB =
          editingMode === "joint" || role === "founderB"
            ? incomingEntry.founderB
            : existingEntry.founderB;

        return [
          stepId,
          {
            ...existingEntry,
            founderA,
            founderB,
            agreement: incomingEntry.agreement,
            advisorNotes: existingEntry.advisorNotes,
          },
        ];
      })
    ) as FounderAlignmentWorkbookPayload["steps"],
  } satisfies FounderAlignmentWorkbookPayload;
}

function mergeAdvisorPayload(
  existingPayload: FounderAlignmentWorkbookPayload,
  incomingPayload: FounderAlignmentWorkbookPayload,
  advisorId: string,
  advisorName: string | null
) {
  const nextPayload = sanitizeFounderAlignmentWorkbookPayload(incomingPayload);

  return {
    ...existingPayload,
    currentStepId: nextPayload.currentStepId,
    advisorId,
    advisorName,
    advisorClosing: {
      observations: nextPayload.advisorClosing.observations,
      questions: nextPayload.advisorClosing.questions,
      nextSteps: nextPayload.advisorClosing.nextSteps,
    },
    advisorFollowUp: nextPayload.advisorFollowUp,
    founderReaction: existingPayload.founderReaction,
    steps: Object.fromEntries(
      Object.keys(existingPayload.steps).map((stepId) => [
        stepId,
        {
          ...existingPayload.steps[stepId as FounderAlignmentWorkbookStepId],
          advisorNotes:
            nextPayload.steps[stepId as FounderAlignmentWorkbookStepId]?.advisorNotes ?? "",
        },
      ])
    ) as FounderAlignmentWorkbookPayload["steps"],
  } satisfies FounderAlignmentWorkbookPayload;
}

export async function saveFounderAlignmentWorkbook({
  invitationId,
  teamContext,
  payload,
  editingMode,
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
  const [existingPayload, advisorRow] = await Promise.all([
    loadWorkbookPayload(normalizedInvitationId, dataClient),
    loadAdvisorAccessRow(normalizedInvitationId, dataClient),
  ]);

  const sanitizedPayload = sanitizeFounderAlignmentWorkbookPayload(payload);
  const payloadToPersist =
    role === "advisor"
      ? mergeAdvisorPayload(
          existingPayload,
          sanitizedPayload,
          user.id,
          advisorRow?.advisor_name ?? existingPayload.advisorName ?? null
        )
      : mergeFounderPayload(existingPayload, sanitizedPayload, role, editingMode);

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

  const currentPayload = await loadWorkbookPayload(invitationId, privileged);
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
    },
  });

  return {
    ok: true,
    row: updatedAdvisorRow as AdvisorAccessRow,
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

  const advisorRow = await loadAdvisorAccessRowByToken(normalizedToken, privileged);
  if (!advisorRow) {
    return { status: "not_found" };
  }

  const [invitationResult, reportRunResult, workbookResult] = await Promise.all([
    privileged
      .from("invitations")
      .select("id, inviter_user_id, invitee_user_id, invitee_email, team_context, status")
      .eq("id", advisorRow.invitation_id)
      .maybeSingle(),
    privileged
      .from("report_runs")
      .select("invitation_id, created_at, payload")
      .eq("invitation_id", advisorRow.invitation_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    privileged
      .from("founder_alignment_workbooks")
      .select("invitation_id")
      .eq("invitation_id", advisorRow.invitation_id)
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

  return {
    status: "ready",
    invitationId: invitation.id,
    teamContext: normalizeAdvisorInviteTeamContext(invitation.team_context),
    founderAName: profileByUserId.get(invitation.inviter_user_id)?.trim() || "Founder A",
    founderBName:
      (invitation.invitee_user_id
        ? profileByUserId.get(invitation.invitee_user_id)?.trim()
        : invitation.invitee_email?.split("@")[0]?.trim()) || "Founder B",
    founderAApproved: advisorRow.founder_a_approved,
    founderBApproved: advisorRow.founder_b_approved,
    advisorName: advisorRow.advisor_name ?? null,
    advisorLinked: Boolean(advisorRow.advisor_user_id),
    advisorUserId: advisorRow.advisor_user_id ?? null,
    reportReady: Boolean(latestReportRun),
    workbookReady: Boolean(workbookResult.data || latestReportRun),
    reportType: latestReportRun?.payload?.reportType ?? null,
  };
}
