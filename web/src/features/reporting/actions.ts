"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  REPORT_DIMENSIONS,
  type DimensionDebugEntry,
  type KeyInsight,
  type ParticipantDebugReport,
  type PersonBStatus,
  type RadarSeries,
  type ReportDimension,
  type CompareReportJson,
  type SessionAlignmentReport,
} from "@/features/reporting/types";
import {
  ACTIONABLE_PLAYBOOK,
  DIMENSION_INTERPRETATIONS,
  DIMENSION_INSIGHTS,
  REPORT_CONTENT,
  VALUES_PLAYBOOK,
} from "@/features/reporting/constants";
import {
  buildProfileResultFromSession,
  generateCompareReport,
} from "@/features/reporting/generateCompareReport";
import {
  buildResponseCountByParticipant,
  selectParticipantA,
  selectParticipantB,
} from "@/features/participants/selection";

type ParticipantRow = {
  id: string;
  role: "A" | "B" | "partner";
  user_id: string | null;
  invited_email: string | null;
  display_name: string | null;
  created_at: string | null;
  completed_at: string | null;
  requested_scope?: string | null;
  invite_consent_at?: string | null;
  invite_consent_by_user_id?: string | null;
};

type ResponseRow = {
  participant_id: string;
  question_id: string;
  choice_value: string;
};

type QuestionMeta = {
  dimension: ReportDimension;
  max: number;
};

type BasisProgress = {
  total: number;
  answeredA: number;
  answeredB: number;
  completeA: boolean;
  completeB: boolean;
};

type AggregationResult = {
  averages: Map<string, Map<ReportDimension, number>>;
  debugByParticipant: Map<string, Map<ReportDimension, DimensionDebugEntry>>;
};

type ReportModuleKey = "base" | "values" | "stress" | "roles" | "decision_architecture";

type ReportRunInputRefs = {
  source: "session";
  sessionId: string;
  participantAId: string | null;
  participantBId: string | null;
  participantACompletedAt: string | null;
  participantBCompletedAt: string | null;
  requestedScope: SessionAlignmentReport["requestedScope"];
  valuesModuleStatus: SessionAlignmentReport["valuesModuleStatus"];
};

type PersistedComparePayload = {
  schemaVersion: 1;
  generatedAt: string;
  inputRefs: ReportRunInputRefs;
  sessionReport: SessionAlignmentReport;
  compareJson: CompareReportJson;
};

export type ReportRunSnapshot = {
  runId: string;
  version: number;
  relationshipId: string;
  sourceSessionId: string | null;
  createdAt: string;
  modules: ReportModuleKey[];
  inputRefs: ReportRunInputRefs;
  report: SessionAlignmentReport;
  compareJson: CompareReportJson;
};

const REPORT_RUN_SCHEMA_VERSION = 1 as const;

export async function getSessionAlignmentReport(sessionId: string): Promise<SessionAlignmentReport | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) {
    return null;
  }

  const { data: membership } = await supabase
    .from("participants")
    .select("id")
    .eq("session_id", normalizedSessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return null;
  }

  const [{ data: sessionRow }, { data: participantsRaw }, { data: responsesRaw }, { data: questionsRaw }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, created_at")
      .eq("id", normalizedSessionId)
      .maybeSingle(),
    supabase
      .from("participants")
      .select("*")
      .eq("session_id", normalizedSessionId),
    supabase
      .from("responses")
      .select("participant_id, question_id, choice_value")
      .eq("session_id", normalizedSessionId),
    supabase.from("questions").select("id, dimension, sort_order, category, choices(id)"),
  ]);

  if (!sessionRow) {
    return null;
  }

  const participants = (participantsRaw ?? []) as ParticipantRow[];
  const responses = (responsesRaw ?? []) as ResponseRow[];
  const questionMeta = buildQuestionMeta(questionsRaw ?? []);

  const responseCountByParticipant = buildResponseCountByParticipant(responses);
  const participantASelection = selectParticipantA(participants, { responseCountByParticipant });
  const participantA = participantASelection
    ? participants.find((row) => row.id === participantASelection.id)
    : undefined;
  const participantBSelection = selectParticipantB(participants, {
    primary: participantASelection,
    responseCountByParticipant,
  });
  const participantB = participantBSelection
    ? participants.find((row) => row.id === participantBSelection.id)
    : undefined;
  const basisProgress = deriveBasisProgress(
    responses,
    questionsRaw ?? [],
    participantA?.id ?? null,
    participantB?.id ?? null
  );
  const participantAName = deriveFirstName(participantA, "Teilnehmer");
  const participantBName = participantB ? deriveFirstName(participantB, "Teilnehmer B") : null;
  const requestedScope =
    participantB?.requested_scope === "basis_plus_values" ? "basis_plus_values" : "basis";
  const inviteConsentCaptured = Boolean(participantB?.invite_consent_at || participantB?.invite_consent_by_user_id);

  const personACompleted = Boolean(participantA?.completed_at) || basisProgress.completeA;
  const personBCompleted = Boolean(participantB?.completed_at) || basisProgress.completeB;
  const inferredMatchReady = personACompleted && personBCompleted;
  const personBStatus = inferredMatchReady
    ? "match_ready"
    : derivePersonBStatus(participantA, participantB);

  const aggregation = aggregateScores(responses, questionMeta);
  const scoresA = fillSeries(aggregation.averages.get(participantA?.id ?? "") ?? new Map());
  const scoresB = fillSeries(aggregation.averages.get(participantB?.id ?? "") ?? new Map());
  const hasPersonBData = REPORT_DIMENSIONS.some((dimension) => scoresB[dimension] != null);
  const comparisonEnabled = personBStatus === "match_ready" || hasPersonBData;

  const keyInsights = buildKeyInsights(scoresA, scoresB, comparisonEnabled);
  const { commonTendencies, frictionPoints } = buildMatchNarratives(
    scoresA,
    scoresB,
    participantAName,
    participantBName ?? "Teilnehmer B",
    comparisonEnabled
  );
  const conversationGuideQuestions = buildConversationGuide(scoresA, scoresB, comparisonEnabled);
  const debugA = buildParticipantDebug(
    participantAName,
    aggregation.debugByParticipant.get(participantA?.id ?? "") ?? new Map()
  );
  const debugB = participantB
    ? buildParticipantDebug(
        participantBName ?? "Teilnehmer B",
        aggregation.debugByParticipant.get(participantB.id) ?? new Map()
      )
    : null;
  const {
    valuesModulePreview,
    valuesModuleStatus,
    valuesAnsweredA,
    valuesAnsweredB,
    valuesTotal,
    valuesAlignmentPercent,
    valuesIdentityCategoryA,
    valuesIdentityCategoryB,
  } = await deriveValuesModuleSummary(
    normalizedSessionId,
    participantA?.id ?? null,
    participantB?.id ?? null,
    participantAName,
    participantBName ?? "Teilnehmer B",
    comparisonEnabled,
    supabase
  );

  return {
    sessionId: normalizedSessionId,
    createdAt: sessionRow.created_at,
    personBInvitedAt: participantB?.created_at ?? null,
    personACompletedAt: participantA?.completed_at ?? null,
    personBCompletedAt: participantB?.completed_at ?? null,
    participantAId: participantA?.id ?? null,
    participantBId: participantB?.id ?? null,
    participantAName,
    participantBName,
    personBStatus,
    personACompleted,
    personBCompleted,
    comparisonEnabled,
    scoresA,
    scoresB,
    keyInsights,
    commonTendencies,
    frictionPoints,
    conversationGuideQuestions,
    valuesModulePreview,
    valuesModuleStatus,
    valuesAnsweredA,
    valuesAnsweredB,
    valuesTotal,
    basisAnsweredA: basisProgress.answeredA,
    basisAnsweredB: basisProgress.answeredB,
    basisTotal: basisProgress.total,
    valuesAlignmentPercent,
    valuesIdentityCategoryA,
    valuesIdentityCategoryB,
    requestedScope,
    inviteConsentCaptured,
    debugA,
    debugB,
  };
}

