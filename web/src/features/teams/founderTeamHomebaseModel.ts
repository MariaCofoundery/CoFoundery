import { normalizeMatchingWorkspaceAgreementSections } from "@/features/matchingCore/matchingWorkspaceAgreementTypes";
import { sanitizeFounderAlignmentWorkbookPayload } from "@/features/reporting/founderAlignmentWorkbook";
import { buildWorkbookHref, buildWorkbookIntroHref } from "@/features/reporting/workbookNavigation";

export type FounderTeamContext = "pre_founder" | "existing_team";

export type FounderTeamMemberSummary = {
  userId: string;
  displayName: string | null;
  createdAt: string;
};

export type FounderTeamAlignmentEntry = {
  relationshipId: string;
  participantUserIds: [string, string];
  classicReport: { href: string; createdAt: string } | null;
  workbook: { href: string; updatedAt: string; exists: boolean } | null;
  matchingReport: { href: string; createdAt: string } | null;
  matchingWorkspace: { href: string; updatedAt: string } | null;
};

export type FounderTeamAgreementEntry = {
  relationshipId: string;
  participantUserIds: [string, string];
  source: "workbook" | "matching_workspace";
  href: string;
  updatedAt: string;
};

export type FounderTeamAdvisorEntry = {
  id: string;
  relationshipId: string;
  participantUserIds: [string, string];
  status: "pending" | "approved" | "invited" | "linked";
};

export type FounderTeamHomebase = {
  id: string;
  name: string | null;
  teamContext: FounderTeamContext;
  members: FounderTeamMemberSummary[];
  alignment: FounderTeamAlignmentEntry[];
  agreements: FounderTeamAgreementEntry[];
  advisors: FounderTeamAdvisorEntry[];
};

export type FounderTeamDashboardSummary = Pick<
  FounderTeamHomebase,
  "id" | "name" | "teamContext" | "members"
>;

export type FounderTeamRow = {
  id: string;
  name: string | null;
  team_context: string;
  created_at: string;
};

export type FounderTeamMemberRow = {
  team_id: string;
  user_id: string;
  created_at: string;
};

export type RelationshipRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  founder_team_id: string | null;
  created_at: string;
};

export type ClassicReportRow = {
  id: string;
  relationship_id: string;
  invitation_id: string;
  payload: unknown;
  created_at: string;
};

export type WorkbookRow = {
  invitation_id: string;
  payload: unknown;
  updated_at: string;
};

export type MatchingWorkspaceRow = {
  id: string;
  matching_session_id: string;
  relationship_id: string;
  updated_at: string;
  created_at: string;
};

export type MatchingReportRow = {
  matching_session_id: string;
  payload: unknown;
  created_at: string;
};

export type MatchingWorkspaceAgreementRow = {
  matching_workspace_id: string;
  relationship_id: string;
  sections: unknown;
  updated_at: string;
};

export type RelationshipAdvisorRow = {
  id: string;
  relationship_id: string;
  status: string;
};

export type DisplayNameRow = {
  user_id: string;
  display_name: string | null;
};

export type FounderTeamHomebaseRows = {
  team: FounderTeamRow | null;
  members: FounderTeamMemberRow[];
  relationships: RelationshipRow[];
  classicReports: ClassicReportRow[];
  workbooks: WorkbookRow[];
  matchingWorkspaces: MatchingWorkspaceRow[];
  matchingReports: MatchingReportRow[];
  matchingWorkspaceAgreements: MatchingWorkspaceAgreementRow[];
  advisors: RelationshipAdvisorRow[];
  profileNames: DisplayNameRow[];
  discoveryNames: DisplayNameRow[];
};

export function buildFounderTeamDashboardSummaries(params: {
  currentUserId: string;
  teams: FounderTeamRow[];
  members: FounderTeamMemberRow[];
  profileNames: DisplayNameRow[];
  discoveryNames: DisplayNameRow[];
}): FounderTeamDashboardSummary[] {
  const ownTeamIds = new Set(
    params.members
      .filter((member) => member.user_id === params.currentUserId)
      .map((member) => member.team_id)
  );
  const names = new Map<string, string>();
  for (const row of params.discoveryNames) {
    const name = normalizeDisplayName(row.display_name);
    if (name) names.set(row.user_id, name);
  }
  for (const row of params.profileNames) {
    const name = normalizeDisplayName(row.display_name);
    if (name) names.set(row.user_id, name);
  }

  return params.teams
    .filter((team) => ownTeamIds.has(team.id))
    .map((team) => ({
      id: team.id,
      name: normalizeDisplayName(team.name),
      teamContext: normalizeTeamContext(team.team_context),
      members: params.members
        .filter((member) => member.team_id === team.id)
        .sort((left, right) => left.created_at.localeCompare(right.created_at))
        .map((member) => ({
          userId: member.user_id,
          displayName: names.get(member.user_id) ?? null,
          createdAt: member.created_at,
        })),
    }));
}

