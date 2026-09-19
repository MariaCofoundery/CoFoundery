import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { hasProfileRole, normalizeProfileRoles } from "@/features/profile/profileRoles";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import {
  hasLegacyFounderAlignmentWorkbookContent,
  projectFounderAlignmentWorkbookForLegacyAdvisor,
} from "@/features/reporting/founderAlignmentWorkbook";
import {
  buildAdvisorReportHref,
  buildAdvisorSnapshotHref,
} from "@/features/reporting/advisorTeamTargets";
import {
  listRelationshipAdvisorsForUser,
  syncRelationshipAdvisorFromLegacyInvitation,
} from "@/features/reporting/relationshipAdvisorAccess";
import { getAdvisorFounderSetupAccessState } from "@/features/teams/founderSetupAdvisorAccessData";
import type { AdvisorFounderSetupAccessState } from "@/features/teams/founderSetupAdvisorAccessModel";

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
  status: "pending" | "approved" | "invited" | "linked" | "revoked";
  approved_at: string | null;
  linked_at: string | null;
  revoked_at: string | null;
};

type InvitationRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  invitee_email: string | null;
  label: string | null;
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
  relationshipId: string | null;
  teamName: string | null;
  founderAName: string;
  founderBName: string;
  founderAAvatarId: string | null;
  founderBAvatarId: string | null;
  founderAAvatarUrl: string | null;
  founderBAvatarUrl: string | null;
  teamContext: "pre_founder" | "existing_team";
  /**
   * "revoked" ist am 19.09.2026 dazugekommen.
   *
   * Vorher wurde auch ein Widerruf als "paused" gemeldet, und die Oberflaeche
   * versuchte beide am Hilfsfeld `canOpenWorkbook` zu unterscheiden. Das war
   * in BEIDEN Faellen false - also bekam jedes pausierte Team die Meldung
   * "Zugriff widerrufen" zu sehen. Ein Advisor, bei dem nur eine Zustimmung
   * fehlte, las damit, die Founder haetten ihn abgesetzt.
   */
  accessStatus: "ready" | "waiting_for_approval" | "paused" | "revoked";
  /** 0, 1 oder 2. Vorher ein deutscher Satz, aus dem die Seite die Zahl per Regex zurueckholte. */
  approvalCount: number;
  /**
   * Woran gerade gearbeitet wird - als Schluessel.
   *
   * Vorher stand hier ein deutscher Satz ("Founder-Reaktion liegt vor"), den
   * die Seite mit === verglich, um zu entscheiden, was sie anzeigt. Eine
   * Formulierungsaenderung haette die Zweige still abgeschaltet.
   */
  activityStatus: AdvisorActivityStatus;
  lastActivityAt: string | null;
  /**
   * Schluessel, kein Satz. Vorher baute die Datenschicht "Follow-up in 4
   * Wochen" und die Seite verglich genau diesen String, um daraus wieder eine
   * Uebersetzung zu machen - dasselbe Muster, das die Zugriffsmeldung falsch
   * gemacht hat.
   */
  followUp: "four_weeks" | "three_months" | "none";
  reportHref: string;
  reportReady: boolean;
  snapshotHref: string;
  sessionHref: string;
  advisorLinked: boolean;
  workbookAvailable: boolean;
  reportAvailable: boolean;
  snapshotAvailable: boolean;
  whyUnavailable: string | null;
  founderSetupAccess: AdvisorFounderSetupAccessState;
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

export type AdvisorActivityStatus =
  | "founder_reaction_ready"
  | "founder_reaction_open"
  | "workbook_in_progress"
  | "report_ready"
  | "workbook_empty";

function deriveAdvisorActivityStatus(params: {
  hasReport: boolean;
  hasWorkbook: boolean;
  hasAdvisorClosing: boolean;
  hasFounderReaction: boolean;
}): AdvisorActivityStatus {
  if (params.hasFounderReaction) return "founder_reaction_ready";
  if (params.hasAdvisorClosing) return "founder_reaction_open";
  if (params.hasWorkbook) return "workbook_in_progress";
  if (params.hasReport) return "report_ready";
  return "workbook_empty";
}