function deriveBasisProgress(
  responses: ResponseRow[],
  questionsRaw: {
    id: string;
    category?: string | null;
  }[],
  participantAId: string | null,
  participantBId: string | null
): BasisProgress {
  const basisQuestionIds = new Set<string>();
  for (const question of questionsRaw) {
    const category = (question.category ?? "basis").trim().toLowerCase();
    if (category === "basis") {
      basisQuestionIds.add(question.id);
    }
  }

  const answeredByA = new Set<string>();
  const answeredByB = new Set<string>();

  for (const row of responses) {
    if (!basisQuestionIds.has(row.question_id)) continue;
    if (participantAId && row.participant_id === participantAId) {
      answeredByA.add(row.question_id);
    }
    if (participantBId && row.participant_id === participantBId) {
      answeredByB.add(row.question_id);
    }
  }

  const total = basisQuestionIds.size;
  const answeredA = answeredByA.size;
  const answeredB = answeredByB.size;

  return {
    total,
    answeredA,
    answeredB,
    completeA: total > 0 && answeredA >= total,
    completeB: total > 0 && answeredB >= total,
  };
}

export async function getExecutiveSummaryTextByAlignment(
  scoresA: RadarSeries,
  scoresB: RadarSeries
) {
  const deltas = REPORT_DIMENSIONS.map((dimension) => {
    const a = scoresA[dimension];
    const b = scoresB[dimension];
    if (a == null || b == null) return null;
    return Math.abs(a - b);
  }).filter((value): value is number => value != null);

  if (deltas.length === 0) {
    return REPORT_CONTENT.executive_summary.low_alignment;
  }

  const averageDelta = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
  return averageDelta < 1.0
    ? REPORT_CONTENT.executive_summary.high_alignment
    : REPORT_CONTENT.executive_summary.low_alignment;
}

export async function generateCompareReportForSession(sessionId: string): Promise<CompareReportJson | null> {
  const snapshot = await getReportRunSnapshotForSession(sessionId);
  return snapshot?.compareJson ?? null;
}

export async function getReportRunSnapshotForSession(sessionId: string): Promise<ReportRunSnapshot | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) {
    return null;
  }

  const isMember = await hasSessionMembership(supabase, normalizedSessionId, user.id);
  if (!isMember) {
    return null;
  }

  return getLatestReportRunSnapshotForSessionWithClient(supabase, normalizedSessionId);
}

export async function createReportRunOnCompletion(sessionId: string): Promise<ReportRunSnapshot | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) {
    return null;
  }

  const isMember = await hasSessionMembership(supabase, normalizedSessionId, user.id);
  if (!isMember) {
    return null;
  }

  const existing = await getLatestReportRunSnapshotForSessionWithClient(supabase, normalizedSessionId);
  if (existing) {
    return existing;
  }

  return createReportRunForSessionWithClient(supabase, normalizedSessionId, user.id);
}

