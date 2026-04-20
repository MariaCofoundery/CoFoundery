import { compareFounders, type FounderScores } from "@/features/reporting/founderMatchingEngine";
import { buildAdvisorReportData } from "@/features/reporting/advisor-report/advisorReportBuilders";
import type { AdvisorReportData } from "@/features/reporting/advisor-report/advisorReportTypes";
import {
  ADVISOR_IMPULSE_SECTION_ORDER,
  type AdvisorImpulseSectionKey,
  type AdvisorSectionImpulse,
} from "@/features/reporting/advisorSectionImpulses";
import { getPrivilegedReportRunSnapshotForInvitation } from "@/features/reporting/actions";
import type { TeamScoringResult } from "@/features/scoring/founderScoring";
import { createClient } from "@/lib/supabase/server";
import {
  createPrivilegedAccessClient,
  hasAdvisorAccessToRelationship,
  resolveRelationshipIdForInvitation,
} from "@/features/reporting/relationshipAdvisorAccess";

type InvitationReportContextRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  invitee_email: string | null;
  team_context: string | null;
};

type ProfileNameRow = {
  user_id: string;
  display_name: string | null;
};

type AdvisorSectionImpulseRow = {
  id: string;
  relationship_id: string;
  advisor_user_id: string;
  section_key: AdvisorImpulseSectionKey;
  text: string;
  created_at: string;
  updated_at: string;
};

export type AdvisorReportPageData =
  | {
      status: "not_authenticated";
      invitationId: string;
    }
  | {
      status: "forbidden" | "not_found" | "missing_report";
      invitationId: string;
    }
  | {
      status: "ready";
      invitationId: string;
      relationshipId: string;
      teamContext: "pre_founder" | "existing_team";
      participantAName: string;
      participantBName: string;
      report: AdvisorReportData;
      impulses: Record<AdvisorImpulseSectionKey, AdvisorSectionImpulse | null>;
      workbookHref: string;
      snapshotHref: string;
    };

function emptyFounderScores(): FounderScores {
  return {
    Unternehmenslogik: null,
    Entscheidungslogik: null,
    Risikoorientierung: null,
    "Arbeitsstruktur & Zusammenarbeit": null,
    Commitment: null,
    Konfliktstil: null,
  };
}

function toFounderScores(scoring: TeamScoringResult, person: "A" | "B"): FounderScores {
  const founderScores = emptyFounderScores();

  for (const dimension of scoring.dimensions) {
    if (!(dimension.dimension in founderScores)) continue;
    founderScores[dimension.dimension as keyof FounderScores] =
      person === "A" ? dimension.scoreA : dimension.scoreB;
  }

  return founderScores;
}

