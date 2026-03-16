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
} from "@/features/reporting/founderAlignmentWorkbook";
import { getReportRunSnapshotForSession } from "@/features/reporting/actions";
import {
  claimFounderAlignmentAdvisorAccess,
} from "@/features/reporting/founderAlignmentWorkbookActions";
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
};

export type FounderAlignmentWorkbookViewerRole = "founderA" | "founderB" | "advisor" | "unknown";

export type FounderAlignmentWorkbookPageData =
  | {
      status: "ready";
      invitationId: string | null;
      teamContext: TeamContext;
      founderAName: string | null;
      founderBName: string | null;
      currentUserRole: FounderAlignmentWorkbookViewerRole;
      report: FounderAlignmentReport;
      scoringResult: TeamScoringResult;
      workbook: FounderAlignmentWorkbookPayload;
      highlights: FounderAlignmentWorkbookHighlights;
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
    { question_id: "vision-1", dimension: "Vision & Unternehmenshorizont", value: 100 },
    { question_id: "vision-2", dimension: "Vision & Unternehmenshorizont", value: 75 },
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
    { question_id: "vision-1-b", dimension: "Vision & Unternehmenshorizont", value: 75 },
    { question_id: "vision-2-b", dimension: "Vision & Unternehmenshorizont", value: 75 },
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

async function loadFounderContext(invitationId: string): Promise<{
  founderAName: string | null;
  founderBName: string | null;
  founderAUserId: string | null;
  founderBUserId: string | null;
  teamContext: TeamContext | null;
}> {
  const supabase = await createClient();
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
      founderAUserId: typedInvitation?.inviter_user_id ?? null,
      founderBUserId: typedInvitation?.invitee_user_id ?? null,
      teamContext: parseStoredTeamContext(typedInvitation?.team_context),
    };
  }

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", [typedInvitation.inviter_user_id, typedInvitation.invitee_user_id]);

  const profileByUserId = new Map(
    ((profileRows ?? []) as ProfileRow[]).map((row) => [row.user_id, row.display_name?.trim() ?? ""])
  );

  return {
    founderAName: profileByUserId.get(typedInvitation.inviter_user_id)?.trim() || null,
    founderBName: profileByUserId.get(typedInvitation.invitee_user_id)?.trim() || null,
    founderAUserId: typedInvitation.inviter_user_id,
    founderBUserId: typedInvitation.invitee_user_id,
    teamContext: parseStoredTeamContext(typedInvitation.team_context),
  };
}

async function loadWorkbookRow(invitationId: string): Promise<WorkbookRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("founder_alignment_workbooks")
    .select("invitation_id, team_context, payload, updated_at, updated_by")
    .eq("invitation_id", invitationId)
    .maybeSingle();

  if (error || !data) return null;
  return data as WorkbookRow;
}

async function loadWorkbookAdvisorRow(invitationId: string): Promise<WorkbookAdvisorRow | null> {
  const supabase = await createClient();
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

function advisorInviteStateFromRow(
  advisorRow: WorkbookAdvisorRow | null
): FounderAlignmentWorkbookAdvisorInviteState {
  return {
    founderAApproved: advisorRow?.founder_a_approved ?? false,
    founderBApproved: advisorRow?.founder_b_approved ?? false,
    advisorLinked: Boolean(advisorRow?.advisor_user_id),
    advisorName: advisorRow?.advisor_name ?? null,
  };
}

export async function getFounderAlignmentWorkbookPageData(
  invitationId: string | null,
  teamContext: TeamContext,
  advisorToken?: string | null
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

    return {
      status: "ready",
      invitationId: null,
      teamContext,
      founderAName: "Maria Keller",
      founderBName: "Lukas Brandt",
      currentUserRole: "founderA",
      report,
      scoringResult,
      workbook: buildEmptyFounderAlignmentWorkbookPayload(),
      highlights: deriveFounderAlignmentWorkbookHighlights(report, scoringResult),
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

  if (advisorToken?.trim() && user?.id) {
    await claimFounderAlignmentAdvisorAccess({
      invitationId: normalizedInvitationId,
      advisorToken: advisorToken.trim(),
      userId: user.id,
      fallbackName: user.email?.split("@")[0] ?? null,
    });
  }

  const [debugResult, founderContext, workbookRow, reportSnapshot, advisorRow] = await Promise.all([
    getFounderScoringDebug(normalizedInvitationId),
    loadFounderContext(normalizedInvitationId),
    loadWorkbookRow(normalizedInvitationId),
    getReportRunSnapshotForSession(normalizedInvitationId),
    loadWorkbookAdvisorRow(normalizedInvitationId),
  ]);

  if (debugResult.status !== "ready" || !debugResult.scoring) {
    const fallbackStatus: FounderAlignmentWorkbookPageData["status"] =
      debugResult.status === "ready" ? "in_progress" : debugResult.status;

    return {
      status: fallbackStatus,
      invitationId: normalizedInvitationId,
      teamContext: founderContext.teamContext ?? teamContext,
      reason: debugResult.reason,
    };
  }

  const effectiveTeamContext = founderContext.teamContext ?? teamContext;

  const report = buildFounderAlignmentReport({
    scoringResult: debugResult.scoring,
    teamContext: effectiveTeamContext,
  });

  const workbook = workbookRow
    ? sanitizeFounderAlignmentWorkbookPayload(workbookRow.payload)
    : buildEmptyFounderAlignmentWorkbookPayload();
  if (advisorRow?.advisor_user_id) {
    workbook.advisorId = advisorRow.advisor_user_id;
  }
  if (advisorRow?.advisor_name) {
    workbook.advisorName = advisorRow.advisor_name;
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
        : user?.id && advisorRow?.advisor_user_id === user.id
          ? "advisor"
          : "unknown";

  return {
    status: "ready",
    invitationId: normalizedInvitationId,
    teamContext: effectiveTeamContext,
    founderAName: founderContext.founderAName,
    founderBName: founderContext.founderBName,
    currentUserRole,
    report,
    scoringResult: debugResult.scoring,
    workbook,
    highlights: deriveFounderAlignmentWorkbookHighlights(report, debugResult.scoring),
    canSave: true,
    persisted: Boolean(workbookRow),
    updatedAt: workbookRow?.updated_at ?? null,
    source: "live",
    storedTeamContext,
    hasTeamContextMismatch,
    showValuesStep,
    advisorInvite: advisorInviteStateFromRow(advisorRow),
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