async function createReportRunForSessionWithClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  normalizedSessionId: string,
  currentUserId: string
): Promise<ReportRunSnapshot | null> {
  const report = await getSessionAlignmentReport(normalizedSessionId);
  if (!report) {
    return null;
  }

  const modules = await resolveRequiredModulesForSession(supabase, normalizedSessionId, report.requestedScope);
  if (!isReadyForReportRun(report, modules)) {
    return null;
  }

  const profileA = buildProfileResultFromSession(report, "A");
  const profileB = buildProfileResultFromSession(report, "B");
  const compareJson = generateCompareReport(profileA, profileB);
  const inputRefs = buildReportInputRefs(normalizedSessionId, report);

  const relationshipId = await resolveRelationshipIdForSession(
    supabase,
    normalizedSessionId,
    report.participantAId,
    report.participantBId
  );
  if (!relationshipId) {
    return null;
  }

  const { data: latestVersionRow } = await supabase
    .from("report_runs")
    .select("version")
    .eq("relationship_id", relationshipId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = ((latestVersionRow as { version?: number } | null)?.version ?? 0) + 1;
  const now = new Date().toISOString();
  const payload: PersistedComparePayload = {
    schemaVersion: REPORT_RUN_SCHEMA_VERSION,
    generatedAt: now,
    inputRefs,
    sessionReport: report,
    compareJson,
  };

  const { data: insertedRow, error: insertError } = await supabase
    .from("report_runs")
    .insert({
      relationship_id: relationshipId,
      created_by_user_id: currentUserId,
      status: "completed",
      version: nextVersion,
      source_session_id: normalizedSessionId,
      input_refs: inputRefs,
      payload,
      created_at: now,
      updated_at: now,
    })
    .select("id, relationship_id, version, source_session_id, input_refs, payload, created_at")
    .single();

  if (insertError) {
    const existing = await getLatestReportRunSnapshotForSessionWithClient(supabase, normalizedSessionId);
    if (existing) {
      return existing;
    }
    console.error("Report run insert failed:", insertError.message);
    return null;
  }

  if (modules.length > 0) {
    const { error: moduleError } = await supabase.from("report_run_modules").insert(
      modules.map((moduleKey) => ({
        report_run_id: insertedRow.id,
        module_key: moduleKey,
      }))
    );
    if (moduleError) {
      console.error("Report run modules insert failed:", moduleError.message);
    }
  }

  return mapReportRunRowToSnapshot({
    ...insertedRow,
    report_run_modules: modules.map((moduleKey) => ({ module_key: moduleKey })),
  });
}

async function getLatestReportRunSnapshotForSessionWithClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  normalizedSessionId: string
): Promise<ReportRunSnapshot | null> {
  const { data: runRow, error } = await supabase
    .from("report_runs")
    .select(
      "id, relationship_id, version, source_session_id, input_refs, payload, created_at, report_run_modules(module_key)"
    )
    .eq("source_session_id", normalizedSessionId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return mapReportRunRowToSnapshot(runRow);
}

function mapReportRunRowToSnapshot(row: {
  id: string;
  relationship_id: string;
  version: number;
  source_session_id: string | null;
  input_refs: unknown;
  payload: unknown;
  created_at: string;
  report_run_modules?: Array<{ module_key: string }> | null;
} | null): ReportRunSnapshot | null {
  if (!row) {
    return null;
  }

  const payload = parsePersistedComparePayload(row.payload);
  if (!payload) {
    return null;
  }

  const modules = (row.report_run_modules ?? [])
    .map((item) => item.module_key)
    .filter(isReportModuleKey);

  return {
    runId: row.id,
    version: row.version,
    relationshipId: row.relationship_id,
    sourceSessionId: row.source_session_id,
    createdAt: row.created_at,
    modules,
    inputRefs: parseReportRunInputRefs(row.input_refs) ?? payload.inputRefs,
    report: payload.sessionReport,
    compareJson: payload.compareJson,
  };
}

function parsePersistedComparePayload(raw: unknown): PersistedComparePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const payload = raw as Partial<PersistedComparePayload>;
  if (payload.schemaVersion !== REPORT_RUN_SCHEMA_VERSION) return null;
  if (!payload.sessionReport || !payload.compareJson || !payload.inputRefs) return null;
  return payload as PersistedComparePayload;
}

function parseReportRunInputRefs(raw: unknown): ReportRunInputRefs | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Partial<ReportRunInputRefs>;
  if (input.source !== "session") return null;
  if (typeof input.sessionId !== "string") return null;
  return input as ReportRunInputRefs;
}

function deriveReportModules(requestedScope: SessionAlignmentReport["requestedScope"]): ReportModuleKey[] {
  return requestedScope === "basis_plus_values" ? ["base", "values"] : ["base"];
}

function buildReportInputRefs(sessionId: string, report: SessionAlignmentReport): ReportRunInputRefs {
  return {
    source: "session",
    sessionId,
    participantAId: report.participantAId,
    participantBId: report.participantBId,
    participantACompletedAt: report.personACompletedAt,
    participantBCompletedAt: report.personBCompletedAt,
    requestedScope: report.requestedScope,
    valuesModuleStatus: report.valuesModuleStatus,
  };
}

function isReportModuleKey(value: string): value is ReportModuleKey {
  return (
    value === "base" ||
    value === "values" ||
    value === "stress" ||
    value === "roles" ||
    value === "decision_architecture"
  );
}

