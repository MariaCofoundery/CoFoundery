"use server";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildProfileResultFromSession,
  generateCompareReport,
} from "@/features/reporting/generateCompareReport";
import {
  buildFounderAlignmentReport,
  type FounderAlignmentReport,
} from "@/features/reporting/buildFounderAlignmentReport";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import { createClient } from "@/lib/supabase/server";
import {
  assertFounderBaseQuestionVersionContract,
  scoreStoredBaseAnswerToFounderPercent,
} from "@/features/scoring/founderBaseQuestionMeta";
import {
  aggregateBaseScoresFromAnswers,
  assertValuesTotalCategoryContract,
  type AssessmentAnswerRow,
  type QuestionMetaRow,
} from "@/features/reporting/base_scoring";
import { FOUNDER_DIMENSION_ORDER, getFounderDimensionMeta, type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import {
  scoreFounderAlignment,
  type Answer as FounderAnswer,
  type TeamScoringResult,
} from "@/features/scoring/founderScoring";
import {
  aggregateFounderBaseScoresFromAnswers,
  buildSelfFounderKeyInsights,
  toSelfBaseCoverage,
  toSelfParticipantDebugReport,
} from "@/features/reporting/selfReportScoring";
import { type SelfAlignmentReport } from "@/features/reporting/selfReportTypes";
import {
  computeValuesContinuumScore,
  scoreSelfValuesProfile,
  type ValuesAnswerForScoring,
} from "@/features/reporting/values_scoring";
import { getValuesQuestionVersionMismatch } from "@/features/reporting/valuesQuestionMeta";
import {
  REPORT_DIMENSIONS,
  type CompareReportJson,
  type KeyInsight,
  type RadarSeries,
  type ReportDimension,
  type SessionAlignmentReport,
} from "@/features/reporting/types";

export type ReportRunSnapshot = {
  id: string;
  invitationId: string;
  relationshipId: string;
  createdAt: string;
  modules: string[];
  inputAssessmentIds: string[];
  reportType: "classic_compare_v1" | "founder_alignment_v1";
  report: SessionAlignmentReport | null;
  compareJson: CompareReportJson | null;
  founderReport: FounderAlignmentReport | null;
  founderScoring: TeamScoringResult | null;
  payload: Record<string, unknown> | null;
};

type ReportRunRow = {
  id: string;
  invitation_id: string;
  relationship_id: string;
  modules: string[] | null;
  input_assessment_ids: string[] | null;
  payload: unknown;
  created_at: string;
};

type SubmittedAssessmentRow = {
  id: string;
  module?: string;
  user_id?: string;
  submitted_at: string | null;
  created_at: string;
};

const VALUES_QUESTION_CATEGORY = "values" as const;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseLikeClient = Pick<SupabaseServerClient, "from">;
type SupabaseDbClient = SupabaseLikeClient & SupabaseClient;
export type AssessmentModule = "base" | "values";

type EnsureReportRunResult =
  | {
      ok: true;
      reportRunId: string;
    }
  | {
      ok: false;
      reason:
        | "not_authenticated"
        | "invitation_not_found"
        | "not_accepted"
        | "missing_invitee"
        | "missing_relationship"
        | "waiting_for_answers"
        | "expired"
        | "revoked"
        | "missing_service_role"
        | "insert_failed";
      detail?: string;
    };

type EnsureReportRunFailureReason = Exclude<EnsureReportRunResult, { ok: true }>["reason"];

type EnsureReportRunPrivilegedOptions = {
  requesterUserId?: string | null;
  skipMembershipCheck?: boolean;
  sourceTag?: string;
};

export type BackfillReportRunItem = {
  invitationId: string;
  status: "created" | "waiting_for_answers" | "skipped" | "failed";
  reportRunId: string | null;
  reason?: EnsureReportRunFailureReason;
  detail?: string;
};

export type BackfillReportRunsResult =
  | {
      ok: true;
      timedOut: boolean;
      maxDurationMs: number;
      scannedAccepted: number;
      candidatesWithoutReportRun: number;
      processed: number;
      remainingCandidates: number;
      created: number;
      waitingForAnswers: number;
      skipped: number;
      failed: number;
      items: BackfillReportRunItem[];
    }
  | {
      ok: false;
      reason: "missing_service_role" | "query_failed";
      detail?: string;
    };

type InvitationEnsureRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  invitee_email: string;
  team_context: string | null;
  status: string;
  created_at: string;
  accepted_at: string | null;
  expires_at: string;
  revoked_at: string | null;
};

type InvitationModuleRow = {
  module: string;
};

type ProfileDisplayRow = {
  user_id: string;
  display_name: string | null;
};

type InvitationDashboardSourceRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  invitee_email: string;
  team_context: string | null;
  status: string;
  label: string | null;
  inviter_display_name: string | null;
  inviter_email: string | null;
  created_at: string;
  expires_at: string;
};

type InvitationModuleByInvitationRow = {
  invitation_id: string;
  module: string;
};

type SubmittedAssessmentLiteRow = {
  id: string;
  user_id: string;
  module: string;
  submitted_at: string | null;
  created_at: string;
};

type ReportRunInvitationRow = {
  invitation_id: string;
};

type BackfillInvitationIdRow = {
  id: string;
};

type FinalizeInvitationRpcRow = {
  ready: boolean | null;
  report_run_id: string | null;
  relationship_id: string | null;
  modules: string[] | null;
  assessment_ids: string[] | null;
  reason: string | null;
};

export type InvitationDashboardRow = {
  id: string;
  direction: "sent" | "incoming";
  inviteeEmail: string;
  teamContext: TeamContext;
  status: string;
  label: string | null;
  inviterDisplayName: string | null;
  inviterEmail: string | null;
  requiredModules: AssessmentModule[];
  isReportReady: boolean;
  isReadyForMatching: boolean;
  inviterBaseSubmitted: boolean;
  inviterValuesSubmitted: boolean;
  inviteeBaseSubmitted: boolean;
  inviteeValuesSubmitted: boolean;
  createdAt: string;
  expiresAt: string;
};

type PerUserReadinessSnapshot = {
  has_base_submitted: boolean;
  has_values_submitted: boolean;
  submitted_assessment_ids: {
    base: string | null;
    values: string | null;
  };
  answers_count: {
    base: number;
    values: number;
  };
};

export type InvitationReadinessDebug = {
  invitation: {
    id: string;
    status: string;
    inviter_user_id: string;
    invitee_user_id: string | null;
    invitee_email: string;
    expires_at: string;
    revoked_at: string | null;
    accepted_at: string | null;
  };
  modules_required: AssessmentModule[];
  per_user_status: {
    inviter: PerUserReadinessSnapshot;
    invitee: PerUserReadinessSnapshot | null;
  };
  report_run_exists: boolean;
  report_run_id: string | null;
  relationship_exists: boolean;
  relationship_id: string | null;
  computed_ready: boolean;
  reason_not_ready: string[];
  last_error: string | null;
};

export type InvitationJoinDecision =
  | {
      ok: true;
      invitation_id: string;
      mode: "needs_questionnaires" | "choice_existing_or_update" | "report_ready";
      team_context: TeamContext;
      required_modules: AssessmentModule[];
      missing_modules: AssessmentModule[];
      invitee_status: {
        has_base_submitted: boolean;
        has_values_submitted: boolean;
      };
      report_run_id: string | null;
    }
  | {
      ok: false;
      reason:
        | "not_authenticated"
        | "invitation_not_found"
        | "not_invitee"
        | "not_accepted"
        | "expired"
        | "revoked"
        | "missing_invitee";
      detail?: string;
    };

