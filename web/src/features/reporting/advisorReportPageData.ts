import { compareFounders, type FounderScores } from "@/features/reporting/founderMatchingEngine";
import { buildAdvisorReportData } from "@/features/reporting/advisor-report/advisorReportBuilders";
import type { AdvisorReportData } from "@/features/reporting/advisor-report/advisorReportTypes";
import {
  ADVISOR_IMPULSE_SECTION_ORDER,
  type AdvisorImpulseSectionKey,
  type AdvisorSectionImpulse,
} from "@/features/reporting/advisorSectionImpulses";
import { getPrivilegedReportRunSnapshotForInvitation } from "@/features/reporting/actions";
import { assertFounderBaseQuestionVersionContract } from "@/features/scoring/founderBaseQuestionMeta";
import {
  buildFounderCompatibilityAnswerMapV2,
  mapLegacyFounderAnswersToV2Answers,
  type FounderCompatibilityAnswerV2,
} from "@/features/scoring/founderCompatibilityAnswerRuntime";
import { scoreFounderAlignmentV2FromAnswersV2 } from "@/features/scoring/founderCompatibilityScoringV2";
import { getActiveRegistryItems } from "@/features/scoring/founderCompatibilityRegistry";
import type { TeamScoringResult } from "@/features/scoring/founderScoring";
import { createClient } from "@/lib/supabase/server";
import {
  createPrivilegedAccessClient,
  hasAdvisorAccessToRelationship,
  resolveRelationshipIdForInvitation,
  syncRelationshipAdvisorFromLegacyInvitation,
} from "@/features/reporting/relationshipAdvisorAccess";

type InvitationReportContextRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  invitee_email: string | null;
  team_context: string | null;
  status: string;
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

type AssessmentRow = {
  id: string;
  user_id: string;
  submitted_at: string | null;
  created_at: string;
};

type AssessmentAnswerRow = {
  question_id: string;
  choice_value: string;
};

type QuestionRow = {
  id: string;
};

type PrivilegedClient = NonNullable<ReturnType<typeof createPrivilegedAccessClient>>;

export type AdvisorReportDebugMeta = {
  requestedInvitationId: string;
  userId: string | null;
  relationshipId: string | null;
  accessBeforeLegacySync: boolean;
  legacySyncAttempted: boolean;
  legacySyncResult: "not_attempted" | "synced" | "sync_failed" | "legacy_not_found";
  hasAccess: boolean;
  reportRunId: string | null;
  snapshotFounderScoring: boolean;
  scoringSource: "snapshot" | "on_demand" | "missing";
  finalState:
    | "not_authenticated"
    | "forbidden"
    | "not_found"
    | "missing_report"
    | "ready";
};

export type AdvisorReportPageData =
    | {
      status: "not_authenticated";
      invitationId: string;
      debugMeta?: AdvisorReportDebugMeta;
    }
  | {
      status: "forbidden" | "not_found" | "missing_report";
      invitationId: string;
      debugMeta?: AdvisorReportDebugMeta;
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
      debugMeta?: AdvisorReportDebugMeta;
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

async function getLatestSubmittedBaseAssessment(
  privileged: PrivilegedClient,
  userId: string
): Promise<AssessmentRow | null> {
  const { data, error } = await privileged
    .from("assessments")
    .select("id, user_id, submitted_at, created_at")
    .eq("user_id", userId)
    .eq("module", "base")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as AssessmentRow;
}

async function getActiveBaseQuestionMap(
  privileged: PrivilegedClient
): Promise<Map<string, QuestionRow>> {
  const { data, error } = await privileged
    .from("questions")
    .select("id")
    .eq("category", "basis")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return new Map<string, QuestionRow>();
  }

  assertFounderBaseQuestionVersionContract(
    (data as QuestionRow[]).map((row) => row.id),
    "advisor_report_active_basis_questions"
  );

  return new Map((data as QuestionRow[]).map((row) => [row.id, row]));
}

async function getAssessmentAnswers(
  privileged: PrivilegedClient,
  assessmentId: string
): Promise<AssessmentAnswerRow[]> {
  const { data, error } = await privileged
    .from("assessment_answers")
    .select("question_id, choice_value")
    .eq("assessment_id", assessmentId);

  if (error || !data) return [];
  return data as AssessmentAnswerRow[];
}

function transformAnswers(
  rows: AssessmentAnswerRow[],
  activeBaseQuestionMap: Map<string, QuestionRow>
): FounderCompatibilityAnswerV2[] {
  const questionById = new Map(
    [...activeBaseQuestionMap.values()].map((question) => [
      question.id,
      { id: question.id, category: "basis" as const },
    ])
  );

  return mapLegacyFounderAnswersToV2Answers(rows, questionById);
}