async function resolveRelationshipIdForSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  normalizedSessionId: string,
  participantAId: string | null,
  participantBId: string | null
) {
  const { data: invitationRow } = await supabase
    .from("invitations")
    .select("relationship_id")
    .eq("session_id", normalizedSessionId)
    .eq("status", "accepted")
    .not("relationship_id", "is", null)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const existingRelationshipId = (invitationRow as { relationship_id?: string | null } | null)?.relationship_id;
  if (existingRelationshipId) {
    return existingRelationshipId;
  }

  if (!participantAId || !participantBId) {
    return null;
  }

  const { data: pairRows } = await supabase
    .from("participants")
    .select("id, user_id")
    .in("id", [participantAId, participantBId]);

  const userByParticipantId = new Map<string, string>();
  for (const row of (pairRows ?? []) as Array<{ id: string; user_id: string | null }>) {
    if (row.user_id) {
      userByParticipantId.set(row.id, row.user_id);
    }
  }

  const userAId = userByParticipantId.get(participantAId);
  const userBId = userByParticipantId.get(participantBId);
  if (!userAId || !userBId) {
    return null;
  }

  const { data: ensuredRelationshipId, error } = await supabase.rpc("ensure_relationship_for_users", {
    p_user_a_id: userAId,
    p_user_b_id: userBId,
    p_source_session_id: normalizedSessionId,
  });

  if (error) {
    console.error("ensure_relationship_for_users failed:", error.message);
    return null;
  }

  if (typeof ensuredRelationshipId === "string") {
    return ensuredRelationshipId;
  }
  if (Array.isArray(ensuredRelationshipId) && typeof ensuredRelationshipId[0] === "string") {
    return ensuredRelationshipId[0];
  }
  return null;
}

function isReadyForReportRun(report: SessionAlignmentReport, requiredModules: ReportModuleKey[]) {
  if (!report.participantAId || !report.participantBId) {
    return false;
  }
  if (!report.personACompleted || !report.personBCompleted) {
    return false;
  }

  const hasCompleteBase =
    report.basisTotal > 0 &&
    report.basisAnsweredA >= report.basisTotal &&
    report.basisAnsweredB >= report.basisTotal;
  if (!hasCompleteBase) {
    return false;
  }

  if (requiredModules.includes("values")) {
    const hasCompleteValues =
      report.valuesTotal > 0 &&
      report.valuesAnsweredA >= report.valuesTotal &&
      report.valuesAnsweredB >= report.valuesTotal;
    if (!hasCompleteValues) {
      return false;
    }
  }

  if (
    requiredModules.includes("stress") ||
    requiredModules.includes("roles") ||
    requiredModules.includes("decision_architecture")
  ) {
    return false;
  }

  return true;
}

async function resolveRequiredModulesForSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  requestedScopeFallback: SessionAlignmentReport["requestedScope"]
) {
  const { data: invitation } = await supabase
    .from("invitations")
    .select("id, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const invitationId = (invitation as { id?: string } | null)?.id;
  if (invitationId) {
    const { data: moduleRows } = await supabase
      .from("invitation_modules")
      .select("module_key")
      .eq("invitation_id", invitationId);
    const invitationModules = (moduleRows ?? [])
      .map((row) => String((row as { module_key?: string }).module_key ?? ""))
      .filter(isReportModuleKey);

    if (invitationModules.length > 0) {
      return invitationModules.includes("base")
        ? invitationModules
        : (["base", ...invitationModules] as ReportModuleKey[]);
    }
  }

  return deriveReportModules(requestedScopeFallback);
}

async function hasSessionMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  userId: string
) {
  const { data: membership } = await supabase
    .from("participants")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(membership);
}

function derivePersonBStatus(
  participantA: ParticipantRow | undefined,
  participantB: ParticipantRow | undefined
): PersonBStatus {
  if (!participantB || (!participantB.user_id && !participantB.invited_email)) {
    return "invitation_open";
  }
  if (participantA?.completed_at && participantB.completed_at) {
    return "match_ready";
  }
  if (participantB.user_id || participantB.completed_at) {
    return "in_progress";
  }
  return "invitation_open";
}