export type UseExistingInvitationProfileResult =
  | {
      ok: true;
      reportRunId: string | null;
      waiting: boolean;
      reason?: string;
    }
  | {
      ok: false;
      reason: "not_ready_for_existing" | EnsureReportRunFailureReason;
      detail?: string;
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

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function emptySeries(): RadarSeries {
  return REPORT_DIMENSIONS.reduce((acc, key) => {
    acc[key] = null;
    return acc;
  }, {} as RadarSeries);
}

function normalizeDimensionLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapGermanDimensionToReportKey(dim: string): ReportDimension | null {
  const normalized = normalizeDimensionLabel(dim);
  if (!normalized) return null;

  if (normalized.includes("vision") && normalized.includes("richtung")) {
    return "Vision";
  }

  if (normalized.includes("entscheidungsstil") || normalized.includes("entscheidung")) {
    return "Entscheidung";
  }

  if (
    (normalized.includes("unsicherheit") && normalized.includes("risiko")) ||
    normalized.includes("umgang mit unsicherheit")
  ) {
    return "Risiko";
  }

  if (normalized.includes("zusammenarbeit") && normalized.includes("nahe")) {
    return "Autonomie";
  }

  if (normalized.includes("verantwortung") && normalized.includes("verbindlichkeit")) {
    return "Verbindlichkeit";
  }

  if (normalized.includes("konfliktverhalten") || normalized.includes("konflikt")) {
    return "Konflikt";
  }

  return null;
}

function normalizeCategory(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeTeamContext(value: string | null | undefined): TeamContext {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

function transformFounderScoringAnswers(
  rows: AssessmentAnswerRow[],
  questionMetaById: Map<string, QuestionMetaRow>
): FounderAnswer[] {
  return rows.flatMap((row) => {
    const meta = questionMetaById.get(row.question_id);
    if (!meta?.dimension) {
      return [];
    }

    const numericValue = scoreStoredBaseAnswerToFounderPercent(row.question_id, row.choice_value);
    if (numericValue == null || !Number.isFinite(numericValue)) {
      return [];
    }

    return [
      {
        question_id: row.question_id,
        dimension: meta.dimension,
        value: numericValue,
      },
    ];
  });
}

function isValuesCategory(value: string | null | undefined) {
  return normalizeCategory(value) === VALUES_QUESTION_CATEGORY;
}

function assertValuesCategoryContract(rows: QuestionMetaRow[], context: string) {
  const invalid = rows.filter((row) => !isValuesCategory(row.category));
  if (invalid.length === 0) {
    return;
  }

  const sample = invalid
    .slice(0, 8)
    .map((row) => `${row.id}:${normalizeCategory(row.category) || "null"}`)
    .join(", ");
  const message = `values_category_contract_violation (${context}): expected category='values', got ${sample}`;
  if (process.env.NODE_ENV !== "production") {
    throw new Error(message);
  }
  console.error(message);
}

function assertValuesQuestionVersionContract(
  rows: QuestionMetaRow[],
  context: string,
  options?: { allowMissing?: boolean }
) {
  const { unknownIds, missingIds, isAligned } = getValuesQuestionVersionMismatch(rows.map((row) => row.id));
  const allowMissing = options?.allowMissing === true;
  if (isAligned || (allowMissing && unknownIds.length === 0)) {
    return;
  }

  const parts: string[] = [];
  if (unknownIds.length > 0) {
    parts.push(`unknown=${unknownIds.join(",")}`);
  }
  if (!allowMissing && missingIds.length > 0) {
    parts.push(`missing=${missingIds.join(",")}`);
  }

  const message = `values_question_version_contract_mismatch (${context}): ${parts.join(" | ")}`;
  if (process.env.NODE_ENV !== "production") {
    throw new Error(message);
  }
  console.error(message);
}

async function countQuestionsByCategories(
  supabase: SupabaseLikeClient,
  categories: string[],
  onlyActive: boolean
): Promise<number> {
  const normalized = [...new Set(categories.map((category) => normalizeCategory(category)).filter(Boolean))];
  if (normalized.length === 0) return 0;

  let query = supabase.from("questions").select("id", { count: "exact", head: true }).in("category", normalized);
  if (onlyActive) {
    query = query.eq("is_active", true);
  }

  const { count, error } = await query;
  if (error || typeof count !== "number") {
    return 0;
  }

  return count;
}

async function countValuesQuestionsTotal(supabase: SupabaseLikeClient, onlyActive: boolean): Promise<number> {
  let query = supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("category", VALUES_QUESTION_CATEGORY);
  if (onlyActive) {
    query = query.eq("is_active", true);
  }

  const { count, error } = await query;
  if (error || typeof count !== "number") {
    return 0;
  }
  return count;
}

function coerceAssessmentModule(value: string | null | undefined): AssessmentModule | null {
  if (value === "base" || value === "values") return value;
  return null;
}

function ensureBaseModule(modules: AssessmentModule[]): AssessmentModule[] {
  if (modules.includes("base")) return modules;
  return ["base", ...modules];
}

async function getRequiredModulesForInvitation(
  supabase: SupabaseLikeClient,
  invitationId: string
): Promise<AssessmentModule[]> {
  const { data, error } = await supabase
    .from("invitation_modules")
    .select("module")
    .eq("invitation_id", invitationId);

  if (error || !data) {
    return ["base"];
  }

  const modules = [...new Set((data as InvitationModuleRow[]).map((row) => coerceAssessmentModule(row.module)).filter(Boolean))] as AssessmentModule[];
  return ensureBaseModule(modules);
}

async function getLatestSubmittedAssessmentForUserModule(
  supabase: SupabaseLikeClient,
  userId: string,
  module: AssessmentModule
): Promise<SubmittedAssessmentRow | null> {
  const { data, error } = await supabase
    .from("assessments")
    .select("id, user_id, module, submitted_at, created_at")
    .eq("user_id", userId)
    .eq("module", module)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as SubmittedAssessmentRow;
}

async function getAssessmentAnswers(
  supabase: SupabaseLikeClient,
  assessmentId: string
): Promise<AssessmentAnswerRow[]> {
  const { data, error } = await supabase
    .from("assessment_answers")
    .select("question_id, choice_value")
    .eq("assessment_id", assessmentId);

  if (error || !data) return [];
  return data as AssessmentAnswerRow[];
}

async function getQuestionMetaMap(
  supabase: SupabaseLikeClient,
  questionIds: string[]
): Promise<Map<string, QuestionMetaRow>> {
  const uniqueQuestionIds = [...new Set(questionIds.filter(Boolean))];
  if (uniqueQuestionIds.length === 0) {
    return new Map<string, QuestionMetaRow>();
  }

  const { data, error } = await supabase
    .from("questions")
    .select("id, dimension, category, prompt")
    .in("id", uniqueQuestionIds);

  if (error || !data) {
    return new Map<string, QuestionMetaRow>();
  }

  return new Map((data as QuestionMetaRow[]).map((row) => [row.id, row]));
}

function emptyDimensionCountRecord() {
  return REPORT_DIMENSIONS.reduce((acc, dimension) => {
    acc[dimension] = 0;
    return acc;
  }, {} as Record<ReportDimension, number>);
}

function emptyFounderDimensionCountRecord() {
  return FOUNDER_DIMENSION_ORDER.reduce((acc, dimension) => {
    acc[dimension] = 0;
    return acc;
  }, {} as Record<FounderDimensionKey, number>);
}

async function getExpectedBaseQuestionCountByDimension(
  supabase: SupabaseLikeClient
): Promise<Record<ReportDimension, number>> {
  const fallback = emptyDimensionCountRecord();
  const { data, error } = await supabase
    .from("questions")
    .select("id, dimension, category, is_active")
    .eq("category", "basis")
    .eq("is_active", true);

  if (error || !data || data.length === 0) {
    const fallbackQuery = await supabase
      .from("questions")
      .select("id, dimension, category")
      .eq("category", "basis");
    if (fallbackQuery.error || !fallbackQuery.data) {
      return fallback;
    }
    assertFounderBaseQuestionVersionContract(
      (fallbackQuery.data as QuestionMetaRow[]).map((row) => row.id),
      "expected_base_question_count_by_dimension_fallback"
    );
    for (const row of fallbackQuery.data as QuestionMetaRow[]) {
      const mapped = row.dimension ? mapGermanDimensionToReportKey(row.dimension) : null;
      if (!mapped) continue;
      fallback[mapped] += 1;
    }
    return fallback;
  }

  assertFounderBaseQuestionVersionContract(
    (data as Array<QuestionMetaRow & { is_active?: boolean }>).map((row) => row.id),
    "expected_base_question_count_by_dimension"
  );
  for (const row of data as Array<QuestionMetaRow & { is_active?: boolean }>) {
    const mapped = row.dimension ? mapGermanDimensionToReportKey(row.dimension) : null;
    if (!mapped) continue;
    fallback[mapped] += 1;
  }
  return fallback;
}

async function getExpectedFounderBaseQuestionCountByDimension(
  supabase: SupabaseLikeClient
): Promise<Record<FounderDimensionKey, number>> {
  const fallback = emptyFounderDimensionCountRecord();
  const { data, error } = await supabase
    .from("questions")
    .select("id, dimension, category, is_active")
    .eq("category", "basis")
    .eq("is_active", true);

  const rows =
    error || !data || data.length === 0
      ? (
          await supabase
            .from("questions")
            .select("id, dimension, category")
            .eq("category", "basis")
        ).data ?? []
      : data;

  assertFounderBaseQuestionVersionContract(
    (rows as Array<QuestionMetaRow & { is_active?: boolean }>).map((row) => row.id),
    "expected_founder_base_question_count_by_dimension"
  );

  for (const row of rows as Array<QuestionMetaRow & { is_active?: boolean }>) {
    const mapped = row.dimension ? getFounderDimensionMeta(row.dimension)?.canonicalName : null;
    if (!mapped) continue;
    fallback[mapped] += 1;
  }

  return fallback;
}

function parseAcceptableReportRunId(row: { id?: string } | null | undefined): string | null {
  if (!row?.id || typeof row.id !== "string") return null;
  return row.id;
}

function parseFinalizeRpcRow(value: unknown): FinalizeInvitationRpcRow | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  return row as FinalizeInvitationRpcRow;
}

function mapFinalizeReasonToEnsureReason(reason: string | null | undefined): EnsureReportRunFailureReason {
  if (reason === "invitation_not_found") return "invitation_not_found";
  if (reason === "not_accepted") return "not_accepted";
  if (reason === "missing_invitee") return "missing_invitee";
  if (reason === "waiting_for_answers") return "waiting_for_answers";
  if (reason === "expired") return "expired";
  if (reason === "revoked") return "revoked";
  return "insert_failed";
}

function isInvitationExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  const timestamp = new Date(expiresAt).getTime();
  if (Number.isNaN(timestamp)) return false;
  return timestamp < Date.now();
}

async function getLatestSubmittedAssessmentsByUserAndModule(
  supabase: SupabaseLikeClient,
  userIds: string[]
): Promise<Map<string, Map<AssessmentModule, SubmittedAssessmentRow>>> {
  const normalizedUserIds = [...new Set(userIds.filter(Boolean))];
  if (normalizedUserIds.length === 0) {
    return new Map<string, Map<AssessmentModule, SubmittedAssessmentRow>>();
  }

  const { data, error } = await supabase
    .from("assessments")
    .select("id, user_id, module, submitted_at, created_at")
    .in("user_id", normalizedUserIds)
    .in("module", ["base", "values"])
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return new Map<string, Map<AssessmentModule, SubmittedAssessmentRow>>();
  }

  const byUser = new Map<string, Map<AssessmentModule, SubmittedAssessmentRow>>();
  for (const row of data as SubmittedAssessmentLiteRow[]) {
    const userId = row.user_id?.trim();
    const moduleKey = coerceAssessmentModule(row.module);
    if (!userId || !moduleKey) continue;

    const byModule = byUser.get(userId) ?? new Map<AssessmentModule, SubmittedAssessmentRow>();
    if (!byModule.has(moduleKey)) {
      byModule.set(moduleKey, {
        id: row.id,
        module: moduleKey,
        user_id: userId,
        submitted_at: row.submitted_at,
        created_at: row.created_at,
      });
      byUser.set(userId, byModule);
    }
  }

  return byUser;
}