function deriveAdvisorAccessState(row: AdvisorAccessRow | RelationshipAdvisorAccessRow): Pick<
  AdvisorDashboardTeam,
  "accessStatus" | "approvalCount"
> {
  const approvalCount =
    Number(row.founder_a_approved === true) + Number(row.founder_b_approved === true);
  const isRevoked = "status" in row ? row.status === "revoked" || Boolean(row.revoked_at) : false;

  // Die Beschriftungen stehen ausschliesslich in messages/*/advisor.json. Hier
  // standen sie ein zweites Mal - auf Deutsch, mit ae/oe/ue geschrieben, und
  // von der Seite nie benutzt. Genau diese Doppelung hat den Fehler oben
  // erzeugt: Wer die Ableitung las, glaubte, diese Texte seien zu sehen.
  if (isRevoked) {
    return { accessStatus: "revoked", approvalCount };
  }

  if (row.founder_a_approved === true && row.founder_b_approved === true) {
    return { accessStatus: "ready", approvalCount };
  }

  if (row.approved_at) {
    return { accessStatus: "paused", approvalCount };
  }

  return { accessStatus: "waiting_for_approval", approvalCount };
}

function advisorFollowUp(value: unknown): AdvisorDashboardTeam["followUp"] {
  if (value === "four_weeks" || value === "three_months") return value;
  return "none";
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
  const [initialRelationshipAdvisorRows, legacyAdvisorAccessResult] = await Promise.all([
    listRelationshipAdvisorsForUser(userId, supabase),
    supabase
    .from("founder_alignment_workbook_advisors")
    .select("invitation_id, advisor_name, founder_a_approved, founder_b_approved, approved_at, claimed_at")
    .eq("advisor_user_id", userId),
  ]);

  const advisorAccessRows = legacyAdvisorAccessResult.data ?? [];
  const advisorAccessError = legacyAdvisorAccessResult.error;
  if (
    initialRelationshipAdvisorRows.length === 0 &&
    (advisorAccessError || !advisorAccessRows || advisorAccessRows.length === 0)
  ) {
    return [];
  }

  const advisorAccess = advisorAccessRows as AdvisorAccessRow[];
  const privileged = createPrivilegedClient();
  const syncedRelationshipRows = privileged
    ? (
        await Promise.all(
          advisorAccess
            .filter(
              (row) =>
                Boolean(row.claimed_at) &&
                !initialRelationshipAdvisorRows.some(
                  (relationshipRow) => relationshipRow.source_invitation_id === row.invitation_id
                )
            )
            .map(async (row) => {
              const syncResult = await syncRelationshipAdvisorFromLegacyInvitation(
                row.invitation_id,
                privileged
              );
              return syncResult.ok ? syncResult.row : null;
            })
        )
      ).filter(
        (row): row is NonNullable<(typeof initialRelationshipAdvisorRows)[number]> => Boolean(row)
      )
    : [];
  const relationshipAdvisorRows = [...initialRelationshipAdvisorRows, ...syncedRelationshipRows];

  const legacyAdvisorAccessByInvitationId = new Map(advisorAccess.map((row) => [row.invitation_id, row]));
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
  const dataClient = privileged ?? supabase;

  const founderSetupAccessByRelationshipId = new Map(
    await Promise.all(
      relationshipAdvisorRows.map(async (row) => [
        row.relationship_id,
        await getAdvisorFounderSetupAccessState(row.relationship_id, supabase),
      ] as const)
    )
  );

  const [invitationResult, workbookResult, reportRunResult] = await Promise.all([
    dataClient
      .from("invitations")
      .select("id, inviter_user_id, invitee_user_id, invitee_email, label, team_context, status, created_at")
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
      const legacyAccessRow = legacyAdvisorAccessByInvitationId.get(invitation.id) ?? null;
      const accessState = deriveAdvisorAccessState(accessRow);
      const relationshipAccessRow =
        relationshipAdvisorAccessByInvitationId.get(invitation.id) ?? null;
      const advisorLinked = Boolean(
        relationshipAccessRow?.status === "linked" || relationshipAccessRow?.linked_at
      );
      // Haengt jetzt direkt am Zugriffsstatus. Vorher stand hier
      // `accessState.canOpenWorkbook` - ein Feld, das den Zugriff nur
      // MITTELBAR ausdrueckte und mit dem entfernten Workbook verschwunden
      // ist. Gemeint war immer: die Freigabe ist vollstaendig.
      const relationshipAvailable =
        accessState.accessStatus === "ready" && Boolean(relationshipAccessRow);
      const workbookPayload = workbook
        ? projectFounderAlignmentWorkbookForLegacyAdvisor(workbook.payload)
        : null;
      const hasLegacyWorkbook = workbook
        ? hasLegacyFounderAlignmentWorkbookContent(workbook.payload)
        : false;
      const workbookAvailable = relationshipAvailable && hasLegacyWorkbook;
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
      const teamName = resolveInvitationTeamName(invitation.label, invitation.invitee_email);
      const founderAProfile = profileByUserId.get(invitation.inviter_user_id);
      const founderBProfile = invitation.invitee_user_id
        ? profileByUserId.get(invitation.invitee_user_id)
        : null;
      const hasBothBaseSubmissions = Boolean(
        latestSubmittedBaseByUserId.get(invitation.inviter_user_id) &&
          invitation.invitee_user_id &&
          latestSubmittedBaseByUserId.get(invitation.invitee_user_id)
      );
      const lastActivitySource = [hasLegacyWorkbook ? workbook?.updated_at ?? null : null, reportRun?.created_at ?? null, invitation.created_at]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;

      const reportReady =
        hasRenderableAdvisorReportPayload(reportRun?.payload) || hasBothBaseSubmissions;
      const reportAvailable = relationshipAvailable && reportReady;
      const snapshotAvailable = relationshipAvailable;
      const whyUnavailable = relationshipAvailable
        ? reportAvailable
          ? null
          : "report_not_ready"
        : relationshipAccessRow
          ? accessState.accessStatus === "waiting_for_approval"
            ? "awaiting_founder_approval"
            : accessState.accessStatus === "paused" || accessState.accessStatus === "revoked"
              ? "access_paused"
              : "team_not_ready"
          : legacyAccessRow
            ? "relationship_access_not_synced"
            : "team_not_linked";

      return {
        invitationId: invitation.id,
        relationshipId: relationshipAccessRow?.relationship_id ?? null,
        teamName,
        founderAName,
        founderBName,
        founderAAvatarId: founderAProfile?.avatarId || null,
        founderBAvatarId: founderBProfile?.avatarId || null,
        founderAAvatarUrl: founderAProfile?.avatarUrl || null,
        founderBAvatarUrl: founderBProfile?.avatarUrl || null,
        teamContext,
        ...accessState,
        activityStatus: deriveAdvisorActivityStatus({
          hasReport: reportReady,
          hasWorkbook: hasLegacyWorkbook,
          hasAdvisorClosing,
          hasFounderReaction,
        }),
        lastActivityAt: lastActivitySource,
        followUp: advisorFollowUp(workbookPayload?.advisorFollowUp),
        reportHref: buildAdvisorReportHref(invitation.id, teamContext),
        reportReady,
        snapshotHref: buildAdvisorSnapshotHref(invitation.id, teamContext),
        sessionHref: `/advisor/session?invitationId=${encodeURIComponent(invitation.id)}`,
        advisorLinked,
        workbookAvailable,
        reportAvailable,
        snapshotAvailable,
        whyUnavailable,
        founderSetupAccess:
          (relationshipAccessRow
            ? founderSetupAccessByRelationshipId.get(relationshipAccessRow.relationship_id)
            : null) ?? {
              status: "not_granted",
              consentCount: 0,
              memberCount: 0,
              confirmedItemCount: 0,
            },
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