function aggregateScores(
  responses: ResponseRow[],
  questionMeta: Map<string, QuestionMeta>
): AggregationResult {
  const sums = new Map<string, Map<ReportDimension, { sum: number; count: number }>>();
  const rawSums = new Map<string, Map<ReportDimension, { sum: number; count: number }>>();
  const questionsByParticipant = new Map<string, Map<ReportDimension, DimensionDebugEntry["questions"]>>();

  for (const row of responses) {
    const participantId = row.participant_id;
    const actualValue = Number(row.choice_value);
    if (!Number.isFinite(actualValue) || actualValue < 1) {
      continue;
    }

    const meta = questionMeta.get(row.question_id);
    if (!meta) {
      continue;
    }
    const dimension = meta.dimension;
    const max = Math.max(2, meta.max);
    const boundedValue = Math.max(1, Math.min(max, actualValue));
    const normalizedValue = normalizeToSixPointScale(boundedValue, max);

    const participantMap = sums.get(participantId) ?? new Map<ReportDimension, { sum: number; count: number }>();
    const current = participantMap.get(dimension) ?? { sum: 0, count: 0 };
    current.sum += normalizedValue;
    current.count += 1;
    participantMap.set(dimension, current);
    sums.set(participantId, participantMap);

    const rawParticipantMap =
      rawSums.get(participantId) ?? new Map<ReportDimension, { sum: number; count: number }>();
    const rawCurrent = rawParticipantMap.get(dimension) ?? { sum: 0, count: 0 };
    rawCurrent.sum += boundedValue;
    rawCurrent.count += 1;
    rawParticipantMap.set(dimension, rawCurrent);
    rawSums.set(participantId, rawParticipantMap);

    const participantQuestions =
      questionsByParticipant.get(participantId) ?? new Map<ReportDimension, DimensionDebugEntry["questions"]>();
    const questionList = participantQuestions.get(dimension) ?? [];
    questionList.push({
      questionId: row.question_id,
      value: boundedValue,
      max,
      normalized: Number(normalizedValue.toFixed(2)),
    });
    participantQuestions.set(dimension, questionList);
    questionsByParticipant.set(participantId, participantQuestions);
  }

  const averages = new Map<string, Map<ReportDimension, number>>();
  const debugByParticipant = new Map<string, Map<ReportDimension, DimensionDebugEntry>>();
  for (const [participantId, dimensions] of sums) {
    const avgMap = new Map<ReportDimension, number>();
    for (const [dimension, value] of dimensions) {
      avgMap.set(dimension, Number((value.sum / value.count).toFixed(2)));
    }
    averages.set(participantId, avgMap);

    const debugMap = new Map<ReportDimension, DimensionDebugEntry>();
    for (const dimension of REPORT_DIMENSIONS) {
      const normalizedScore = avgMap.get(dimension) ?? null;
      const raw = rawSums.get(participantId)?.get(dimension);
      const rawScore = raw && raw.count > 0 ? Number((raw.sum / raw.count).toFixed(2)) : null;
      const category = normalizedScore == null ? null : profileTitle(dimension, normalizedScore);
      const questions = (
        questionsByParticipant.get(participantId)?.get(dimension) ?? []
      ).sort((a, b) => a.questionId.localeCompare(b.questionId, "de"));
      debugMap.set(dimension, {
        dimension,
        rawScore,
        normalizedScore,
        category,
        questions,
      });
    }
    debugByParticipant.set(participantId, debugMap);
  }
  return { averages, debugByParticipant };
}

function buildQuestionMeta(
  questionsRaw: {
    id: string;
    dimension: string;
    sort_order?: number | null;
    category?: string | null;
    choices?: { id: string }[] | null;
  }[]
) {
  const map = new Map<string, QuestionMeta>();
  for (const row of questionsRaw) {
    const dimension =
      normalizeDimension(row.dimension ?? "") ??
      dimensionFromSortOrder(row.sort_order ?? null, row.category ?? null);
    if (!dimension) continue;
    const choices = Array.isArray(row.choices) ? row.choices : [];
    const max = choices.length > 0 ? choices.length : 6;
    map.set(row.id, { dimension, max });
  }
  return map;
}

function dimensionFromSortOrder(
  sortOrder: number | null,
  category: string | null
): ReportDimension | null {
  const normalizedCategory = (category ?? "basis").trim().toLowerCase();
  if (normalizedCategory !== "basis") return null;
  if (!Number.isFinite(sortOrder ?? NaN)) return null;
  const order = Number(sortOrder);
  if (order >= 1 && order <= 6) return "Vision";
  if (order >= 7 && order <= 12) return "Entscheidung";
  if (order >= 13 && order <= 18) return "Risiko";
  if (order >= 19 && order <= 24) return "Autonomie";
  if (order >= 25 && order <= 30) return "Verbindlichkeit";
  if (order >= 31 && order <= 36) return "Konflikt";
  return null;
}

function normalizeToSixPointScale(value: number, max: number) {
  if (max <= 1) return 3.5;
  const ratio = (value - 1) / (max - 1);
  return 1 + ratio * 5;
}

function fillSeries(values: Map<ReportDimension, number>): RadarSeries {
  return REPORT_DIMENSIONS.reduce((acc, dimension) => {
    acc[dimension] = values.get(dimension) ?? null;
    return acc;
  }, {} as RadarSeries);
}

function normalizeDimension(raw: string): ReportDimension | null {
  const value = raw.toLowerCase().trim();
  if (value.includes("vision")) return "Vision";
  if (value.includes("entscheid")) return "Entscheidung";
  if (value.includes("risiko")) return "Risiko";
  if (value.includes("autonomie")) return "Autonomie";
  if (value.includes("naehe") || value.includes("nähe") || value.includes("nahe")) return "Autonomie";
  if (value.includes("verbind")) return "Verbindlichkeit";
  if (value.includes("konflikt")) return "Konflikt";
  return null;
}