async function getAnswerCountByAssessmentId(
  supabase: SupabaseLikeClient,
  assessmentIds: string[]
): Promise<Map<string, number>> {
  const normalizedAssessmentIds = [...new Set(assessmentIds.filter(Boolean))];
  if (normalizedAssessmentIds.length === 0) {
    return new Map<string, number>();
  }

  const { data, error } = await supabase
    .from("assessment_answers")
    .select("assessment_id")
    .in("assessment_id", normalizedAssessmentIds);
  if (error || !data) {
    return new Map<string, number>();
  }

  const counts = new Map<string, number>();
  for (const row of data as Array<{ assessment_id: string }>) {
    counts.set(row.assessment_id, (counts.get(row.assessment_id) ?? 0) + 1);
  }
  return counts;
}

function isUserReadyForModules(
  requiredModules: AssessmentModule[],
  submittedByModule: Map<AssessmentModule, SubmittedAssessmentRow> | undefined
) {
  return requiredModules.every((moduleKey) => submittedByModule?.has(moduleKey));
}

function buildPerUserReadinessSnapshot(
  submittedByModule: Map<AssessmentModule, SubmittedAssessmentRow> | undefined,
  answersByAssessmentId: Map<string, number>
): PerUserReadinessSnapshot {
  const baseAssessmentId = submittedByModule?.get("base")?.id ?? null;
  const valuesAssessmentId = submittedByModule?.get("values")?.id ?? null;
  return {
    has_base_submitted: Boolean(baseAssessmentId),
    has_values_submitted: Boolean(valuesAssessmentId),
    submitted_assessment_ids: {
      base: baseAssessmentId,
      values: valuesAssessmentId,
    },
    answers_count: {
      base: baseAssessmentId ? answersByAssessmentId.get(baseAssessmentId) ?? 0 : 0,
      values: valuesAssessmentId ? answersByAssessmentId.get(valuesAssessmentId) ?? 0 : 0,
    },
  };
}

function buildReadinessReasons(params: {
  invitation: InvitationEnsureRow;
  requiredModules: AssessmentModule[];
  inviterAssessments: Map<AssessmentModule, SubmittedAssessmentRow> | undefined;
  inviteeAssessments: Map<AssessmentModule, SubmittedAssessmentRow> | undefined;
  reportRunExists: boolean;
}): string[] {
  const reasons: string[] = [];
  const { invitation, requiredModules, inviterAssessments, inviteeAssessments, reportRunExists } = params;

  if (invitation.status !== "accepted") {
    reasons.push(
      invitation.status === "revoked" || invitation.revoked_at ? "revoked" : "invite_not_accepted"
    );
  }
  if (!invitation.invitee_user_id) {
    reasons.push("invitee_missing");
  }
  if (invitation.revoked_at) {
    reasons.push("revoked");
  }
  if (isInvitationExpired(invitation.expires_at)) {
    reasons.push("expired");
  }

  for (const moduleKey of requiredModules) {
    if (!inviterAssessments?.has(moduleKey)) {
      reasons.push(`${moduleKey}_missing_for_inviter`);
    }
    if (!inviteeAssessments?.has(moduleKey)) {
      reasons.push(`${moduleKey}_missing_for_invitee`);
    }
  }

  const uniqReasons = [...new Set(reasons)];
  if (uniqReasons.length === 0 && !reportRunExists) {
    uniqReasons.push("finalize_not_called");
  }

  return uniqReasons;
}

export async function getInvitationDashboardRows(): Promise<InvitationDashboardRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return [];
  }

  const normalizedEmail = (user.email ?? "").trim().toLowerCase();
  const invitationFilter = normalizedEmail
    ? `inviter_user_id.eq.${user.id},invitee_user_id.eq.${user.id},invitee_email.eq.${normalizedEmail}`
    : `inviter_user_id.eq.${user.id},invitee_user_id.eq.${user.id}`;
  const { data: invitationsData, error: invitationsError } = await supabase
    .from("invitations")
    .select(
      "id, inviter_user_id, invitee_user_id, invitee_email, team_context, status, label, inviter_display_name, inviter_email, created_at, expires_at"
    )
    .or(invitationFilter)
    .order("created_at", { ascending: false });

  if (invitationsError || !invitationsData) {
    return [];
  }

  const invitations = invitationsData as InvitationDashboardSourceRow[];
  if (invitations.length === 0) {
    return [];
  }

  const invitationIds = invitations.map((invitation) => invitation.id);
  const allRelevantUserIds = [
    ...new Set(
      invitations
        .flatMap((invitation) => [invitation.inviter_user_id, invitation.invitee_user_id])
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    ),
  ];

  const privileged = createPrivilegedClient();
  const dataClient = privileged ?? supabase;

  const [modulesResult, reportRunsResult, latestSubmittedByUser] = await Promise.all([
    dataClient
      .from("invitation_modules")
      .select("invitation_id, module")
      .in("invitation_id", invitationIds),
    dataClient.from("report_runs").select("invitation_id").in("invitation_id", invitationIds),
    getLatestSubmittedAssessmentsByUserAndModule(dataClient, allRelevantUserIds),
  ]);

  const requiredModulesByInvitationId = new Map<string, AssessmentModule[]>();
  for (const invitationId of invitationIds) {
    requiredModulesByInvitationId.set(invitationId, ["base"]);
  }

  for (const row of (modulesResult.data ?? []) as InvitationModuleByInvitationRow[]) {
    const moduleKey = coerceAssessmentModule(row.module);
    if (!moduleKey) continue;
    const existing = requiredModulesByInvitationId.get(row.invitation_id) ?? ["base"];
    requiredModulesByInvitationId.set(
      row.invitation_id,
      ensureBaseModule([...new Set([...existing, moduleKey])])
    );
  }

  const reportRunByInvitationId = new Set(
    ((reportRunsResult.data ?? []) as ReportRunInvitationRow[]).map((row) => row.invitation_id)
  );

  return invitations.map((invitation) => {
    const direction = invitation.inviter_user_id === user.id ? "sent" : "incoming";
    const requiredModules = requiredModulesByInvitationId.get(invitation.id) ?? ["base"];
    const inviterSubmittedByModule = latestSubmittedByUser.get(invitation.inviter_user_id);
    const inviteeSubmittedByModule = invitation.invitee_user_id
      ? latestSubmittedByUser.get(invitation.invitee_user_id)
      : undefined;
    const inviteeHasBase = Boolean(inviteeSubmittedByModule?.has("base"));
    const inviteeHasValues = Boolean(inviteeSubmittedByModule?.has("values"));
    const inviterHasBase = Boolean(inviterSubmittedByModule?.has("base"));
    const inviterHasValues = Boolean(inviterSubmittedByModule?.has("values"));
    const reportRunExists = reportRunByInvitationId.has(invitation.id);
    const isReadyForMatching =
      invitation.status === "accepted" &&
      !isInvitationExpired(invitation.expires_at) &&
      isUserReadyForModules(requiredModules, inviterSubmittedByModule) &&
      isUserReadyForModules(requiredModules, inviteeSubmittedByModule);

    return {
      id: invitation.id,
      direction,
      inviteeEmail: invitation.invitee_email,
      teamContext: normalizeTeamContext(invitation.team_context),
      status: invitation.status,
      label: direction === "sent" ? invitation.label ?? null : null,
      inviterDisplayName: invitation.inviter_display_name ?? null,
      inviterEmail: invitation.inviter_email ?? null,
      requiredModules,
      isReportReady: reportRunExists,
      isReadyForMatching,
      inviterBaseSubmitted: inviterHasBase,
      inviterValuesSubmitted: inviterHasValues,
      inviteeBaseSubmitted: inviteeHasBase,
      inviteeValuesSubmitted: inviteeHasValues,
      createdAt: invitation.created_at,
      expiresAt: invitation.expires_at,
    };
  });
}