async function resolveFounderScoringForAdvisorReport(
  invitation: InvitationReportContextRow,
  snapshotFounderScoring: TeamScoringResult | null,
  privileged: PrivilegedClient
): Promise<{
  scoring: TeamScoringResult | null;
  source: "snapshot" | "on_demand" | "missing";
}> {
  if (snapshotFounderScoring) {
    return {
      scoring: snapshotFounderScoring,
      source: "snapshot",
    };
  }

  if (invitation.status !== "accepted" || !invitation.invitee_user_id) {
    return {
      scoring: null,
      source: "missing",
    };
  }

  const [activeBaseQuestionMap, personAAssessment, personBAssessment] = await Promise.all([
    getActiveBaseQuestionMap(privileged),
    getLatestSubmittedBaseAssessment(privileged, invitation.inviter_user_id),
    getLatestSubmittedBaseAssessment(privileged, invitation.invitee_user_id),
  ]);

  if (!personAAssessment || !personBAssessment) {
    return {
      scoring: null,
      source: "missing",
    };
  }

  const [personARows, personBRows] = await Promise.all([
    getAssessmentAnswers(privileged, personAAssessment.id),
    getAssessmentAnswers(privileged, personBAssessment.id),
  ]);

  const personAAnswers = transformAnswers(personARows, activeBaseQuestionMap);
  const personBAnswers = transformAnswers(personBRows, activeBaseQuestionMap);
  const personAAnswerMap = buildFounderCompatibilityAnswerMapV2(personAAnswers);
  const personBAnswerMap = buildFounderCompatibilityAnswerMapV2(personBAnswers);
  const baseQuestionCount = getActiveRegistryItems().length;

  if (
    baseQuestionCount <= 0 ||
    Object.keys(personAAnswerMap).length < baseQuestionCount ||
    Object.keys(personBAnswerMap).length < baseQuestionCount
  ) {
    return {
      scoring: null,
      source: "missing",
    };
  }

  return {
    scoring: scoreFounderAlignmentV2FromAnswersV2({
      personA: personAAnswers,
      personB: personBAnswers,
    }),
    source: "on_demand",
  };
}

