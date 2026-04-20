import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { hasProfileRole, normalizeProfileRoles } from "@/features/profile/profileRoles";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { sanitizeFounderAlignmentWorkbookPayload } from "@/features/reporting/founderAlignmentWorkbook";
import { listRelationshipAdvisorsForUser } from "@/features/reporting/relationshipAdvisorAccess";

export type DashboardRoleKey = "founder" | "advisor";

export type DashboardRoleViews = {
  hasFounder: boolean;
  hasAdvisor: boolean;
  roles: DashboardRoleKey[];
};

type AdvisorAccessRow = {
  invitation_id: string;
  advisor_name: string | null;
  founder_a_approved: boolean;
  founder_b_approved: boolean;
  approved_at: string | null;
  claimed_at: string | null;
};

type RelationshipAdvisorAccessRow = {
  relationship_id: string;
  source_invitation_id: string | null;
  advisor_name: string | null;
  founder_a_approved: boolean;
  founder_b_approved: boolean;
  status: "pending" | "approved" | "linked" | "revoked";
  approved_at: string | null;
  linked_at: string | null;
  revoked_at: string | null;
};

type InvitationRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  invitee_email: string | null;
  team_context: string | null;
  status: string;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_id: string | null;
  avatar_url: string | null;
};

type WorkbookRow = {
  invitation_id: string;
  updated_at: string;
  payload: unknown;
};

type ReportRunRow = {
  invitation_id: string;
  created_at: string;
  payload?: unknown;
};

