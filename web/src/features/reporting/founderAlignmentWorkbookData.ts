import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getFounderScoringDebug } from "@/features/scoring/founderScoringDebug";
import {
  normalizeDimensionName,
  scoreFounderAlignment,
  type Answer,
  type TeamScoringResult,
} from "@/features/scoring/founderScoring";
import {
  buildFounderAlignmentReport,
  type FounderAlignmentReport,
} from "@/features/reporting/buildFounderAlignmentReport";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import {
  buildEmptyFounderAlignmentWorkbookPayload,
  deriveFounderAlignmentWorkbookHighlights,
  sanitizeFounderAlignmentWorkbookPayload,
  type FounderAlignmentWorkbookHighlights,
  type FounderAlignmentWorkbookPayload,
  type WorkbookStepMarkersByStep,
} from "@/features/reporting/founderAlignmentWorkbook";
import {
  getPrivilegedReportRunSnapshotForInvitation,
  getReportRunSnapshotForSession,
} from "@/features/reporting/actions";
import { type FounderAlignmentWorkbookAdvisorInviteState } from "@/features/reporting/founderAlignmentWorkbookAdvisor";

type WorkbookRow = {
  invitation_id: string;
  team_context: TeamContext;
  payload: unknown;
  updated_at: string;
  updated_by: string;
};

type WorkbookAdvisorRow = {
  invitation_id: string;
  advisor_user_id: string | null;
  advisor_name: string | null;
  founder_a_approved: boolean;
  founder_b_approved: boolean;
};

type InvitationRow = {
  inviter_user_id: string;
  invitee_user_id: string | null;
  team_context: string | null;
};

function parseStoredTeamContext(value: string | null | undefined): TeamContext | null {
  if (value === "existing_team") return "existing_team";
  if (value === "pre_founder") return "pre_founder";
  return null;
}

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_id: string | null;
  avatar_url: string | null;
};