function emptyReadinessSnapshot(): PerUserReadinessSnapshot {
  return {
    has_base_submitted: false,
    has_values_submitted: false,
    submitted_assessment_ids: {
      base: null,
      values: null,
    },
    answers_count: {
      base: 0,
      values: 0,
    },
  };
}

function moduleOrder(modules: AssessmentModule[]) {
  const uniq = [...new Set(modules)];
  return uniq.sort((left, right) => {
    if (left === right) return 0;
    if (left === "base") return -1;
    if (right === "base") return 1;
    return left.localeCompare(right);
  });
}

async function getInvitationJoinDecisionInternal(
  invitationId: string
): Promise<InvitationJoinDecision> {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId) {
    return { ok: false, reason: "invitation_not_found" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { ok: false, reason: "not_authenticated" };
  }

  const normalizedEmail = (user.email ?? "").trim().toLowerCase();
  const { data: invitationAccess, error: invitationAccessError } = await supabase
    .from("invitations")
    .select("id, inviter_user_id, invitee_user_id, invitee_email, team_context, status, expires_at, revoked_at")
    .eq("id", normalizedInvitationId)
    .maybeSingle();
  if (invitationAccessError || !invitationAccess) {
    return {
      ok: false,
      reason: "invitation_not_found",
      detail: invitationAccessError?.message ?? undefined,
    };
  }

  const invitation = invitationAccess as {
    id: string;
    inviter_user_id: string;
    invitee_user_id: string | null;
    invitee_email: string;
    team_context: string | null;
    status: string;
    expires_at: string;
    revoked_at: string | null;
  };
  const isInvitee =
    invitation.invitee_user_id === user.id ||
    (normalizedEmail.length > 0 && invitation.invitee_email === normalizedEmail);
  if (!isInvitee) {
    return { ok: false, reason: "not_invitee" };
  }
  if (invitation.revoked_at || invitation.status === "revoked") {
    return { ok: false, reason: "revoked" };
  }
  if (isInvitationExpired(invitation.expires_at)) {
    return { ok: false, reason: "expired" };
  }
  if (invitation.status !== "accepted") {
    return { ok: false, reason: "not_accepted" };
  }
  if (!invitation.invitee_user_id) {
    return { ok: false, reason: "missing_invitee" };
  }

  const privileged = createPrivilegedClient();
  const dataClient = privileged ?? supabase;
  const requiredModules = moduleOrder(await getRequiredModulesForInvitation(dataClient, normalizedInvitationId));
  const latestSubmittedByUser = await getLatestSubmittedAssessmentsByUserAndModule(dataClient, [user.id]);
  const inviteeSubmittedByModule = latestSubmittedByUser.get(user.id);
  const missingModules = requiredModules.filter((moduleKey) => !inviteeSubmittedByModule?.has(moduleKey));

  const { data: reportRunData } = await dataClient
    .from("report_runs")
    .select("id")
    .eq("invitation_id", normalizedInvitationId)
    .maybeSingle();
  const reportRunId = parseAcceptableReportRunId(reportRunData as { id?: string } | null);

  const mode: "needs_questionnaires" | "choice_existing_or_update" | "report_ready" = reportRunId
    ? "report_ready"
    : missingModules.length > 0
      ? "needs_questionnaires"
      : "choice_existing_or_update";

  return {
    ok: true,
    invitation_id: normalizedInvitationId,
    mode,
    team_context: normalizeTeamContext(invitation.team_context),
    required_modules: requiredModules,
    missing_modules: missingModules,
    invitee_status: {
      has_base_submitted: Boolean(inviteeSubmittedByModule?.has("base")),
      has_values_submitted: Boolean(inviteeSubmittedByModule?.has("values")),
    },
    report_run_id: reportRunId,
  };
}

export async function getInvitationJoinDecision(
  invitationId: string
): Promise<InvitationJoinDecision> {
  return getInvitationJoinDecisionInternal(invitationId);
}

export async function applyExistingInvitationProfileChoice(
  invitationId: string
): Promise<UseExistingInvitationProfileResult> {
  const decision = await getInvitationJoinDecisionInternal(invitationId);
  if (!decision.ok) {
    const mappedReason: EnsureReportRunFailureReason =
      decision.reason === "not_authenticated"
        ? "not_authenticated"
        : decision.reason === "invitation_not_found"
          ? "invitation_not_found"
          : decision.reason === "not_accepted"
            ? "not_accepted"
            : decision.reason === "missing_invitee"
              ? "missing_invitee"
              : decision.reason === "expired"
                ? "expired"
                : decision.reason === "revoked"
                  ? "revoked"
                  : "invitation_not_found";
    return {
      ok: false,
      reason: mappedReason,
      detail: decision.detail,
    };
  }

  if (decision.mode === "needs_questionnaires") {
    return { ok: false, reason: "not_ready_for_existing" };
  }

  if (decision.mode === "report_ready") {
    return { ok: true, reportRunId: decision.report_run_id, waiting: false };
  }

  const finalizeResult = await finalizeInvitationIfReady(invitationId);
  if (finalizeResult.ok) {
    return { ok: true, reportRunId: finalizeResult.reportRunId, waiting: false };
  }

  if (finalizeResult.reason === "waiting_for_answers") {
    return {
      ok: true,
      reportRunId: null,
      waiting: true,
      reason: finalizeResult.reason,
    };
  }

    console.error("applyExistingInvitationProfileChoice finalize failed", {
      invitationId,
      reason: finalizeResult.reason,
      detail: finalizeResult.detail ?? null,
  });
  return {
    ok: false,
    reason: finalizeResult.reason,
    detail: finalizeResult.detail,
  };
}