export async function getAdvisorReportPageData(
  invitationId: string
): Promise<AdvisorReportPageData> {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId) {
    return {
      status: "not_found",
      invitationId: "",
      debugMeta: {
        requestedInvitationId: "",
        userId: null,
        relationshipId: null,
        accessBeforeLegacySync: false,
        legacySyncAttempted: false,
        legacySyncResult: "not_attempted",
        hasAccess: false,
        reportRunId: null,
        snapshotFounderScoring: false,
        scoringSource: "missing",
        finalState: "not_found",
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "not_authenticated",
      invitationId: normalizedInvitationId,
      debugMeta: {
        requestedInvitationId: normalizedInvitationId,
        userId: null,
        relationshipId: null,
        accessBeforeLegacySync: false,
        legacySyncAttempted: false,
        legacySyncResult: "not_attempted",
        hasAccess: false,
        reportRunId: null,
        snapshotFounderScoring: false,
        scoringSource: "missing",
        finalState: "not_authenticated",
      },
    };
  }

  const privileged = createPrivilegedAccessClient();
  if (!privileged) {
    return {
      status: "not_found",
      invitationId: normalizedInvitationId,
      debugMeta: {
        requestedInvitationId: normalizedInvitationId,
        userId: user.id,
        relationshipId: null,
        accessBeforeLegacySync: false,
        legacySyncAttempted: false,
        legacySyncResult: "not_attempted",
        hasAccess: false,
        reportRunId: null,
        snapshotFounderScoring: false,
        scoringSource: "missing",
        finalState: "not_found",
      },
    };
  }

  const relationshipId = await resolveRelationshipIdForInvitation(normalizedInvitationId, privileged);
  if (!relationshipId) {
    return {
      status: "not_found",
      invitationId: normalizedInvitationId,
      debugMeta: {
        requestedInvitationId: normalizedInvitationId,
        userId: user.id,
        relationshipId: null,
        accessBeforeLegacySync: false,
        legacySyncAttempted: false,
        legacySyncResult: "not_attempted",
        hasAccess: false,
        reportRunId: null,
        snapshotFounderScoring: false,
        scoringSource: "missing",
        finalState: "not_found",
      },
    };
  }

  const accessBeforeLegacySync = await hasAdvisorAccessToRelationship(user.id, relationshipId, privileged);
  let hasAccess = accessBeforeLegacySync;
  let legacySyncAttempted = false;
  let legacySyncResult: AdvisorReportDebugMeta["legacySyncResult"] = "not_attempted";

  if (!hasAccess) {
    legacySyncAttempted = true;
    const syncResult = await syncRelationshipAdvisorFromLegacyInvitation(
      normalizedInvitationId,
      privileged
    );
    if (syncResult.ok) {
      legacySyncResult = syncResult.row ? "synced" : "legacy_not_found";
      hasAccess = await hasAdvisorAccessToRelationship(user.id, relationshipId, privileged);
    } else {
      legacySyncResult =
        syncResult.reason === "legacy_not_found" ? "legacy_not_found" : "sync_failed";
    }
  }

  if (!hasAccess) {
    console.info("[advisor-report-debug] access_denied", {
      invitationId: normalizedInvitationId,
      userId: user.id,
      relationshipId,
      accessBeforeLegacySync,
      legacySyncAttempted,
      legacySyncResult,
    });
    return {
      status: "forbidden",
      invitationId: normalizedInvitationId,
      debugMeta: {
        requestedInvitationId: normalizedInvitationId,
        userId: user.id,
        relationshipId,
        accessBeforeLegacySync,
        legacySyncAttempted,
        legacySyncResult,
        hasAccess: false,
        reportRunId: null,
        snapshotFounderScoring: false,
        scoringSource: "missing",
        finalState: "forbidden",
      },
    };
  }

  const [snapshot, invitationResult, impulseRowsResult] = await Promise.all([
    getPrivilegedReportRunSnapshotForInvitation(normalizedInvitationId),
    privileged
      .from("invitations")
      .select("id, inviter_user_id, invitee_user_id, invitee_email, team_context, status")
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
    return {
      status: "not_found",
      invitationId: normalizedInvitationId,
      debugMeta: {
        requestedInvitationId: normalizedInvitationId,
        userId: user.id,
        relationshipId,
        accessBeforeLegacySync,
        legacySyncAttempted,
        legacySyncResult,
        hasAccess: true,
        reportRunId: snapshot?.id ?? null,
        snapshotFounderScoring: Boolean(snapshot?.founderScoring),
        scoringSource: "missing",
        finalState: "not_found",
      },
    };
  }

  const founderScoringResolution = await resolveFounderScoringForAdvisorReport(
    invitation,
    snapshot?.founderScoring ?? null,
    privileged
  );
  const founderScoring = founderScoringResolution.scoring;

  console.info("[advisor-report-debug] loader", {
    invitationId: normalizedInvitationId,
    userId: user.id,
    relationshipId,
    accessBeforeLegacySync,
    legacySyncAttempted,
    legacySyncResult,
    hasAccess,
    reportRunId: snapshot?.id ?? null,
    snapshotFounderScoring: Boolean(snapshot?.founderScoring),
    scoringSource: founderScoringResolution.source,
  });

  if (!founderScoring) {
    return {
      status: "missing_report",
      invitationId: normalizedInvitationId,
      debugMeta: {
        requestedInvitationId: normalizedInvitationId,
        userId: user.id,
        relationshipId,
        accessBeforeLegacySync,
        legacySyncAttempted,
        legacySyncResult,
        hasAccess: true,
        reportRunId: snapshot?.id ?? null,
        snapshotFounderScoring: Boolean(snapshot?.founderScoring),
        scoringSource: founderScoringResolution.source,
        finalState: "missing_report",
      },
    };
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
    snapshot?.report?.participantAName ||
    profileByUserId.get(invitation.inviter_user_id) ||
    "Founder A";
  const participantBName =
    snapshot?.report?.participantBName ||
    (invitation.invitee_user_id
      ? profileByUserId.get(invitation.invitee_user_id)
      : invitation.invitee_email?.split("@")[0]?.trim()) ||
    "Founder B";

  const compareResult = compareFounders(
    toFounderScores(founderScoring, "A"),
    toFounderScores(founderScoring, "B")
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
    debugMeta: {
      requestedInvitationId: normalizedInvitationId,
      userId: user.id,
      relationshipId,
      accessBeforeLegacySync,
      legacySyncAttempted,
      legacySyncResult,
      hasAccess: true,
      reportRunId: snapshot?.id ?? null,
      snapshotFounderScoring: Boolean(snapshot?.founderScoring),
      scoringSource: founderScoringResolution.source,
      finalState: "ready",
    },
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