type SubmittedBaseAssessmentRow = {
  user_id: string;
  submitted_at: string | null;
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

export type AdvisorDashboardTeam = {
  invitationId: string;
  founderAName: string;
  founderBName: string;
  founderAAvatarId: string | null;
  founderBAvatarId: string | null;
  founderAAvatarUrl: string | null;
  founderBAvatarUrl: string | null;
  teamContext: "pre_founder" | "existing_team";
  accessStatus: "ready" | "waiting_for_approval" | "paused";
  accessStatusLabel: string;
  accessStatusDescription: string;
  approvalSummary: string;
  statusLabel: string;
  lastActivityLabel: string;
  followUpLabel: string;
  canOpenWorkbook: boolean;
  workbookHref: string;
  reportHref: string;
  reportReady: boolean;
  snapshotHref: string;
};

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasRenderableAdvisorReportPayload(payload: unknown) {
  const record = toRecord(payload);
  const founderScoring = toRecord(record?.founderScoring);

  return Array.isArray(founderScoring?.dimensions);
}

export type AdvisorDashboardProfile = {
  displayName: string | null;
  avatarId: string | null;
  avatarUrl: string | null;
};

function normalizeTeamContext(value: string | null): "pre_founder" | "existing_team" {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

function teamContextLabel(teamContext: "pre_founder" | "existing_team") {
  return teamContext === "existing_team" ? "Bestehendes Team" : "Pre-Founder";
}

function formatTimestamp(value: string | null) {
  if (!value) return "Noch keine Aktivitaet";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function deriveAdvisorStatusLabel(params: {
  hasReport: boolean;
  hasWorkbook: boolean;
  hasAdvisorClosing: boolean;
  hasFounderReaction: boolean;
  teamContext: "pre_founder" | "existing_team";
}) {
  if (params.hasFounderReaction) {
    return "Founder haben reagiert";
  }

  if (params.hasAdvisorClosing) {
    return "Warten auf Founder-Reaktion";
  }

  if (params.hasWorkbook) {
    return "Advisor-Impulse offen";
  }

  if (params.hasReport) {
    return params.teamContext === "existing_team" ? "Alignment bereit" : "Matching bereit";
  }

  return "Noch kein Workbook";
}

function deriveAdvisorAccessState(row: AdvisorAccessRow | RelationshipAdvisorAccessRow): Pick<
  AdvisorDashboardTeam,
  "accessStatus" | "accessStatusLabel" | "accessStatusDescription" | "approvalSummary" | "canOpenWorkbook"
> {
  const founderAApproved = row.founder_a_approved === true;
  const founderBApproved = row.founder_b_approved === true;
  const isRevoked = "status" in row ? row.status === "revoked" || Boolean(row.revoked_at) : false;

  if (isRevoked) {
    return {
      accessStatus: "paused",
      accessStatusLabel: "Zugriff widerrufen",
      accessStatusDescription: "Die Advisor-Freigabe wurde für dieses Team widerrufen.",
      approvalSummary: `${Number(founderAApproved) + Number(founderBApproved)} von 2 Freigaben`,
      canOpenWorkbook: false,
    };
  }

  if (founderAApproved && founderBApproved) {
    return {
      accessStatus: "ready",
      accessStatusLabel: "Freigegeben",
      accessStatusDescription: "Beide Founder haben die Begleitung freigegeben.",
      approvalSummary: "2 von 2 Freigaben",
      canOpenWorkbook: true,
    };
  }

  const approvalSummary = `${Number(founderAApproved) + Number(founderBApproved)} von 2 Freigaben`;

  if (row.approved_at) {
    return {
      accessStatus: "paused",
      accessStatusLabel: "Zugriff pausiert",
      accessStatusDescription: "Die Freigabe ist nicht mehr vollstaendig aktiv.",
      approvalSummary,
      canOpenWorkbook: false,
    };
  }

  return {
    accessStatus: "waiting_for_approval",
    accessStatusLabel: "Wartet auf Freigabe",
    accessStatusDescription: "Du kannst arbeiten, sobald beide Founder zugestimmt haben.",
    approvalSummary,
    canOpenWorkbook: false,
  };
}

function advisorFollowUpLabel(value: unknown) {
  if (value === "four_weeks") return "Follow-up in 4 Wochen";
  if (value === "three_months") return "Follow-up in 3 Monaten";
  return "Kein Follow-up gesetzt";
}

export async function getDashboardRoleViews(userId: string): Promise<DashboardRoleViews> {
  const supabase = await createClient();
  const [profile, advisorAccess, relationshipAdvisorAccess] = await Promise.all([
    getProfileBasicsRow(supabase, userId).catch(() => null),
    supabase
      .from("founder_alignment_workbook_advisors")
      .select("invitation_id")
      .eq("advisor_user_id", userId)
      .limit(1),
    listRelationshipAdvisorsForUser(userId, supabase),
  ]);

  const roles = normalizeProfileRoles(profile?.roles ?? null);
  const hasFounder = hasProfileRole(roles, "founder");
  const hasAdvisor =
    hasProfileRole(roles, "advisor") ||
    Boolean((advisorAccess.data ?? []).length > 0) ||
    relationshipAdvisorAccess.length > 0;

  return {
    hasFounder,
    hasAdvisor,
    roles,
  };
}

export async function getAdvisorDashboardProfile(userId: string): Promise<AdvisorDashboardProfile> {
  const supabase = await createClient();
  const profile = await getProfileBasicsRow(supabase, userId).catch(() => null);

  return {
    displayName: profile?.display_name?.trim() || null,
    avatarId: profile?.avatar_id?.trim() || null,
    avatarUrl: profile?.avatar_url?.trim() || null,
  };
}

export async function getAdvisorDashboardTeams(userId: string): Promise<AdvisorDashboardTeam[]> {
  const supabase = await createClient();
  const [relationshipAdvisorRows, legacyAdvisorAccessResult] = await Promise.all([
    listRelationshipAdvisorsForUser(userId, supabase),
    supabase
    .from("founder_alignment_workbook_advisors")
    .select("invitation_id, advisor_name, founder_a_approved, founder_b_approved, approved_at, claimed_at")
    .eq("advisor_user_id", userId),
  ]);

  const advisorAccessRows = legacyAdvisorAccessResult.data ?? [];
  const advisorAccessError = legacyAdvisorAccessResult.error;
  if (
    relationshipAdvisorRows.length === 0 &&
    (advisorAccessError || !advisorAccessRows || advisorAccessRows.length === 0)
  ) {
    return [];
  }

  const advisorAccess = advisorAccessRows as AdvisorAccessRow[];
  const legacyAdvisorAccessByInvitationId = new Map(
    advisorAccess.map((row) => [row.invitation_id, row])
  );
  const relationshipAdvisorAccessByInvitationId = new Map(
    relationshipAdvisorRows
      .filter((row): row is typeof row & { source_invitation_id: string } => Boolean(row.source_invitation_id))
      .map((row) => [row.source_invitation_id, row as RelationshipAdvisorAccessRow])
  );
  const invitationIds = [
    ...new Set([
      ...advisorAccess.map((row) => row.invitation_id),
      ...relationshipAdvisorRows
        .map((row) => row.source_invitation_id)
        .filter((value): value is string => Boolean(value)),
    ]),
  ];
  const privileged = createPrivilegedClient();
  const dataClient = privileged ?? supabase;

  const [invitationResult, workbookResult, reportRunResult] = await Promise.all([
    dataClient
      .from("invitations")
      .select("id, inviter_user_id, invitee_user_id, invitee_email, team_context, status, created_at")
      .in("id", invitationIds),
    dataClient
      .from("founder_alignment_workbooks")
      .select("invitation_id, updated_at, payload")
      .in("invitation_id", invitationIds),
    dataClient
      .from("report_runs")
      .select("invitation_id, created_at, payload")
      .in("invitation_id", invitationIds)
      .order("created_at", { ascending: false }),
  ]);

  if (invitationResult.error || !invitationResult.data) {
    return [];
  }

  const invitations = invitationResult.data as InvitationRow[];
  const workbooks = (workbookResult.data ?? []) as WorkbookRow[];
  const reportRuns = (reportRunResult.data ?? []) as ReportRunRow[];

  const relevantUserIds = [
    ...new Set(
      invitations
        .flatMap((invitation) => [invitation.inviter_user_id, invitation.invitee_user_id])
        .filter((value): value is string => Boolean(value))
    ),
  ];

  const [{ data: profileRows }, submittedBaseAssessmentsResult] = await Promise.all([
    dataClient
      .from("profiles")
      .select("user_id, display_name, avatar_id, avatar_url")
      .in("user_id", relevantUserIds),
    relevantUserIds.length > 0
      ? dataClient
          .from("assessments")
          .select("user_id, submitted_at")
          .eq("module", "base")
          .not("submitted_at", "is", null)
          .in("user_id", relevantUserIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

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
  const workbookByInvitationId = new Map(workbooks.map((row) => [row.invitation_id, row]));
  const reportRunByInvitationId = new Map<string, ReportRunRow>();
  for (const row of reportRuns) {
    if (!reportRunByInvitationId.has(row.invitation_id)) {
      reportRunByInvitationId.set(row.invitation_id, row);
    }
  }
  const latestSubmittedBaseByUserId = new Map<string, string>();
  for (const row of (submittedBaseAssessmentsResult.data ?? []) as SubmittedBaseAssessmentRow[]) {
    if (!row.submitted_at) continue;
    const current = latestSubmittedBaseByUserId.get(row.user_id);
    if (!current || row.submitted_at > current) {
      latestSubmittedBaseByUserId.set(row.user_id, row.submitted_at);
    }
  }

  return invitations
    .map((invitation) => {
      const teamContext = normalizeTeamContext(invitation.team_context);
      const workbook = workbookByInvitationId.get(invitation.id) ?? null;
      const reportRun = reportRunByInvitationId.get(invitation.id) ?? null;
      const accessRow =
        relationshipAdvisorAccessByInvitationId.get(invitation.id) ??
        legacyAdvisorAccessByInvitationId.get(invitation.id) ??
        null;
      if (!accessRow) return null;
      const accessState = deriveAdvisorAccessState(accessRow);
      const workbookPayload = workbook
        ? sanitizeFounderAlignmentWorkbookPayload(workbook.payload)
        : null;
      const hasAdvisorClosing = Boolean(
        workbookPayload?.advisorClosing.observations.trim() ||
          workbookPayload?.advisorClosing.questions.trim() ||
          workbookPayload?.advisorClosing.nextSteps.trim()
      );
      const hasFounderReaction = Boolean(
        workbookPayload?.founderReaction.status || workbookPayload?.founderReaction.comment.trim()
      );
      const founderAName =
        profileByUserId.get(invitation.inviter_user_id)?.displayName || "Founder A";
      const founderBName =
        (invitation.invitee_user_id
          ? profileByUserId.get(invitation.invitee_user_id)?.displayName
          : invitation.invitee_email?.split("@")[0]?.trim()) || "Founder B";
      const founderAProfile = profileByUserId.get(invitation.inviter_user_id);
      const founderBProfile = invitation.invitee_user_id
        ? profileByUserId.get(invitation.invitee_user_id)
        : null;
      const hasBothBaseSubmissions = Boolean(
        latestSubmittedBaseByUserId.get(invitation.inviter_user_id) &&
          invitation.invitee_user_id &&
          latestSubmittedBaseByUserId.get(invitation.invitee_user_id)
      );
      const lastActivitySource = [workbook?.updated_at ?? null, reportRun?.created_at ?? null, invitation.created_at]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;

      const reportReady =
        hasRenderableAdvisorReportPayload(reportRun?.payload) ||
        Boolean(reportRun) ||
        hasBothBaseSubmissions;

      return {
        invitationId: invitation.id,
        founderAName,
        founderBName,
        founderAAvatarId: founderAProfile?.avatarId || null,
        founderBAvatarId: founderBProfile?.avatarId || null,
        founderAAvatarUrl: founderAProfile?.avatarUrl || null,
        founderBAvatarUrl: founderBProfile?.avatarUrl || null,
        teamContext,
        ...accessState,
        statusLabel: deriveAdvisorStatusLabel({
          hasReport: Boolean(reportRun),
          hasWorkbook: Boolean(workbook),
          hasAdvisorClosing,
          hasFounderReaction,
          teamContext,
        }),
        lastActivityLabel: `${teamContextLabel(teamContext)} · ${formatTimestamp(lastActivitySource)}`,
        followUpLabel: advisorFollowUpLabel(workbookPayload?.advisorFollowUp),
        workbookHref: `/founder-alignment/workbook?invitationId=${invitation.id}&teamContext=${teamContext}`,
        reportHref: `/advisor/report?invitationId=${invitation.id}`,
        reportReady,
        snapshotHref: `/advisor/snapshot?invitationId=${invitation.id}&teamContext=${teamContext}`,
        _lastActivityAt: lastActivitySource ?? "",
      };
    })
    .filter((team): team is AdvisorDashboardTeam & { _lastActivityAt: string } => Boolean(team))
    .sort((left, right) => right._lastActivityAt.localeCompare(left._lastActivityAt, "de"))
    .map(({ _lastActivityAt, ...team }) => {
      void _lastActivityAt;
      return team satisfies AdvisorDashboardTeam;
    });
}