export async function debug_invitation_readiness(
  invitationId: string,
  options?: { attemptFinalize?: boolean }
): Promise<InvitationReadinessDebug> {
  const normalizedInvitationId = invitationId.trim();
  const fallback: InvitationReadinessDebug = {
    invitation: {
      id: normalizedInvitationId,
      status: "unknown",
      inviter_user_id: "",
      invitee_user_id: null,
      invitee_email: "",
      expires_at: "",
      revoked_at: null,
      accepted_at: null,
    },
    modules_required: ["base"],
    per_user_status: {
      inviter: emptyReadinessSnapshot(),
      invitee: null,
    },
    report_run_exists: false,
    report_run_id: null,
    relationship_exists: false,
    relationship_id: null,
    computed_ready: false,
    reason_not_ready: [],
    last_error: null,
  };

  if (!normalizedInvitationId) {
    return {
      ...fallback,
      reason_not_ready: ["invitation_not_found"],
      last_error: "invalid_invitation_id",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return {
      ...fallback,
      reason_not_ready: ["not_authenticated"],
      last_error: "not_authenticated",
    };
  }

  const { data: invitationAccess, error: invitationAccessError } = await supabase
    .from("invitations")
    .select("id")
    .eq("id", normalizedInvitationId)
    .maybeSingle();
  if (invitationAccessError || !invitationAccess?.id) {
    return {
      ...fallback,
      reason_not_ready: ["invitation_not_found"],
      last_error: invitationAccessError?.message ?? "invitation_not_found",
    };
  }

  const privileged = createPrivilegedClient();
  const dataClient = privileged ?? supabase;
  const { data: invitationData, error: invitationError } = await dataClient
    .from("invitations")
    .select(
      "id, inviter_user_id, invitee_user_id, invitee_email, status, created_at, accepted_at, expires_at, revoked_at"
    )
    .eq("id", normalizedInvitationId)
    .maybeSingle();
  if (invitationError || !invitationData) {
    return {
      ...fallback,
      reason_not_ready: ["invitation_not_found"],
      last_error: invitationError?.message ?? "invitation_not_found",
    };
  }

  const invitation = invitationData as InvitationEnsureRow;
  const requiredModules = await getRequiredModulesForInvitation(dataClient, normalizedInvitationId);

  const relevantUsers = [invitation.inviter_user_id, invitation.invitee_user_id].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  const latestSubmittedByUser = await getLatestSubmittedAssessmentsByUserAndModule(dataClient, relevantUsers);
  const inviterAssessments = latestSubmittedByUser.get(invitation.inviter_user_id);
  const inviteeAssessments =
    invitation.invitee_user_id != null
      ? latestSubmittedByUser.get(invitation.invitee_user_id)
      : undefined;
  const assessmentIds = [inviterAssessments, inviteeAssessments]
    .flatMap((byModule) => [byModule?.get("base")?.id, byModule?.get("values")?.id])
    .filter((value): value is string => Boolean(value));
  const answersByAssessmentId = await getAnswerCountByAssessmentId(dataClient, assessmentIds);

  const inviterStatus = buildPerUserReadinessSnapshot(inviterAssessments, answersByAssessmentId);
  const inviteeStatus =
    invitation.invitee_user_id != null
      ? buildPerUserReadinessSnapshot(inviteeAssessments, answersByAssessmentId)
      : null;

  const { data: reportRunData } = await dataClient
    .from("report_runs")
    .select("id, relationship_id")
    .eq("invitation_id", normalizedInvitationId)
    .maybeSingle();
  const reportRunId = parseAcceptableReportRunId(reportRunData as { id?: string } | null);
  const reportRunRow = reportRunData as { id?: string; relationship_id?: string } | null;
  let relationshipId = reportRunRow?.relationship_id ?? null;
  if (!relationshipId && invitation.invitee_user_id) {
    const { data: relationshipData } = await dataClient
      .from("relationships")
      .select("id")
      .or(
        `and(user_a_id.eq.${invitation.inviter_user_id},user_b_id.eq.${invitation.invitee_user_id}),and(user_a_id.eq.${invitation.invitee_user_id},user_b_id.eq.${invitation.inviter_user_id})`
      )
      .maybeSingle();
    relationshipId = (relationshipData as { id?: string } | null)?.id ?? null;
  }

  const reportRunExists = Boolean(reportRunId);
  const computedReady =
    invitation.status === "accepted" &&
    !invitation.revoked_at &&
    !isInvitationExpired(invitation.expires_at) &&
    invitation.invitee_user_id != null &&
    isUserReadyForModules(requiredModules, inviterAssessments) &&
    isUserReadyForModules(requiredModules, inviteeAssessments);

  const reasonNotReady = computedReady && reportRunExists
    ? []
    : buildReadinessReasons({
        invitation,
        requiredModules,
        inviterAssessments,
        inviteeAssessments,
        reportRunExists,
      });
  if (!privileged) {
    reasonNotReady.push("missing_service_role");
  }

  let lastError: string | null = null;
  let resolvedReportRunId = reportRunId;
  if (options?.attemptFinalize && computedReady && !reportRunExists) {
    const finalizeResult = await finalizeInvitationIfReady(normalizedInvitationId);
    if (finalizeResult.ok) {
      resolvedReportRunId = finalizeResult.reportRunId;
      const finalizeNotCalledIndex = reasonNotReady.indexOf("finalize_not_called");
      if (finalizeNotCalledIndex >= 0) {
        reasonNotReady.splice(finalizeNotCalledIndex, 1);
      }
    } else {
      lastError = finalizeResult.detail ?? finalizeResult.reason;
      const normalizedError = (lastError ?? "").toLowerCase();
      if (normalizedError.includes("row-level security")) {
        reasonNotReady.push("rls_blocked_insert");
      } else {
        reasonNotReady.push(`finalize_failed_${finalizeResult.reason}`);
      }
    }
  }

  return {
    invitation: {
      id: invitation.id,
      status: invitation.status,
      inviter_user_id: invitation.inviter_user_id,
      invitee_user_id: invitation.invitee_user_id,
      invitee_email: invitation.invitee_email,
      expires_at: invitation.expires_at,
      revoked_at: invitation.revoked_at,
      accepted_at: invitation.accepted_at,
    },
    modules_required: requiredModules,
    per_user_status: {
      inviter: inviterStatus,
      invitee: inviteeStatus,
    },
    report_run_exists: Boolean(resolvedReportRunId),
    report_run_id: resolvedReportRunId,
    relationship_exists: Boolean(relationshipId),
    relationship_id: relationshipId,
    computed_ready: computedReady,
    reason_not_ready: [...new Set(reasonNotReady)],
    last_error: lastError,
  };
}

export async function getLatestSelfAlignmentReport(): Promise<SelfAlignmentReport | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return null;
  }

  const [baseAssessmentResult, valuesAssessmentResult, profileResult] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, module, submitted_at, created_at")
      .eq("user_id", user.id)
      .eq("module", "base")
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("assessments")
      .select("id, module, submitted_at, created_at")
      .eq("user_id", user.id)
      .eq("module", "values")
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
  ]);

  if (baseAssessmentResult.error || !baseAssessmentResult.data) {
    return null;
  }

  const baseAssessment = baseAssessmentResult.data as SubmittedAssessmentRow;
  const valuesAssessment = valuesAssessmentResult.error
    ? null
    : (valuesAssessmentResult.data as SubmittedAssessmentRow | null);
  const valuesAssessmentId = valuesAssessment?.id ?? null;

  const { data: answerRows, error: answerError } = await supabase
    .from("assessment_answers")
    .select("question_id, choice_value")
    .eq("assessment_id", baseAssessment.id);

  if (answerError || !answerRows || answerRows.length === 0) {
    return null;
  }

  const answers = answerRows as AssessmentAnswerRow[];
  const questionIds = [...new Set(answers.map((row) => row.question_id))];
  const { data: questionRows, error: questionError } = await supabase
    .from("questions")
    .select("id, dimension, category, prompt")
    .in("id", questionIds);

  if (questionError || !questionRows) {
    return null;
  }

  let valuesAnswerRows: AssessmentAnswerRow[] = [];
  if (valuesAssessmentId) {
    const { data: valuesRows, error: valuesRowsError } = await supabase
      .from("assessment_answers")
      .select("question_id, choice_value")
      .eq("assessment_id", valuesAssessmentId);
    if (!valuesRowsError && valuesRows) {
      valuesAnswerRows = valuesRows as AssessmentAnswerRow[];
    }
  }

  let valuesTotal = 0;
  const valuesQuestionIds = [...new Set(valuesAnswerRows.map((row) => row.question_id))];
  let valuesQuestionMetaRows: QuestionMetaRow[] = [];
  if (valuesQuestionIds.length > 0) {
    const { data: valueQuestionMetaRows, error: valueQuestionMetaError } = await supabase
      .from("questions")
      .select("id, category, prompt, dimension")
      .in("id", valuesQuestionIds);
    if (!valueQuestionMetaError && valueQuestionMetaRows) {
      valuesQuestionMetaRows = valueQuestionMetaRows as QuestionMetaRow[];
      assertValuesCategoryContract(valuesQuestionMetaRows, "self_report_values");
      assertValuesQuestionVersionContract(valuesQuestionMetaRows, "self_report_values", { allowMissing: true });
    }
  }
  const valuesTotalActive = await countValuesQuestionsTotal(supabase, true);
  valuesTotal = valuesTotalActive;
  if (process.env.NODE_ENV !== "production") {
    const contractCheck = await countQuestionsByCategories(supabase, [VALUES_QUESTION_CATEGORY], true);
    assertValuesTotalCategoryContract(valuesTotalActive, contractCheck, "self_report_values");
  }

  const valuesQuestionById = new Map(
    valuesQuestionMetaRows.filter((row) => isValuesCategory(row.category)).map((row) => [row.id, row])
  );
  const valuesAnswersForScoring = valuesAnswerRows.filter((row) => valuesQuestionById.has(row.question_id));
  const valuesAnsweredCount = valuesAnswersForScoring.length;
  const valuesModuleStatus: SessionAlignmentReport["valuesModuleStatus"] = !valuesAssessmentId
    ? "not_started"
    : valuesAssessment?.submitted_at && valuesAnsweredCount === valuesTotal
      ? "completed"
      : "in_progress";

  const valuesScoringInput: ValuesAnswerForScoring[] = valuesAnswersForScoring.map((row) => {
    const questionMeta = valuesQuestionById.get(row.question_id);
    return {
      questionId: row.question_id,
      choiceValue: row.choice_value,
      prompt: questionMeta?.prompt ?? null,
      dimension: questionMeta?.dimension ?? null,
    };
  });
  const selfValuesProfile = scoreSelfValuesProfile(valuesScoringInput, valuesTotal);
  const selfValuesScore = computeValuesContinuumScore(selfValuesProfile);
  const valuesModulePreview =
    selfValuesProfile?.summary ??
    (valuesModuleStatus === "completed"
      ? "Dein Werteprofil ist abgeschlossen. Die Interpretation wird aus deinen letzten Antworten abgeleitet."
      : valuesModuleStatus === "in_progress"
        ? "Dein Werteprofil ist in Bearbeitung. Reiche das Add-on ein, um eine vollständige Interpretation zu sehen."
        : "Das Werte-Add-on ist optional. Sobald du es abschließt, erhältst du eine vertiefte Werte-Interpretation.");

  const profileName =
    (profileResult.data as { display_name?: string | null } | null)?.display_name?.trim() || "Du";
  const questionById = new Map((questionRows as QuestionMetaRow[]).map((row) => [row.id, row]));
  assertFounderBaseQuestionVersionContract(
    [...questionById.keys()],
    "self_report_answered_basis_questions",
    { allowMissing: true }
  );
  const [expectedByDimension, baseTotalActive] = await Promise.all([
    getExpectedFounderBaseQuestionCountByDimension(supabase),
    countQuestionsByCategories(supabase, ["basis"], true),
  ]);
  const founderAggregate = aggregateFounderBaseScoresFromAnswers(answers, questionById, expectedByDimension);
  const scoresA = founderAggregate.scores;
  const keyInsights = buildSelfFounderKeyInsights(scoresA);
  const basisTotal =
    baseTotalActive > 0
      ? baseTotalActive
      : Object.values(founderAggregate.expectedByDimension).reduce((sum, value) => sum + value, 0);

  return {
    sessionId: baseAssessment.id,
    createdAt: baseAssessment.created_at,
    participantAId: user.id,
    participantAName: profileName,
    scoresA,
    keyInsights,
    conversationGuideQuestions: [],
    valuesModulePreview,
    valuesModuleStatus,
    valuesAnsweredA: valuesAnsweredCount,
    valuesTotal,
    basisAnsweredA: founderAggregate.answeredQuestionCount,
    basisTotal,
    valuesIdentityCategoryA: selfValuesProfile?.primaryLabel ?? null,
    valuesPrimaryArchetypeIdA: selfValuesProfile?.primaryArchetypeId ?? null,
    valuesScoreA: selfValuesScore,
    requestedScope: valuesModuleStatus === "completed" ? "basis_plus_values" : "basis",
    selfAssessmentMeta: {
      baseAssessmentId: baseAssessment.id,
      valuesAssessmentId,
    },
    selfValuesProfile,
    baseCoverageA: toSelfBaseCoverage(founderAggregate),
    debugA: toSelfParticipantDebugReport(profileName, founderAggregate.debugDimensions),
  };
}