function buildKeyInsights(
  scoresA: RadarSeries,
  scoresB: RadarSeries,
  includeMatchInsights: boolean
): KeyInsight[] {
  const candidates: (KeyInsight & { score: number })[] = [];

  for (const dimension of REPORT_DIMENSIONS) {
    const base = scoresA[dimension];
    if (base == null) {
      continue;
    }
    const key = dimensionKey(dimension);
    const template = DIMENSION_INSIGHTS[key];
    const deviation = Math.abs(base - 3.5);
    const partnerScore = scoresB[dimension];
    const delta =
      includeMatchInsights && partnerScore != null ? Number(Math.abs(base - partnerScore).toFixed(2)) : 0;
    const rankingScore = includeMatchInsights ? delta : deviation;

    if (base <= 2.5) {
      const profile = template.low.title;
      const pack = actionablePack(dimension, "low");
      candidates.push({
        dimension,
        title: `${dimensionLabel(dimension)} - ${profile}`,
        priority: 0,
        score: rankingScore,
        text: formatActionableInsight(profile, pack.superpower, pack.warning),
      });
      continue;
    }

    if (base >= 4.5) {
      const profile = template.high.title;
      const pack = actionablePack(dimension, "high");
      candidates.push({
        dimension,
        title: `${dimensionLabel(dimension)} - ${profile}`,
        priority: 0,
        score: rankingScore,
        text: formatActionableInsight(profile, pack.superpower, pack.warning),
      });
      continue;
    }

    const profile = profileTitle(dimension, base);
    const pack = actionablePack(dimension, "mid");
    candidates.push({
      dimension,
      title: `${dimensionLabel(dimension)} - ${profile}`,
      priority: 1,
      score: rankingScore,
      text: formatActionableInsight(profile, pack.superpower, pack.warning),
    });
  }

  return candidates
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.priority - b.priority;
    })
    .slice(0, 3)
    .map(({ dimension, title, text, priority }) => ({ dimension, title, text, priority }));
}

function formatActionableInsight(profile: string, superpower: string, warning: string) {
  return `Deine Superpower ist ${superpower} Risikohinweis: ${warning}`;
}

function deriveFirstName(participant: ParticipantRow | undefined, fallback: string) {
  if (!participant) {
    return fallback;
  }
  const fromDisplayName = normalizeName(participant.display_name);
  if (fromDisplayName) {
    return fromDisplayName.split(/\s+/)[0] ?? fallback;
  }
  const fromInvite = participant.invited_email?.split("@")[0]?.trim();
  if (fromInvite) {
    return capitalize(fromInvite);
  }
  return fallback;
}

function actionablePack(dimension: ReportDimension, band: "low" | "mid" | "high") {
  return ACTIONABLE_PLAYBOOK[dimension][band];
}

function profileTitle(dimension: ReportDimension, score: number) {
  const pack = DIMENSION_INTERPRETATIONS[dimension];
  if (score <= 2.5) return pack.low.title;
  if (score >= 4.5) return pack.high.title;
  return pack.mid.title;
}

function buildParticipantDebug(
  participantName: string,
  dimensionMap: Map<ReportDimension, DimensionDebugEntry>
): ParticipantDebugReport {
  return {
    participantName,
    dimensions: REPORT_DIMENSIONS.map(
      (dimension) =>
        dimensionMap.get(dimension) ?? {
          dimension,
          rawScore: null,
          normalizedScore: null,
          category: null,
          questions: [],
        }
    ),
  };
}

function normalizeName(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return null;
  }
  const lowered = normalized.toLowerCase();
  if (
    lowered === "person a" ||
    lowered === "person b" ||
    lowered === "neuer" ||
    lowered === "neu" ||
    lowered === "teilnehmer" ||
    lowered === "teilnehmerin"
  ) {
    return null;
  }
  return normalized;
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildMatchNarratives(
  scoresA: RadarSeries,
  scoresB: RadarSeries,
  nameA: string,
  nameB: string,
  enabled: boolean
) {
  if (!enabled) {
    return { commonTendencies: [], frictionPoints: [] };
  }

  const commonTendencies: string[] = [];
  const frictionPoints: string[] = [];

  for (const dimension of REPORT_DIMENSIONS) {
    const a = scoresA[dimension];
    const b = scoresB[dimension];
    if (a == null || b == null) {
      continue;
    }
    const delta = Math.abs(a - b);
    const poles = dimensionPoles(dimension);

    if (delta < 1.0) {
      const dimensionName = dimensionLabel(dimension);
      commonTendencies.push(
        `Starkes Fundament: ${nameA} und ${nameB} ticken beim Thema ${dimensionName} sehr ähnlich.`
      );
      continue;
    }

    if (delta >= 1.0) {
      const aPole = a >= 3.5 ? poles.high : poles.low;
      const bPole = b >= 3.5 ? poles.high : poles.low;
      frictionPoints.push(
        `Während ${nameA} eher ${aPole} priorisiert, setzt ${nameB} stärker auf ${bPole}.`
      );
    }
  }

  return {
    commonTendencies: commonTendencies.slice(0, 3),
    frictionPoints: frictionPoints.slice(0, 3),
  };
}

function buildConversationGuide(
  scoresA: RadarSeries,
  scoresB: RadarSeries,
  enabled: boolean
) {
  const icebreakers = [
    "Was war der Moment in deiner bisherigen Laufbahn, in dem du am meisten über dich selbst gelernt hast?",
    "Stell dir vor, wir scheitern in zwei Jahren. Was wäre aus deiner heutigen Sicht der wahrscheinlichste Grund dafür?",
  ];

  const questionsByDimension: Record<ReportDimension, string> = {
    Vision: REPORT_CONTENT.dimensions.vision.q,
    Entscheidung: REPORT_CONTENT.dimensions.entscheidung.q,
    Risiko: REPORT_CONTENT.dimensions.risiko.q,
    Autonomie: REPORT_CONTENT.dimensions.autonomie.q,
    Verbindlichkeit: REPORT_CONTENT.dimensions.verbindlichkeit.q,
    Konflikt: REPORT_CONTENT.dimensions.konflikt.q,
  };

  const deltas = REPORT_DIMENSIONS.map((dimension) => {
    const a = scoresA[dimension];
    const b = scoresB[dimension];
    if (a == null || b == null) {
      return { dimension, delta: -1 };
    }
    return { dimension, delta: Math.abs(a - b) };
  })
    .filter((item) => item.delta >= 0)
    .sort((a, b) => b.delta - a.delta);

  const guide: string[] = [...icebreakers];
  const used = new Set<string>(guide);

  if (!enabled) {
    const defaults = [
      questionsByDimension.Vision,
      questionsByDimension.Entscheidung,
      questionsByDimension.Risiko,
    ];
    return [...guide, ...defaults].slice(0, 5);
  }

  for (const item of deltas) {
    const question = questionsByDimension[item.dimension];
    if (used.has(question)) continue;
    guide.push(question);
    used.add(question);
    if (guide.length === 5) break;
  }

  if (guide.length < 5) {
    for (const dimension of REPORT_DIMENSIONS) {
      const question = questionsByDimension[dimension];
      if (used.has(question)) continue;
      guide.push(question);
      used.add(question);
      if (guide.length === 5) break;
    }
  }

  return guide.slice(0, 5);
}