type ProfileIdentity = {
  displayName: string | null;
  avatarId: string | null;
  avatarUrl: string | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseLikeClient = Pick<SupabaseServerClient, "from">;

function createPrivilegedClient(): SupabaseLikeClient | null {
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

export type FounderAlignmentWorkbookViewerRole = "founderA" | "founderB" | "advisor" | "unknown";

export type FounderAlignmentWorkbookPageData =
  | {
      status: "ready";
      invitationId: string | null;
      teamContext: TeamContext;
      founderAName: string | null;
      founderBName: string | null;
      founderAAvatarId: string | null;
      founderBAvatarId: string | null;
      founderAAvatarUrl: string | null;
      founderBAvatarUrl: string | null;
      currentUserRole: FounderAlignmentWorkbookViewerRole;
      report: FounderAlignmentReport;
      scoringResult: TeamScoringResult;
      workbook: FounderAlignmentWorkbookPayload;
      highlights: FounderAlignmentWorkbookHighlights;
      stepMarkersByStep: WorkbookStepMarkersByStep;
      canSave: boolean;
      persisted: boolean;
      updatedAt: string | null;
      source: "live" | "mock";
      storedTeamContext: TeamContext | null;
      hasTeamContextMismatch: boolean;
      showValuesStep: boolean;
      advisorInvite: FounderAlignmentWorkbookAdvisorInviteState;
    }
  | {
      status: "missing_invitation" | "forbidden" | "in_progress";
      invitationId: string | null;
      teamContext: TeamContext;
      reason: string | null;
    };

function buildMockAnswers() {
  const personA: Answer[] = [
    { question_id: "vision-1", dimension: "Unternehmenslogik", value: 100 },
    { question_id: "vision-2", dimension: "Unternehmenslogik", value: 75 },
    { question_id: "decision-1", dimension: "Entscheidungslogik", value: 75 },
    { question_id: "decision-2", dimension: "Entscheidungslogik", value: 50 },
    { question_id: "risk-1", dimension: "Risikoorientierung", value: 100 },
    { question_id: "risk-2", dimension: "Risikoorientierung", value: 75 },
    {
      question_id: "work-1",
      dimension: "Arbeitsstruktur & Zusammenarbeit",
      value: 75,
    },
    {
      question_id: "work-2",
      dimension: "Arbeitsstruktur & Zusammenarbeit",
      value: 50,
    },
    { question_id: "commitment-1", dimension: "Commitment", value: 100 },
    { question_id: "commitment-2", dimension: "Commitment", value: 75 },
    { question_id: "conflict-1", dimension: "Konfliktstil", value: 50 },
    { question_id: "conflict-2", dimension: "Konfliktstil", value: 25 },
  ];

  const personB: Answer[] = [
    { question_id: "vision-1-b", dimension: "Unternehmenslogik", value: 75 },
    { question_id: "vision-2-b", dimension: "Unternehmenslogik", value: 75 },
    { question_id: "decision-1-b", dimension: "Entscheidungslogik", value: 25 },
    { question_id: "decision-2-b", dimension: "Entscheidungslogik", value: 50 },
    { question_id: "risk-1-b", dimension: "Risikoorientierung", value: 25 },
    { question_id: "risk-2-b", dimension: "Risikoorientierung", value: 50 },
    {
      question_id: "work-1-b",
      dimension: "Arbeitsstruktur & Zusammenarbeit",
      value: 50,
    },
    {
      question_id: "work-2-b",
      dimension: "Arbeitsstruktur & Zusammenarbeit",
      value: 75,
    },
    { question_id: "commitment-1-b", dimension: "Commitment", value: 50 },
    { question_id: "commitment-2-b", dimension: "Commitment", value: 50 },
    { question_id: "conflict-1-b", dimension: "Konfliktstil", value: 100 },
    { question_id: "conflict-2-b", dimension: "Konfliktstil", value: 75 },
  ];

  return { personA, personB };
}

async function loadFounderContextWithClient(
  invitationId: string,
  supabase: SupabaseLikeClient
): Promise<{
  founderAName: string | null;
  founderBName: string | null;
  founderAAvatarId: string | null;
  founderBAvatarId: string | null;
  founderAAvatarUrl: string | null;
  founderBAvatarUrl: string | null;
  founderAUserId: string | null;
  founderBUserId: string | null;
  teamContext: TeamContext | null;
}> {
  const { data: invitation } = await supabase
    .from("invitations")
    .select("inviter_user_id, invitee_user_id, team_context")
    .eq("id", invitationId)
    .maybeSingle();

  const typedInvitation = invitation as InvitationRow | null;
  if (!typedInvitation?.inviter_user_id || !typedInvitation?.invitee_user_id) {
    return {
      founderAName: null,
      founderBName: null,
      founderAAvatarId: null,
      founderBAvatarId: null,
      founderAAvatarUrl: null,
      founderBAvatarUrl: null,
      founderAUserId: typedInvitation?.inviter_user_id ?? null,
      founderBUserId: typedInvitation?.invitee_user_id ?? null,
      teamContext: parseStoredTeamContext(typedInvitation?.team_context),
    };
  }

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_id, avatar_url")
    .in("user_id", [typedInvitation.inviter_user_id, typedInvitation.invitee_user_id]);

  const profileByUserId = new Map(
    ((profileRows ?? []) as ProfileRow[]).map((row) => [
      row.user_id,
      {
        displayName: row.display_name?.trim() ?? "",
        avatarId: row.avatar_id?.trim() ?? "",
        avatarUrl: row.avatar_url?.trim() ?? "",
      },
    ])
  );

  return {
    founderAName: profileByUserId.get(typedInvitation.inviter_user_id)?.displayName || null,
    founderBName: profileByUserId.get(typedInvitation.invitee_user_id)?.displayName || null,
    founderAAvatarId: profileByUserId.get(typedInvitation.inviter_user_id)?.avatarId || null,
    founderBAvatarId: profileByUserId.get(typedInvitation.invitee_user_id)?.avatarId || null,
    founderAAvatarUrl: profileByUserId.get(typedInvitation.inviter_user_id)?.avatarUrl || null,
    founderBAvatarUrl: profileByUserId.get(typedInvitation.invitee_user_id)?.avatarUrl || null,
    founderAUserId: typedInvitation.inviter_user_id,
    founderBUserId: typedInvitation.invitee_user_id,
    teamContext: parseStoredTeamContext(typedInvitation.team_context),
  };
}

async function loadWorkbookRowWithClient(
  invitationId: string,
  supabase: SupabaseLikeClient
): Promise<WorkbookRow | null> {
  const { data, error } = await supabase
    .from("founder_alignment_workbooks")
    .select("invitation_id, team_context, payload, updated_at, updated_by")
    .eq("invitation_id", invitationId)
    .maybeSingle();

  if (error || !data) return null;
  return data as WorkbookRow;
}
async function loadWorkbookAdvisorRowWithClient(
  invitationId: string,
  supabase: SupabaseLikeClient
): Promise<WorkbookAdvisorRow | null> {
  const { data, error } = await supabase
    .from("founder_alignment_workbook_advisors")
    .select(
      "invitation_id, advisor_user_id, advisor_name, founder_a_approved, founder_b_approved"
    )
    .eq("invitation_id", invitationId)
    .maybeSingle();

  if (error || !data) return null;
  return data as WorkbookAdvisorRow;
}

async function loadProfileIdentityWithClient(
  userId: string | null | undefined,
  supabase: SupabaseLikeClient
): Promise<ProfileIdentity | null> {
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_id, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  const profile = data as ProfileRow | null;
  if (!profile) return null;

  return {
    displayName: profile.display_name?.trim() || null,
    avatarId: profile.avatar_id?.trim() || null,
    avatarUrl: profile.avatar_url?.trim() || null,
  };
}

function advisorInviteStateFromRow(
  advisorRow: WorkbookAdvisorRow | null,
  advisorProfile: ProfileIdentity | null = null
): FounderAlignmentWorkbookAdvisorInviteState {
  return {
    founderAApproved: advisorRow?.founder_a_approved ?? false,
    founderBApproved: advisorRow?.founder_b_approved ?? false,
    advisorLinked: Boolean(advisorRow?.advisor_user_id),
    advisorName: advisorProfile?.displayName ?? advisorRow?.advisor_name ?? null,
  };
}

function hasActiveAdvisorAccess(
  advisorRow: WorkbookAdvisorRow | null,
  userId: string | null | undefined
) {
  return Boolean(
    userId &&
      advisorRow?.advisor_user_id === userId &&
      advisorRow.founder_a_approved === true &&
      advisorRow.founder_b_approved === true
  );
}

export async function getFounderAlignmentWorkbookPageData(
  invitationId: string | null,
  teamContext: TeamContext
): Promise<FounderAlignmentWorkbookPageData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const normalizedInvitationId = invitationId?.trim() ?? "";

  if (!normalizedInvitationId) {
    const scoringResult = scoreFounderAlignment(buildMockAnswers());
    const report = buildFounderAlignmentReport({
      scoringResult,
      teamContext,
    });
    const highlights = deriveFounderAlignmentWorkbookHighlights(report, scoringResult);

    return {
      status: "ready",
      invitationId: null,
      teamContext,
      founderAName: "Maria Keller",
      founderBName: "Lukas Brandt",
      founderAAvatarId: "avatar-04",
      founderBAvatarId: "avatar-17",
      founderAAvatarUrl: null,
      founderBAvatarUrl: null,
      currentUserRole: "founderA",
      report,
      scoringResult,
      workbook: buildEmptyFounderAlignmentWorkbookPayload(),
      highlights,
      stepMarkersByStep: highlights.stepMarkersByStep,
      canSave: false,
      persisted: false,
      updatedAt: null,
      source: "mock",
      storedTeamContext: null,
      hasTeamContextMismatch: false,
      showValuesStep: false,
      advisorInvite: advisorInviteStateFromRow(null),
    };
  }

  const advisorRow = await loadWorkbookAdvisorRowWithClient(normalizedInvitationId, supabase);
  const isLinkedAdvisor = hasActiveAdvisorAccess(advisorRow, user?.id);
  const privileged = isLinkedAdvisor ? createPrivilegedClient() : null;
  const dataClient = privileged ?? supabase;

  const founderContextClient = createPrivilegedClient() ?? dataClient;

  const [debugResult, founderContext, workbookRow, reportSnapshot, advisorProfile] = await Promise.all([
    isLinkedAdvisor ? Promise.resolve(null) : getFounderScoringDebug(normalizedInvitationId),
    loadFounderContextWithClient(normalizedInvitationId, founderContextClient),
    loadWorkbookRowWithClient(normalizedInvitationId, dataClient),
    isLinkedAdvisor
      ? getPrivilegedReportRunSnapshotForInvitation(normalizedInvitationId)
      : getReportRunSnapshotForSession(normalizedInvitationId),
    loadProfileIdentityWithClient(advisorRow?.advisor_user_id, founderContextClient),
  ]);

  const snapshotHasFounderAlignmentData = Boolean(
    reportSnapshot?.reportType === "founder_alignment_v1" &&
      reportSnapshot.founderReport &&
      reportSnapshot.founderScoring
  );

  if (
    !snapshotHasFounderAlignmentData &&
    (isLinkedAdvisor || !debugResult || debugResult.status !== "ready" || !debugResult.scoring)
  ) {
    const fallbackStatus: FounderAlignmentWorkbookPageData["status"] =
      isLinkedAdvisor || !debugResult
        ? "in_progress"
        : debugResult.status === "ready"
          ? "in_progress"
          : debugResult.status;

    return {
      status: fallbackStatus,
      invitationId: normalizedInvitationId,
      teamContext: founderContext.teamContext ?? teamContext,
      reason: isLinkedAdvisor ? "report_snapshot_pending" : (debugResult?.reason ?? null),
    };
  }

  const effectiveTeamContext = founderContext.teamContext ?? teamContext;
  const scoringResult =
    snapshotHasFounderAlignmentData && reportSnapshot?.founderScoring
      ? reportSnapshot.founderScoring
      : debugResult!.scoring!;
  const report =
    snapshotHasFounderAlignmentData && reportSnapshot?.founderReport
      ? reportSnapshot.founderReport
      : buildFounderAlignmentReport({
          scoringResult,
          teamContext: effectiveTeamContext,
        });

  const workbook = workbookRow
    ? sanitizeFounderAlignmentWorkbookPayload(workbookRow.payload)
    : buildEmptyFounderAlignmentWorkbookPayload();
  if (advisorRow?.advisor_user_id) {
    workbook.advisorId = advisorRow.advisor_user_id;
  }
  const advisorDisplayName = advisorProfile?.displayName ?? advisorRow?.advisor_name ?? null;
  if (advisorDisplayName) {
    workbook.advisorName = advisorDisplayName;
  }
  const storedTeamContext = workbookRow?.team_context ?? null;
  const hasTeamContextMismatch =
    Boolean(workbookRow?.team_context) && workbookRow?.team_context !== effectiveTeamContext;
  const showValuesStep = Boolean(
    reportSnapshot?.report &&
      reportSnapshot.report.valuesTotal > 0 &&
      reportSnapshot.report.valuesAnsweredA >= reportSnapshot.report.valuesTotal &&
      reportSnapshot.report.valuesAnsweredB >= reportSnapshot.report.valuesTotal
  );

  const currentUserRole: FounderAlignmentWorkbookViewerRole =
    user?.id && founderContext.founderAUserId === user.id
      ? "founderA"
      : user?.id && founderContext.founderBUserId === user.id
      ? "founderB"
        : hasActiveAdvisorAccess(advisorRow, user?.id)
          ? "advisor"
          : "unknown";

  if (currentUserRole === "unknown") {
    return {
      status: "forbidden",
      invitationId: normalizedInvitationId,
      teamContext: effectiveTeamContext,
      reason: "viewer_not_linked",
    };
  }

  const highlights = deriveFounderAlignmentWorkbookHighlights(report, scoringResult);

  return {
    status: "ready",
    invitationId: normalizedInvitationId,
    teamContext: effectiveTeamContext,
    founderAName: founderContext.founderAName ?? reportSnapshot?.report?.participantAName ?? null,
    founderBName: founderContext.founderBName ?? reportSnapshot?.report?.participantBName ?? null,
    founderAAvatarId: founderContext.founderAAvatarId,
    founderBAvatarId: founderContext.founderBAvatarId,
    founderAAvatarUrl: founderContext.founderAAvatarUrl,
    founderBAvatarUrl: founderContext.founderBAvatarUrl,
    currentUserRole,
    report,
    scoringResult,
    workbook,
    highlights,
    stepMarkersByStep: highlights.stepMarkersByStep,
    canSave: true,
    persisted: Boolean(workbookRow),
    updatedAt: workbookRow?.updated_at ?? null,
    source: "live",
    storedTeamContext,
    hasTeamContextMismatch,
    showValuesStep,
    advisorInvite: advisorInviteStateFromRow(advisorRow, advisorProfile),
  };
}

export function workbookDimensionFit(
  scoringResult: TeamScoringResult,
  dimensions: string[]
) {
  const normalizedTargets = dimensions.map((dimension) => normalizeDimensionName(dimension));
  return scoringResult.dimensions.filter((dimension) =>
    normalizedTargets.includes(normalizeDimensionName(dimension.dimension))
  );
}