async function ensureReportRunForInvitationWithPrivilegedClient(
  privileged: SupabaseDbClient,
  normalizedInvitationId: string,
  options?: EnsureReportRunPrivilegedOptions
): Promise<EnsureReportRunResult> {
  const requesterUserId = options?.requesterUserId ?? null;
  const skipMembershipCheck = options?.skipMembershipCheck === true;
  const sourceTag = options?.sourceTag?.trim() || "ensureReportRunForInvitation";

  const { data: invitationData, error: invitationError } = await privileged
    .from("invitations")
    .select(
      "id, inviter_user_id, invitee_user_id, invitee_email, status, created_at, accepted_at, expires_at, revoked_at"
    )
    .eq("id", normalizedInvitationId)
    .maybeSingle();
  if (invitationError || !invitationData) {
    return { ok: false, reason: "invitation_not_found" };
  }

  const invitation = invitationData as InvitationEnsureRow;
  if (
    !skipMembershipCheck &&
    requesterUserId &&
    ![invitation.inviter_user_id, invitation.invitee_user_id].includes(requesterUserId)
  ) {
    return { ok: false, reason: "invitation_not_found" };
  }
  if (invitation.revoked_at || invitation.status === "revoked") {
    return { ok: false, reason: "revoked" };
  }
  if (isInvitationExpired(invitation.expires_at)) {
    return { ok: false, reason: "expired" };
  }
  if (invitation.status !== "accepted") {
    return { ok: false, reason: "not_accepted" };
  }
  if (!invitation.invitee_user_id) {
    return { ok: false, reason: "missing_invitee" };
  }

  const { data: existingReportRun } = await privileged
    .from("report_runs")
    .select("id")
    .eq("invitation_id", normalizedInvitationId)
    .maybeSingle();
  const existingReportRunId = parseAcceptableReportRunId(existingReportRun as { id?: string } | null);
  if (existingReportRunId) {
    return { ok: true, reportRunId: existingReportRunId };
  }

  const requiredModules = await getRequiredModulesForInvitation(privileged, normalizedInvitationId);
  const requestedScope: SessionAlignmentReport["requestedScope"] = requiredModules.includes("values")
    ? "basis_plus_values"
    : "basis";

  const inviterBase = await getLatestSubmittedAssessmentForUserModule(
    privileged,
    invitation.inviter_user_id,
    "base"
  );
  const inviteeBase = await getLatestSubmittedAssessmentForUserModule(
    privileged,
    invitation.invitee_user_id,
    "base"
  );
  if (!inviterBase || !inviteeBase) {
    return { ok: false, reason: "waiting_for_answers" };
  }

  const inviterValues = requiredModules.includes("values")
    ? await getLatestSubmittedAssessmentForUserModule(privileged, invitation.inviter_user_id, "values")
    : null;
  const inviteeValues = requiredModules.includes("values")
    ? await getLatestSubmittedAssessmentForUserModule(privileged, invitation.invitee_user_id, "values")
    : null;
  if (requiredModules.includes("values") && (!inviterValues || !inviteeValues)) {
    return { ok: false, reason: "waiting_for_answers" };
  }

  const [inviterBaseAnswers, inviteeBaseAnswers] = await Promise.all([
    getAssessmentAnswers(privileged, inviterBase.id),
    getAssessmentAnswers(privileged, inviteeBase.id),
  ]);
  const baseTotalFromDb = await countQuestionsByCategories(privileged, ["basis"], true);
  const basisTotal = baseTotalFromDb > 0 ? baseTotalFromDb : 36;
  const expectedByDimension = await getExpectedBaseQuestionCountByDimension(privileged);

  const baseQuestionMetaById = await getQuestionMetaMap(privileged, [
    ...inviterBaseAnswers.map((row) => row.question_id),
    ...inviteeBaseAnswers.map((row) => row.question_id),
  ]);
  assertFounderBaseQuestionVersionContract(
    [...baseQuestionMetaById.keys()],
    "ensure_report_run_answered_basis_questions",
    { allowMissing: true }
  );
  const inviterBaseScores = aggregateBaseScoresFromAnswers(
    inviterBaseAnswers,
    baseQuestionMetaById,
    expectedByDimension
  );
  const inviteeBaseScores = aggregateBaseScoresFromAnswers(
    inviteeBaseAnswers,
    baseQuestionMetaById,
    expectedByDimension
  );
  const founderScoringInput = {
    personA: transformFounderScoringAnswers(inviterBaseAnswers, baseQuestionMetaById),
    personB: transformFounderScoringAnswers(inviteeBaseAnswers, baseQuestionMetaById),
  };
  const founderScoring = scoreFounderAlignment(founderScoringInput);
  const founderReport = buildFounderAlignmentReport({
    scoringResult: founderScoring,
    teamContext: normalizeTeamContext(invitation.team_context),
  });

  let valuesAssessmentIdA: string | null = null;
  let valuesAssessmentIdB: string | null = null;
  let valuesAnsweredA = 0;
  let valuesAnsweredB = 0;
  let valuesTotal = 0;
  let valuesIdentityCategoryA: string | null = null;
  let valuesIdentityCategoryB: string | null = null;
  let valuesPrimaryArchetypeIdA: SessionAlignmentReport["valuesPrimaryArchetypeIdA"] = null;
  let valuesPrimaryArchetypeIdB: SessionAlignmentReport["valuesPrimaryArchetypeIdB"] = null;
  let valuesScoreA: number | null = null;
  let valuesScoreB: number | null = null;

  if (requiredModules.includes("values") && inviterValues && inviteeValues) {
    valuesAssessmentIdA = inviterValues.id;
    valuesAssessmentIdB = inviteeValues.id;

    const [rawValuesAnswersA, rawValuesAnswersB] = await Promise.all([
      getAssessmentAnswers(privileged, inviterValues.id),
      getAssessmentAnswers(privileged, inviteeValues.id),
    ]);

    const valuesTotalActive = await countValuesQuestionsTotal(privileged, true);
    valuesTotal = valuesTotalActive;
    if (process.env.NODE_ENV !== "production") {
      const contractCheck = await countQuestionsByCategories(privileged, [VALUES_QUESTION_CATEGORY], true);
      assertValuesTotalCategoryContract(valuesTotalActive, contractCheck, "ensure_report_run");
    }

    const valuesQuestionMetaById = await getQuestionMetaMap(privileged, [
      ...rawValuesAnswersA.map((row) => row.question_id),
      ...rawValuesAnswersB.map((row) => row.question_id),
    ]);
    const valuesQuestionMetaRows = [...valuesQuestionMetaById.values()];
    assertValuesCategoryContract(valuesQuestionMetaRows, "ensure_report_run_values");
    assertValuesQuestionVersionContract(valuesQuestionMetaRows, "ensure_report_run_values", { allowMissing: true });
    const valuesAnswersA = rawValuesAnswersA.filter((row) =>
      isValuesCategory(valuesQuestionMetaById.get(row.question_id)?.category)
    );
    const valuesAnswersB = rawValuesAnswersB.filter((row) =>
      isValuesCategory(valuesQuestionMetaById.get(row.question_id)?.category)
    );
    valuesAnsweredA = valuesAnswersA.length;
    valuesAnsweredB = valuesAnswersB.length;

    const valuesInputA: ValuesAnswerForScoring[] = valuesAnswersA.map((row) => {
      const meta = valuesQuestionMetaById.get(row.question_id);
      return {
        questionId: row.question_id,
        choiceValue: row.choice_value,
        prompt: meta?.prompt ?? null,
        dimension: meta?.dimension ?? null,
      };
    });
    const valuesInputB: ValuesAnswerForScoring[] = valuesAnswersB.map((row) => {
      const meta = valuesQuestionMetaById.get(row.question_id);
      return {
        questionId: row.question_id,
        choiceValue: row.choice_value,
        prompt: meta?.prompt ?? null,
        dimension: meta?.dimension ?? null,
      };
    });
    const valuesProfileA = scoreSelfValuesProfile(valuesInputA, valuesTotal);
    const valuesProfileB = scoreSelfValuesProfile(valuesInputB, valuesTotal);
    valuesIdentityCategoryA = valuesProfileA?.primaryLabel ?? null;
    valuesIdentityCategoryB = valuesProfileB?.primaryLabel ?? null;
    valuesPrimaryArchetypeIdA = valuesProfileA?.primaryArchetypeId ?? null;
    valuesPrimaryArchetypeIdB = valuesProfileB?.primaryArchetypeId ?? null;
    valuesScoreA = computeValuesContinuumScore(valuesProfileA);
    valuesScoreB = computeValuesContinuumScore(valuesProfileB);
  }

  const { data: profileRows } = await privileged
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", [invitation.inviter_user_id, invitation.invitee_user_id]);
  const profileByUserId = new Map(
    ((profileRows ?? []) as ProfileDisplayRow[]).map((row) => [row.user_id, row.display_name?.trim() ?? ""])
  );
  const participantAName = profileByUserId.get(invitation.inviter_user_id) || "Person A";
  const participantBName = profileByUserId.get(invitation.invitee_user_id) || "Person B";

  const baseReport: SessionAlignmentReport = {
    sessionId: normalizedInvitationId,
    createdAt: new Date().toISOString(),
    personBInvitedAt: invitation.created_at,
    personACompletedAt: inviterBase.submitted_at ?? inviterBase.created_at,
    personBCompletedAt: inviteeBase.submitted_at ?? inviteeBase.created_at,
    participantAId: invitation.inviter_user_id,
    participantBId: invitation.invitee_user_id,
    participantAName,
    participantBName,
    personBStatus: "match_ready",
    personACompleted: true,
    personBCompleted: true,
    comparisonEnabled: true,
    scoresA: inviterBaseScores.scores,
    scoresB: inviteeBaseScores.scores,
    keyInsights: [],
    commonTendencies: [],
    frictionPoints: [],
    conversationGuideQuestions: [],
    valuesModulePreview: "",
    valuesModuleStatus: requiredModules.includes("values") ? "completed" : "not_started",
    valuesAnsweredA,
    valuesAnsweredB,
    valuesTotal,
    basisAnsweredA: inviterBaseAnswers.length,
    basisAnsweredB: inviteeBaseAnswers.length,
    basisTotal,
    valuesAlignmentPercent: null,
    valuesIdentityCategoryA,
    valuesIdentityCategoryB,
    valuesPrimaryArchetypeIdA,
    valuesPrimaryArchetypeIdB,
    valuesScoreA,
    valuesScoreB,
    requestedScope,
    inviteConsentCaptured: Boolean(invitation.accepted_at),
    baseCoverageA: {
      answeredNumericByDimension: inviterBaseScores.answeredNumericByDimension,
      expectedByDimension: inviterBaseScores.expectedByDimension,
      numericAnsweredTotal: inviterBaseScores.numericAnsweredTotal,
      expectedTotal: inviterBaseScores.expectedTotal,
      baseCoveragePercent: inviterBaseScores.baseCoveragePercent,
    },
    baseCoverageB: {
      answeredNumericByDimension: inviteeBaseScores.answeredNumericByDimension,
      expectedByDimension: inviteeBaseScores.expectedByDimension,
      numericAnsweredTotal: inviteeBaseScores.numericAnsweredTotal,
      expectedTotal: inviteeBaseScores.expectedTotal,
      baseCoveragePercent: inviteeBaseScores.baseCoveragePercent,
    },
    debugA: {
      participantName: participantAName,
      dimensions: inviterBaseScores.debugDimensions,
    },
    debugB: {
      participantName: participantBName,
      dimensions: inviteeBaseScores.debugDimensions,
    },
  };

  const profileA = buildProfileResultFromSession(baseReport, "A");
  const profileB = buildProfileResultFromSession(baseReport, "B");
  const compareJson = generateCompareReport(profileA, profileB);
  const keyInsights: KeyInsight[] = compareJson.keyInsights.slice(0, 3).map((insight, index) => ({
    dimension: insight.dimension,
    title: insight.title,
    text: insight.text,
    priority: index + 1,
  }));

  const finalReport: SessionAlignmentReport = {
    ...baseReport,
    keyInsights,
    commonTendencies: compareJson.executiveSummary.topMatches,
    frictionPoints: compareJson.executiveSummary.topTensions,
    conversationGuideQuestions: compareJson.conversationGuide,
    valuesModulePreview: compareJson.valuesModule.text,
    valuesAlignmentPercent: compareJson.valuesModule.alignmentPercent,
  };

  const inputAssessmentIds = [inviterBase.id, inviteeBase.id, valuesAssessmentIdA, valuesAssessmentIdB].filter(
    (value): value is string => Boolean(value)
  );

  const payload = {
    reportType: "founder_alignment_v1" as const,
    report: finalReport,
    compareJson,
    founderReport,
    founderScoring,
    teamContext: normalizeTeamContext(invitation.team_context),
    modules: ensureBaseModule(requiredModules),
    inputAssessmentIds: [...new Set(inputAssessmentIds)],
    generatedAt: new Date().toISOString(),
    source: sourceTag,
  };

  const { data: finalizeData, error: finalizeError } = await privileged.rpc(
    "finalize_invitation_if_ready",
    {
      p_invitation_id: normalizedInvitationId,
      p_payload: payload,
    }
  );

  if (finalizeError) {
    console.error("ensureReportRunForInvitation finalize rpc failed", {
      invitationId: normalizedInvitationId,
      error: finalizeError.message,
    });
    const { data: existingAfterError } = await privileged
      .from("report_runs")
      .select("id")
      .eq("invitation_id", normalizedInvitationId)
      .maybeSingle();
    const fallbackId = parseAcceptableReportRunId(existingAfterError as { id?: string } | null);
    if (fallbackId) {
      return { ok: true, reportRunId: fallbackId };
    }
    return { ok: false, reason: "insert_failed", detail: finalizeError.message };
  }

  const finalized = parseFinalizeRpcRow(finalizeData);
  if (!finalized) {
    console.error("ensureReportRunForInvitation finalize rpc returned empty payload", {
      invitationId: normalizedInvitationId,
    });
    return { ok: false, reason: "insert_failed", detail: "finalize_rpc_empty" };
  }
  if (!finalized.ready) {
    return {
      ok: false,
      reason: mapFinalizeReasonToEnsureReason(finalized.reason),
      detail: finalized.reason ?? undefined,
    };
  }

  const finalizedId = parseAcceptableReportRunId({
    id: finalized.report_run_id ?? undefined,
  });
  if (finalizedId) {
    return { ok: true, reportRunId: finalizedId };
  }

  const { data: existingAfterFinalize } = await privileged
    .from("report_runs")
    .select("id")
    .eq("invitation_id", normalizedInvitationId)
    .maybeSingle();
  const reportRunId = parseAcceptableReportRunId(existingAfterFinalize as { id?: string } | null);
  if (reportRunId) {
    return { ok: true, reportRunId };
  }

  console.error("ensureReportRunForInvitation report run missing after finalize", {
    invitationId: normalizedInvitationId,
  });
  return { ok: false, reason: "insert_failed", detail: "report_run_not_found_after_finalize" };
}