function normalizeTeamContext(value: string | null | undefined): "pre_founder" | "existing_team" {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

function emptyImpulseMap() {
  return Object.fromEntries(
    ADVISOR_IMPULSE_SECTION_ORDER.map((sectionKey) => [sectionKey, null])
  ) as Record<AdvisorImpulseSectionKey, AdvisorSectionImpulse | null>;
}

export async function getAdvisorReportPageData(
  invitationId: string
): Promise<AdvisorReportPageData> {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId) {
    return { status: "not_found", invitationId: "" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "not_authenticated",
      invitationId: normalizedInvitationId,
    };
  }

  const privileged = createPrivilegedAccessClient();
  if (!privileged) {
    return { status: "not_found", invitationId: normalizedInvitationId };
  }

  const relationshipId = await resolveRelationshipIdForInvitation(normalizedInvitationId, privileged);
  if (!relationshipId) {
    return { status: "not_found", invitationId: normalizedInvitationId };
  }

  const hasAccess = await hasAdvisorAccessToRelationship(user.id, relationshipId, privileged);
  if (!hasAccess) {
    return { status: "forbidden", invitationId: normalizedInvitationId };
  }

  const [snapshot, invitationResult, impulseRowsResult] = await Promise.all([
    getPrivilegedReportRunSnapshotForInvitation(normalizedInvitationId),
    privileged
      .from("invitations")
      .select("id, inviter_user_id, invitee_user_id, invitee_email, team_context")
      .eq("id", normalizedInvitationId)
      .maybeSingle(),
    privileged
      .from("advisor_section_impulses")
      .select("id, relationship_id, advisor_user_id, section_key, text, created_at, updated_at")
      .eq("relationship_id", relationshipId)
      .eq("advisor_user_id", user.id),
  ]);

  const invitation = invitationResult.data as InvitationReportContextRow | null;
  if (!invitation) {
    return { status: "not_found", invitationId: normalizedInvitationId };
  }

  if (!snapshot?.founderScoring) {
    return { status: "missing_report", invitationId: normalizedInvitationId };
  }

  const profileIds = [invitation.inviter_user_id, invitation.invitee_user_id].filter(
    (value): value is string => Boolean(value)
  );
  const { data: profileRows } = await privileged
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", profileIds);

  const profileByUserId = new Map(
    ((profileRows ?? []) as ProfileNameRow[]).map((row) => [row.user_id, row.display_name?.trim() ?? ""])
  );

  const participantAName =
    snapshot.report?.participantAName ||
    profileByUserId.get(invitation.inviter_user_id) ||
    "Founder A";
  const participantBName =
    snapshot.report?.participantBName ||
    (invitation.invitee_user_id
      ? profileByUserId.get(invitation.invitee_user_id)
      : invitation.invitee_email?.split("@")[0]?.trim()) ||
    "Founder B";

  const compareResult = compareFounders(
    toFounderScores(snapshot.founderScoring, "A"),
    toFounderScores(snapshot.founderScoring, "B")
  );
  const report = buildAdvisorReportData(compareResult);
  const impulseMap = emptyImpulseMap();
  for (const row of (impulseRowsResult.data ?? []) as AdvisorSectionImpulseRow[]) {
    impulseMap[row.section_key] = {
      id: row.id,
      relationshipId: row.relationship_id,
      advisorUserId: row.advisor_user_id,
      sectionKey: row.section_key,
      text: row.text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  const teamContext = normalizeTeamContext(invitation.team_context);

  return {
    status: "ready",
    invitationId: normalizedInvitationId,
    relationshipId,
    teamContext,
    participantAName,
    participantBName,
    report,
    impulses: impulseMap,
    workbookHref: `/founder-alignment/workbook?invitationId=${encodeURIComponent(
      normalizedInvitationId
    )}&teamContext=${encodeURIComponent(teamContext)}`,
    snapshotHref: `/advisor/snapshot?invitationId=${encodeURIComponent(
      normalizedInvitationId
    )}&teamContext=${encodeURIComponent(teamContext)}`,
  };
}

export async function saveAdvisorSectionImpulse(params: {
  invitationId: string;
  sectionKey: AdvisorImpulseSectionKey;
  text: string;
}): Promise<
  | { ok: true }
  | { ok: false; reason: "not_authenticated" | "forbidden" | "not_found" | "save_failed" }
> {
  const normalizedInvitationId = params.invitationId.trim();
  const normalizedText = params.text.trim().slice(0, 2400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, reason: "not_authenticated" };
  }

  const privileged = createPrivilegedAccessClient();
  if (!privileged) {
    return { ok: false, reason: "save_failed" };
  }

  const relationshipId = await resolveRelationshipIdForInvitation(normalizedInvitationId, privileged);
  if (!relationshipId) {
    return { ok: false, reason: "not_found" };
  }

  const hasAccess = await hasAdvisorAccessToRelationship(user.id, relationshipId, privileged);
  if (!hasAccess) {
    return { ok: false, reason: "forbidden" };
  }

  if (!normalizedText) {
    const { error } = await privileged
      .from("advisor_section_impulses")
      .delete()
      .eq("relationship_id", relationshipId)
      .eq("advisor_user_id", user.id)
      .eq("section_key", params.sectionKey);

    return error ? { ok: false, reason: "save_failed" } : { ok: true };
  }

  const { error } = await privileged.from("advisor_section_impulses").upsert(
    {
      relationship_id: relationshipId,
      advisor_user_id: user.id,
      section_key: params.sectionKey,
      text: normalizedText,
    },
    {
      onConflict: "relationship_id,advisor_user_id,section_key",
    }
  );

  return error ? { ok: false, reason: "save_failed" } : { ok: true };
}