function deriveValuesPreview(scoresA: RadarSeries, participantName: string) {
  const risiko = scoresA.Risiko ?? 3.5;
  const verbindlichkeit = scoresA.Verbindlichkeit ?? 3.5;
  const konflikt = scoresA.Konflikt ?? 3.5;

  if (verbindlichkeit >= 4.5 && konflikt >= 4.5) {
    return `${participantName} signalisiert ein Wertefundament mit hoher Transparenz, klarer Verantwortungsübernahme und direkter Ethik-Kommunikation.`;
  }
  if (risiko <= 2.5 && konflikt <= 2.5) {
    return `${participantName} zeigt eine eher vorsichtige Ethik-Haltung mit Fokus auf Risikoprävention, Fairness und stabile Entscheidungswege.`;
  }
  return `${participantName} zeigt im Werteprofil eine ausgewogene Tendenz zwischen Verlässlichkeit, Transparenz und pragmatischer Entscheidungsfähigkeit.`;
}

async function deriveValuesModuleSummary(
  sessionId: string,
  participantAId: string | null,
  participantBId: string | null,
  participantAName: string,
  participantBName: string,
  includeB: boolean,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data: valueQuestions } = await supabase
    .from("questions")
    .select("id")
    .eq("category", "values")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(10);

  const ids = (valueQuestions ?? []).map((q) => q.id);
  const total = ids.length;
  if (total === 0) {
    return {
      valuesModulePreview: deriveValuesPreview(fillSeries(new Map()), participantAName),
      valuesModuleStatus: "not_started" as const,
      valuesAnsweredA: 0,
      valuesAnsweredB: 0,
      valuesTotal: 0,
      valuesAlignmentPercent: null,
      valuesIdentityCategoryA: null,
      valuesIdentityCategoryB: null,
    };
  }

  const { data: responses } = await supabase
    .from("responses")
    .select("participant_id, choice_value, question_id")
    .eq("session_id", sessionId)
    .in("question_id", ids);
  const { data: valueChoices } = await supabase
    .from("choices")
    .select("question_id, value")
    .in("question_id", ids);

  const rows = responses ?? [];
  const aRows = participantAId ? rows.filter((r) => r.participant_id === participantAId) : [];
  const bRows = participantBId ? rows.filter((r) => r.participant_id === participantBId) : [];
  const maxByQuestion = buildMaxByQuestion(ids, valueChoices ?? []);

  const answeredA = uniqueCount(aRows.map((r) => r.question_id));
  const answeredB = uniqueCount(bRows.map((r) => r.question_id));

  const identityScoreA = computeValuesIdentityScore(aRows, maxByQuestion);
  const identityScoreB = computeValuesIdentityScore(bRows, maxByQuestion);
  const valuesAlignmentPercent = calculateValuesAlignment(aRows, bRows);

  const status =
    answeredA === 0 && answeredB === 0
      ? ("not_started" as const)
      : answeredA >= total && (!includeB || answeredB >= total)
        ? ("completed" as const)
        : ("in_progress" as const);

  if (status === "not_started") {
    return {
      valuesModulePreview:
        "Das Werte-Modul wurde noch nicht beantwortet. Starte die Werte-Vertiefung, um Ethik- und Transparenzmuster fundiert in den Report einzubinden.",
      valuesModuleStatus: status,
      valuesAnsweredA: answeredA,
      valuesAnsweredB: answeredB,
      valuesTotal: total,
      valuesAlignmentPercent,
      valuesIdentityCategoryA: null,
      valuesIdentityCategoryB: null,
    };
  }

  if (includeB && identityScoreA != null && identityScoreB != null) {
    const profileA = resolveValuesProfile(identityScoreA);
    const profileB = resolveValuesProfile(identityScoreB);
    const sentence = `${participantAName} – ${valuesProfileLabel(profileA, participantAName)}: Identität: ${
      profileA.identity
    } Achtung: ${profileA.warning} (Score ${
      identityScoreA?.toFixed(2) ?? "n/a"
    }/6). ${participantBName} – ${valuesProfileLabel(profileB, participantBName)}: Identität: ${
      profileB.identity
    } Achtung: ${profileB.warning} (Score ${
      identityScoreB?.toFixed(2) ?? "n/a"
    }/6).`;
    return {
      valuesModulePreview: sentence,
      valuesModuleStatus: status,
      valuesAnsweredA: answeredA,
      valuesAnsweredB: answeredB,
      valuesTotal: total,
      valuesAlignmentPercent,
      valuesIdentityCategoryA: profileA.title,
      valuesIdentityCategoryB: profileB.title,
    };
  }

  const profileA = resolveValuesProfile(identityScoreA);
  return {
    valuesModulePreview: `${participantAName} – ${valuesProfileLabel(profileA, participantAName)}: Identität: ${
      profileA.identity
    } Achtung: ${profileA.warning} (Score ${
      identityScoreA?.toFixed(2) ?? "n/a"
    }/6, Werte-Fragen beantwortet: ${answeredA}/${total}).`,
    valuesModuleStatus: status,
    valuesAnsweredA: answeredA,
    valuesAnsweredB: answeredB,
    valuesTotal: total,
    valuesAlignmentPercent,
    valuesIdentityCategoryA: profileA.title,
    valuesIdentityCategoryB: null,
  };
}