export async function ensureReportRunForInvitation(invitationId: string): Promise<EnsureReportRunResult> {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId) {
    return { ok: false, reason: "invitation_not_found" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { ok: false, reason: "not_authenticated" };
  }

  const privileged = createPrivilegedClient();
  if (!privileged) {
    console.error("ensureReportRunForInvitation missing service role configuration", {
      invitationId: normalizedInvitationId,
    });
    return { ok: false, reason: "missing_service_role" };
  }

  return ensureReportRunForInvitationWithPrivilegedClient(privileged, normalizedInvitationId, {
    requesterUserId: user.id,
    skipMembershipCheck: false,
    sourceTag: "ensureReportRunForInvitation",
  });
}

export async function backfillReportRunsForAcceptedInvitations(options?: {
  limit?: number;
  maxDurationMs?: number;
}): Promise<BackfillReportRunsResult> {
  const privileged = createPrivilegedClient();
  if (!privileged) {
    return { ok: false, reason: "missing_service_role" };
  }

  const target = Math.max(1, Math.min(Number(options?.limit ?? 50) || 50, 500));
  const maxDurationMs = Math.max(5_000, Math.min(Number(options?.maxDurationMs ?? 20_000) || 20_000, 120_000));
  const startedAt = Date.now();
  let timedOut = false;
  const scanBatchSize = 200;
  let scannedAccepted = 0;
  let offset = 0;
  const candidateIds: string[] = [];

  while (candidateIds.length < target) {
    if (Date.now() - startedAt >= maxDurationMs) {
      timedOut = true;
      break;
    }

    const { data: invitationRows, error: invitationError } = await privileged
      .from("invitations")
      .select("id")
      .eq("status", "accepted")
      .order("accepted_at", { ascending: false })
      .range(offset, offset + scanBatchSize - 1);

    if (invitationError) {
      return { ok: false, reason: "query_failed", detail: invitationError.message };
    }

    const rows = (invitationRows ?? []) as BackfillInvitationIdRow[];
    if (rows.length === 0) {
      break;
    }

    scannedAccepted += rows.length;
    offset += rows.length;

    const invitationIds = rows.map((row) => row.id).filter(Boolean);
    if (invitationIds.length === 0) {
      if (rows.length < scanBatchSize) break;
      continue;
    }

    const { data: reportRows, error: reportError } = await privileged
      .from("report_runs")
      .select("invitation_id")
      .in("invitation_id", invitationIds);
    if (reportError) {
      return { ok: false, reason: "query_failed", detail: reportError.message };
    }

    const reportRunByInvitationId = new Set(
      ((reportRows ?? []) as ReportRunInvitationRow[]).map((row) => row.invitation_id)
    );

    for (const invitationId of invitationIds) {
      if (!reportRunByInvitationId.has(invitationId)) {
        candidateIds.push(invitationId);
        if (candidateIds.length >= target) break;
      }
    }

    if (rows.length < scanBatchSize) {
      break;
    }
  }

  const items: BackfillReportRunItem[] = [];
  let created = 0;
  let waitingForAnswers = 0;
  let skipped = 0;
  let failed = 0;

  for (const invitationId of candidateIds) {
    if (Date.now() - startedAt >= maxDurationMs) {
      timedOut = true;
      break;
    }

    const result = await ensureReportRunForInvitationWithPrivilegedClient(privileged, invitationId, {
      skipMembershipCheck: true,
      sourceTag: "maintenance_backfill",
    });

    if (result.ok) {
      created += 1;
      items.push({
        invitationId,
        status: "created",
        reportRunId: result.reportRunId,
      });
      continue;
    }

    if (result.reason === "waiting_for_answers") {
      waitingForAnswers += 1;
      items.push({
        invitationId,
        status: "waiting_for_answers",
        reportRunId: null,
        reason: result.reason,
      });
      continue;
    }

    if (
      result.reason === "not_accepted" ||
      result.reason === "expired" ||
      result.reason === "revoked" ||
      result.reason === "missing_invitee" ||
      result.reason === "invitation_not_found"
    ) {
      skipped += 1;
      items.push({
        invitationId,
        status: "skipped",
        reportRunId: null,
        reason: result.reason,
        detail: result.detail,
      });
      continue;
    }

    failed += 1;
    items.push({
      invitationId,
      status: "failed",
      reportRunId: null,
      reason: result.reason,
      detail: result.detail,
    });
  }

  return {
    ok: true,
    timedOut,
    maxDurationMs,
    scannedAccepted,
    candidatesWithoutReportRun: candidateIds.length,
    processed: items.length,
    remainingCandidates: Math.max(0, candidateIds.length - items.length),
    created,
    waitingForAnswers,
    skipped,
    failed,
    items,
  };
}