function normalizeTeamContext(value: string): FounderTeamContext {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

function normalizeDisplayName(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function collectParticipantNamesFromPayload(payload: unknown, target: Map<string, string>) {
  const report = toRecord(toRecord(payload)?.report);
  const participantAId = report?.participantAId;
  const participantBId = report?.participantBId;
  const participantAName = normalizeDisplayName(report?.participantAName);
  const participantBName = normalizeDisplayName(report?.participantBName);

  if (typeof participantAId === "string" && participantAName) {
    target.set(participantAId, participantAName);
  }
  if (typeof participantBId === "string" && participantBName) {
    target.set(participantBId, participantBName);
  }
}

function hasWorkbookAgreement(payload: unknown) {
  const workbook = sanitizeFounderAlignmentWorkbookPayload(payload);
  return Object.values(workbook.steps).some((step) => {
    if (!step.founderAApproved || !step.founderBApproved) return false;
    return (
      step.agreement.trim().length > 0 ||
      Object.values(step.structuredOutputs ?? {}).some((outputs) =>
        Object.values(outputs ?? {}).some(
          (value) => typeof value === "string" && value.trim().length > 0
        )
      )
    );
  });
}

function hasMatchingWorkspaceAgreement(sections: unknown) {
  return Object.values(normalizeMatchingWorkspaceAgreementSections(sections)).some(
    (section) => section.agreement.trim().length > 0
  );
}

function latestBy<T>(rows: T[], timestamp: (row: T) => string) {
  return [...rows].sort((left, right) => {
    const leftTime = Date.parse(timestamp(left));
    const rightTime = Date.parse(timestamp(right));
    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
  })[0] ?? null;
}

export function buildFounderTeamHomebaseReadModel(params: {
  currentUserId: string;
  teamId: string;
  rows: FounderTeamHomebaseRows;
}): FounderTeamHomebase | null {
  const { currentUserId, teamId, rows } = params;
  if (!rows.team || rows.team.id !== teamId) return null;

  const teamMembers = rows.members
    .filter((member) => member.team_id === teamId)
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
  if (!teamMembers.some((member) => member.user_id === currentUserId)) return null;

  const memberIds = new Set(teamMembers.map((member) => member.user_id));
  const displayNames = new Map<string, string>();
  for (const report of [...rows.classicReports, ...rows.matchingReports]) {
    collectParticipantNamesFromPayload(report.payload, displayNames);
  }
  for (const row of rows.discoveryNames) {
    const name = normalizeDisplayName(row.display_name);
    if (memberIds.has(row.user_id) && name) displayNames.set(row.user_id, name);
  }
  for (const row of rows.profileNames) {
    const name = normalizeDisplayName(row.display_name);
    if (memberIds.has(row.user_id) && name) displayNames.set(row.user_id, name);
  }

  const relationships = rows.relationships.filter(
    (relationship) =>
      relationship.founder_team_id === teamId &&
      memberIds.has(relationship.user_a_id) &&
      memberIds.has(relationship.user_b_id) &&
      (relationship.user_a_id === currentUserId || relationship.user_b_id === currentUserId)
  );
  const relationshipIds = new Set(relationships.map((relationship) => relationship.id));
  const workspaceIds = new Set(
    rows.matchingWorkspaces
      .filter((workspace) => relationshipIds.has(workspace.relationship_id))
      .map((workspace) => workspace.id)
  );

  const alignment = relationships.map<FounderTeamAlignmentEntry>((relationship) => {
    const reports = rows.classicReports.filter(
      (report) => report.relationship_id === relationship.id
    );
    const classicReport = latestBy(reports, (report) => report.created_at);
    const workbook = latestBy(
      rows.workbooks.filter((row) =>
        reports.some((report) => report.invitation_id === row.invitation_id)
      ),
      (row) => row.updated_at
    );
    const workspace = latestBy(
      rows.matchingWorkspaces.filter((row) => row.relationship_id === relationship.id),
      (row) => row.updated_at
    );
    const matchingReport = workspace
      ? latestBy(
          rows.matchingReports.filter(
            (row) => row.matching_session_id === workspace.matching_session_id
          ),
          (row) => row.created_at
        )
      : null;

    return {
      relationshipId: relationship.id,
      participantUserIds: [relationship.user_a_id, relationship.user_b_id],
      classicReport: classicReport
        ? {
            href: `/report/${encodeURIComponent(classicReport.invitation_id)}`,
            createdAt: classicReport.created_at,
          }
        : null,
      workbook: classicReport
        ? {
            href: workbook
              ? buildWorkbookHref(classicReport.invitation_id, normalizeTeamContext(rows.team!.team_context))
              : buildWorkbookIntroHref(
                  classicReport.invitation_id,
                  normalizeTeamContext(rows.team!.team_context)
                ),
            updatedAt: workbook?.updated_at ?? classicReport.created_at,
            exists: Boolean(workbook),
          }
        : null,
      matchingReport: matchingReport
        ? {
            href: `/matching/${encodeURIComponent(matchingReport.matching_session_id)}/report`,
            createdAt: matchingReport.created_at,
          }
        : null,
      matchingWorkspace: workspace
        ? {
            href: `/workspaces/${encodeURIComponent(workspace.id)}`,
            updatedAt: workspace.updated_at,
          }
        : null,
    };
  });

  const agreements: FounderTeamAgreementEntry[] = [];
  for (const relationship of relationships) {
    const workbookAgreement = latestBy(
      rows.classicReports.flatMap((report) => {
        if (report.relationship_id !== relationship.id) return [];
        return rows.workbooks
          .filter(
            (workbook) =>
              workbook.invitation_id === report.invitation_id &&
              hasWorkbookAgreement(workbook.payload)
          )
          .map((workbook) => ({ report, workbook }));
      }),
      ({ workbook }) => workbook.updated_at
    );
    if (workbookAgreement) {
      agreements.push({
        relationshipId: relationship.id,
        participantUserIds: [relationship.user_a_id, relationship.user_b_id],
        source: "workbook",
        href: buildWorkbookHref(
          workbookAgreement.report.invitation_id,
          normalizeTeamContext(rows.team.team_context)
        ),
        updatedAt: workbookAgreement.workbook.updated_at,
      });
    }

    const workspaceAgreement = latestBy(
      rows.matchingWorkspaceAgreements.filter(
        (agreement) =>
          agreement.relationship_id === relationship.id &&
          workspaceIds.has(agreement.matching_workspace_id) &&
          hasMatchingWorkspaceAgreement(agreement.sections)
      ),
      (agreement) => agreement.updated_at
    );
    if (workspaceAgreement) {
      agreements.push({
        relationshipId: relationship.id,
        participantUserIds: [relationship.user_a_id, relationship.user_b_id],
        source: "matching_workspace",
        href: `/workspaces/${encodeURIComponent(workspaceAgreement.matching_workspace_id)}`,
        updatedAt: workspaceAgreement.updated_at,
      });
    }
  }

  const advisors = rows.advisors.flatMap<FounderTeamAdvisorEntry>((advisor) => {
    if (!relationshipIds.has(advisor.relationship_id) || advisor.status === "revoked") return [];
    const relationship = relationships.find((row) => row.id === advisor.relationship_id);
    if (!relationship) return [];
    const status =
      advisor.status === "linked" ||
      advisor.status === "approved" ||
      advisor.status === "invited"
        ? advisor.status
        : "pending";
    return [
      {
        id: advisor.id,
        relationshipId: relationship.id,
        participantUserIds: [relationship.user_a_id, relationship.user_b_id],
        status,
      },
    ];
  });

  return {
    id: rows.team.id,
    name: normalizeDisplayName(rows.team.name),
    teamContext: normalizeTeamContext(rows.team.team_context),
    members: teamMembers.map((member) => ({
      userId: member.user_id,
      displayName: displayNames.get(member.user_id) ?? null,
      createdAt: member.created_at,
    })),
    alignment,
    agreements: agreements.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    advisors,
  };
}