function buildMaxByQuestion(
  ids: string[],
  choiceRows: { question_id: string; value: string }[]
) {
  const map = new Map<string, number>();
  for (const id of ids) map.set(id, 4);
  for (const row of choiceRows) {
    const numeric = Number(row.value);
    if (!Number.isFinite(numeric)) continue;
    const current = map.get(row.question_id) ?? 4;
    if (numeric > current) map.set(row.question_id, numeric);
  }
  return map;
}

function computeValuesIdentityScore(
  rows: { question_id: string; choice_value: string }[],
  maxByQuestion: Map<string, number>
) {
  if (rows.length === 0) return null;
  const normalized: number[] = [];
  for (const row of rows) {
    const value = Number(row.choice_value);
    if (!Number.isFinite(value)) continue;
    const max = Math.max(2, maxByQuestion.get(row.question_id) ?? 4);
    const bounded = Math.max(1, Math.min(max, value));
    const score6 = 1 + ((bounded - 1) / (max - 1)) * 5;
    normalized.push(score6);
  }
  if (normalized.length === 0) return null;
  return normalized.reduce((sum, item) => sum + item, 0) / normalized.length;
}

function resolveValuesProfile(score: number | null) {
  if (score == null) return VALUES_PLAYBOOK.verantwortungs_stratege;
  if (score <= 2.2) return VALUES_PLAYBOOK.impact_idealist;
  if (score >= 3.5) return VALUES_PLAYBOOK.business_pragmatiker;
  return VALUES_PLAYBOOK.verantwortungs_stratege;
}

function valuesProfileLabel(
  profile: (typeof VALUES_PLAYBOOK)[keyof typeof VALUES_PLAYBOOK],
  participantName: string
) {
  const isMaria = participantName.trim().toLowerCase() === "maria";
  const subtitle = "subtitle" in profile ? profile.subtitle : undefined;
  if (isMaria && subtitle) {
    return `${profile.title} (${subtitle})`;
  }
  return profile.title;
}

function calculateValuesAlignment(
  aRows: { question_id: string; choice_value: string }[],
  bRows: { question_id: string; choice_value: string }[]
) {
  const byQuestionB = new Map<string, number>();
  for (const row of bRows) {
    const value = Number(row.choice_value);
    if (!Number.isFinite(value)) continue;
    byQuestionB.set(row.question_id, value);
  }

  const closeness: number[] = [];
  for (const row of aRows) {
    const a = Number(row.choice_value);
    const b = byQuestionB.get(row.question_id);
    if (!Number.isFinite(a) || b == null) continue;
    const delta = Math.abs(a - b);
    const normalized = Math.max(0, 1 - delta / 5); // 1..6 scale
    closeness.push(normalized);
  }

  if (closeness.length === 0) return null;
  const avg = closeness.reduce((sum, value) => sum + value, 0) / closeness.length;
  return Math.round(avg * 100);
}

function uniqueCount(values: string[]) {
  return new Set(values).size;
}

function dimensionLabel(dimension: ReportDimension) {
  switch (dimension) {
    case "Vision":
      return "Vision";
    case "Entscheidung":
      return "Entscheidung";
    case "Risiko":
      return "Risikoprofil";
    case "Autonomie":
      return "Autonomie";
    case "Verbindlichkeit":
      return "Verbindlichkeit";
    case "Konflikt":
      return "Konflikt";
  }
}

function dimensionKey(dimension: ReportDimension): keyof typeof DIMENSION_INSIGHTS {
  switch (dimension) {
    case "Vision":
      return "vision";
    case "Entscheidung":
      return "entscheidung";
    case "Risiko":
      return "risiko";
    case "Autonomie":
      return "autonomie";
    case "Verbindlichkeit":
      return "verbindlichkeit";
    case "Konflikt":
      return "konflikt";
  }
}

function dimensionPoles(dimension: ReportDimension) {
  switch (dimension) {
    case "Vision":
      return { low: "strategische Stabilität", high: "skalierendes Wachstum" };
    case "Entscheidung":
      return { low: "analytische Sorgfalt", high: "intuitives Tempo" };
    case "Risiko":
      return { low: "Absicherung", high: "kalkulierte Chancenoffenheit" };
    case "Autonomie":
      return { low: "autonome Arbeit", high: "enge Abstimmung" };
    case "Verbindlichkeit":
      return { low: "nachhaltige Belastbarkeit", high: "radikale Lieferorientierung" };
    case "Konflikt":
      return { low: "harmonische Diplomatie", high: "radikale Klarheit" };
  }
}