export async function finalizeInvitationIfReady(invitationId: string): Promise<EnsureReportRunResult> {
  return ensureReportRunForInvitation(invitationId);
}

function asSessionAlignmentReport(value: unknown): SessionAlignmentReport | null {
  const record = toRecord(value);
  if (!record) return null;
  const scoresA = toRecord(record.scoresA);
  if (!scoresA) return null;
  return value as SessionAlignmentReport;
}

function asCompareReportJson(value: unknown): CompareReportJson | null {
  const record = toRecord(value);
  if (!record) return null;
  if (!Array.isArray(record.sections)) return null;
  return value as CompareReportJson;
}

function asFounderAlignmentReport(value: unknown): FounderAlignmentReport | null {
  const record = toRecord(value);
  if (!record) return null;
  if (!record.executiveSummary || !record.sections) return null;
  return value as FounderAlignmentReport;
}

function asFounderScoringResult(value: unknown): TeamScoringResult | null {
  const record = toRecord(value);
  if (!record) return null;
  if (!Array.isArray(record.dimensions)) return null;
  return value as TeamScoringResult;
}

function fallbackReport(invitationId: string, createdAt: string, payload: Record<string, unknown> | null) {
  const participantAName =
    typeof payload?.participantAName === "string" && payload.participantAName.trim().length > 0
      ? payload.participantAName
      : "Person A";
  const participantBName =
    typeof payload?.participantBName === "string" && payload.participantBName.trim().length > 0
      ? payload.participantBName
      : "Person B";

  const report: SessionAlignmentReport = {
    sessionId: invitationId,
    createdAt,
    personBInvitedAt: null,
    personACompletedAt: null,
    personBCompletedAt: null,
    participantAId: null,
    participantBId: null,
    participantAName,
    participantBName,
    personBStatus: "match_ready",
    personACompleted: false,
    personBCompleted: false,
    comparisonEnabled: true,
    scoresA: emptySeries(),
    scoresB: emptySeries(),
    keyInsights: [],
    commonTendencies: [],
    frictionPoints: [],
    conversationGuideQuestions: [],
    valuesModulePreview: "",
    valuesModuleStatus: "not_started",
    valuesAnsweredA: 0,
    valuesAnsweredB: 0,
    valuesTotal: 0,
    basisAnsweredA: 0,
    basisAnsweredB: 0,
    basisTotal: 0,
    valuesAlignmentPercent: null,
    valuesIdentityCategoryA: null,
    valuesIdentityCategoryB: null,
    valuesPrimaryArchetypeIdA: null,
    valuesPrimaryArchetypeIdB: null,
    valuesScoreA: null,
    valuesScoreB: null,
    requestedScope: "basis",
    inviteConsentCaptured: false,
    debugA: { participantName: participantAName, dimensions: [] },
    debugB: { participantName: participantBName, dimensions: [] },
  };

  return report;
}

function mapReportRunRow(row: ReportRunRow): ReportRunSnapshot {
  const payload = toRecord(row.payload);
  const nestedReport = asSessionAlignmentReport(payload?.report);
  const directReport = asSessionAlignmentReport(payload);
  const report = nestedReport ?? directReport ?? fallbackReport(row.invitation_id, row.created_at, payload);

  const nestedCompare = asCompareReportJson(payload?.compareJson);
  const directCompare = asCompareReportJson(payload?.compare_report);
  const founderReport = asFounderAlignmentReport(payload?.founderReport);
  const founderScoring = asFounderScoringResult(payload?.founderScoring);
  const reportType =
    payload?.reportType === "founder_alignment_v1" ? "founder_alignment_v1" : "classic_compare_v1";

  return {
    id: row.id,
    invitationId: row.invitation_id,
    relationshipId: row.relationship_id,
    createdAt: row.created_at,
    modules: Array.isArray(row.modules) ? row.modules : [],
    inputAssessmentIds: Array.isArray(row.input_assessment_ids) ? row.input_assessment_ids : [],
    reportType,
    report,
    compareJson: nestedCompare ?? directCompare ?? null,
    founderReport,
    founderScoring,
    payload,
  };
}

async function loadReportRunByInvitationId(invitationId: string): Promise<ReportRunSnapshot | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_runs")
    .select("id, invitation_id, relationship_id, modules, input_assessment_ids, payload, created_at")
    .eq("invitation_id", invitationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapReportRunRow(data as ReportRunRow);
}

export async function getPrivilegedReportRunSnapshotForInvitation(
  invitationId: string
): Promise<ReportRunSnapshot | null> {
  const normalized = invitationId.trim();
  if (!normalized) {
    return null;
  }

  const privileged = createPrivilegedClient();
  if (!privileged) {
    return null;
  }

  const { data, error } = await privileged
    .from("report_runs")
    .select("id, invitation_id, relationship_id, modules, input_assessment_ids, payload, created_at")
    .eq("invitation_id", normalized)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapReportRunRow(data as ReportRunRow);
}

async function loadReportRunById(runId: string): Promise<ReportRunSnapshot | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_runs")
    .select("id, invitation_id, relationship_id, modules, input_assessment_ids, payload, created_at")
    .eq("id", runId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapReportRunRow(data as ReportRunRow);
}

export async function getReportRunSnapshotForSession(sessionId: string): Promise<ReportRunSnapshot | null> {
  const normalized = sessionId.trim();
  if (!normalized) {
    return null;
  }

  const byInvitation = await loadReportRunByInvitationId(normalized);
  if (byInvitation) {
    return byInvitation;
  }

  return loadReportRunById(normalized);
}

export async function getSessionAlignmentReport(sessionId: string): Promise<SessionAlignmentReport | null> {
  const snapshot = await getReportRunSnapshotForSession(sessionId);
  return snapshot?.report ?? null;
}

export async function getExecutiveSummaryTextByAlignment(
  scoresA: RadarSeries,
  scoresB: RadarSeries
): Promise<string> {
  const deltas = REPORT_DIMENSIONS.map((dimension) => {
    const left = scoresA[dimension] ?? 0;
    const right = scoresB[dimension] ?? 0;
    return { dimension, delta: Math.abs(left - right) };
  }).sort((a, b) => b.delta - a.delta);

  const strongest = deltas[0];
  if (!strongest || strongest.delta < 1.0) {
    return "Das Profil zeigt aktuell eine stabile Grundpassung mit moderaten Unterschieden.";
  }

  return `Die stärkste Differenz liegt aktuell bei ${strongest.dimension}.`; 
}

export async function generateCompareReportForSession(sessionId: string): Promise<CompareReportJson | null> {
  const snapshot = await getReportRunSnapshotForSession(sessionId);
  return snapshot?.compareJson ?? null;
}

export async function createReportRunOnCompletion(sessionId: string): Promise<ReportRunSnapshot | null> {
  const result = await ensureReportRunForInvitation(sessionId);
  if (!result.ok) {
    return getReportRunSnapshotForSession(sessionId);
  }
  return getReportRunSnapshotForSession(result.reportRunId);
}
