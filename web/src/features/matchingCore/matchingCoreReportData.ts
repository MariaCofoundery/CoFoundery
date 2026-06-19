import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { MatchingSessionModule } from "@/features/matchingCore/matchingCoreTypes";
import { assertFounderBaseQuestionVersionContract } from "@/features/scoring/founderBaseQuestionMeta";
import {
  type AssessmentAnswerRow,
  type QuestionMetaRow,
} from "@/features/reporting/base_scoring";
import {
  buildFounderAlignmentReportPayload,
  type FounderAlignmentReportPayload,
} from "@/features/reporting/founderAlignmentReportPayload";
import {
  isMatchingReportRunPayload,
  type MatchingReportRun,
  type MatchingReportRunSummary,
} from "@/features/matchingCore/matchingCoreReportTypes";

const MATCHING_REPORT_RUN_COLUMNS = [
  "id",
  "matching_session_id",
  "modules",
  "input_assessment_ids",
  "payload",
  "created_by_user_id",
  "created_at",
].join(", ");

type SupabaseError = {
  message?: string | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseLikeClient = Pick<SupabaseServerClient, "from">;
type SupabaseDbClient = SupabaseLikeClient & SupabaseClient;

type MatchingReportRunRow = {
  id: string;
  matching_session_id: string;
  modules: string[] | null;
  input_assessment_ids: string[] | null;
  payload: unknown;
  created_by_user_id: string;
  created_at: string;
};

type MatchingReportRpcRow = {
  matching_report_run_id: string;
  status: string;
};

type MatchingReportSessionRow = {
  id: string;
  status: string;
};

type MatchingReportParticipantRow = {
  user_id: string;
  status: string;
  role: string;
  created_at: string;
};

type MatchingReportModuleRow = {
  module: string;
  required: boolean;
};

type MatchingReportInputRow = {
  user_id: string;
  module: string;
  assessment_id: string;
};

type SubmittedAssessmentRow = {
  id: string;
  user_id: string;
  module: string;
  submitted_at: string | null;
  created_at: string;
};

type DiscoveryReportProfileRow = {
  user_id: string;
  display_name: string | null;
};

function getErrorMessage(error: SupabaseError | null | undefined, fallback: string) {
  return error?.message ?? fallback;
}

function createPrivilegedClient(): SupabaseDbClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as SupabaseDbClient;
}

function assertUserId(userId: string) {
  const normalized = userId.trim();
  if (!normalized) {
    throw new Error("matching_report_missing_user_id");
  }
  return normalized;
}

function assertMatchingSessionId(matchingSessionId: string) {
  const normalized = matchingSessionId.trim();
  if (!normalized) {
    throw new Error("matching_report_missing_matching_session_id");
  }
  return normalized;
}

function mapMatchingReportRun(row: MatchingReportRunRow): MatchingReportRun {
  if (!isMatchingReportRunPayload(row.payload)) {
    throw new Error("matching_report_payload_invalid");
  }

  return {
    id: row.id,
    matchingSessionId: row.matching_session_id,
    modules: ((row.modules ?? []) as MatchingSessionModule[]).filter(
      (module) => module === "base" || module === "values"
    ),
    inputAssessmentIds: row.input_assessment_ids ?? [],
    payload: row.payload,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
  };
}

export async function getMatchingReportRunForSession(
  matchingSessionId: string,
  userId: string
): Promise<MatchingReportRunSummary | null> {
  const normalizedSessionId = assertMatchingSessionId(matchingSessionId);
  const normalizedUserId = assertUserId(userId);
  const supabase = await createClient();

  const { data: isParticipant, error: participantError } = await supabase.rpc(
    "is_matching_session_active_participant",
    {
      p_matching_session_id: normalizedSessionId,
      p_user_id: normalizedUserId,
    }
  );

  if (participantError) {
    throw new Error(getErrorMessage(participantError, "matching_report_participant_check_failed"));
  }

  if (isParticipant !== true) {
    return null;
  }

  const { data, error } = await supabase
    .from("matching_report_runs")
    .select(MATCHING_REPORT_RUN_COLUMNS)
    .eq("matching_session_id", normalizedSessionId)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error, "matching_report_load_failed"));
  }

  if (!data) {
    return null;
  }

  return {
    reportRun: mapMatchingReportRun(data as unknown as MatchingReportRunRow),
  };
}

async function loadReportSessionSnapshot(sessionId: string, client: SupabaseLikeClient) {
  const { data: sessionRow, error: sessionError } = await client
    .from("matching_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError || !sessionRow) {
    throw new Error(getErrorMessage(sessionError, "matching_report_session_unavailable"));
  }

  const { data: participantRows, error: participantError } = await client
    .from("matching_session_participants")
    .select("user_id, status, role, created_at")
    .eq("matching_session_id", sessionId)
    .order("created_at", { ascending: true });

  if (participantError) {
    throw new Error(getErrorMessage(participantError, "matching_report_participants_load_failed"));
  }

  const { data: moduleRows, error: moduleError } = await client
    .from("matching_session_modules")
    .select("module, required")
    .eq("matching_session_id", sessionId)
    .order("module", { ascending: true });

  if (moduleError) {
    throw new Error(getErrorMessage(moduleError, "matching_report_modules_load_failed"));
  }

  const { data: inputRows, error: inputError } = await client
    .from("matching_session_inputs")
    .select("user_id, module, assessment_id")
    .eq("matching_session_id", sessionId)
    .order("module", { ascending: true });

  if (inputError) {
    throw new Error(getErrorMessage(inputError, "matching_report_inputs_load_failed"));
  }

  return {
    session: sessionRow as MatchingReportSessionRow,
    participants: (participantRows ?? []) as MatchingReportParticipantRow[],
    modules: (moduleRows ?? []) as MatchingReportModuleRow[],
    inputs: (inputRows ?? []) as MatchingReportInputRow[],
  };
}

async function loadSubmittedAssessmentsById(assessmentIds: string[], client: SupabaseLikeClient) {
  const uniqueAssessmentIds = [...new Set(assessmentIds.filter(Boolean))];
  if (uniqueAssessmentIds.length === 0) {
    return new Map<string, SubmittedAssessmentRow>();
  }

  const { data, error } = await client
    .from("assessments")
    .select("id, user_id, module, submitted_at, created_at")
    .in("id", uniqueAssessmentIds);

  if (error) {
    throw new Error(getErrorMessage(error, "matching_report_assessments_load_failed"));
  }

  return new Map(
    ((data ?? []) as SubmittedAssessmentRow[]).map((row) => [row.id, row])
  );
}

async function loadAssessmentAnswers(client: SupabaseLikeClient, assessmentId: string) {
  const { data, error } = await client
    .from("assessment_answers")
    .select("question_id, choice_value")
    .eq("assessment_id", assessmentId);

  if (error) {
    throw new Error(getErrorMessage(error, "matching_report_answers_load_failed"));
  }

  return (data ?? []) as AssessmentAnswerRow[];
}

async function loadQuestionMetaMap(client: SupabaseLikeClient, questionIds: string[]) {
  const uniqueQuestionIds = [...new Set(questionIds.filter(Boolean))];
  if (uniqueQuestionIds.length === 0) {
    return new Map<string, QuestionMetaRow>();
  }

  const { data, error } = await client
    .from("questions")
    .select("id, dimension, category, prompt")
    .in("id", uniqueQuestionIds);

  if (error) {
    throw new Error(getErrorMessage(error, "matching_report_questions_load_failed"));
  }

  return new Map(((data ?? []) as QuestionMetaRow[]).map((row) => [row.id, row]));
}

async function loadDiscoveryDisplayNames(client: SupabaseLikeClient, userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await client
    .from("founder_discovery_profiles")
    .select("user_id, display_name")
    .in("user_id", uniqueUserIds)
    .eq("status", "active");

  if (error) {
    throw new Error(getErrorMessage(error, "matching_report_profiles_load_failed"));
  }

  return new Map(
    ((data ?? []) as DiscoveryReportProfileRow[]).map((row) => [
      row.user_id,
      row.display_name?.trim() ?? "",
    ])
  );
}

function requiredInputStatus(params: {
  activeParticipantUserIds: string[];
  requiredModules: MatchingSessionModule[];
  inputs: MatchingReportInputRow[];
}) {
  const inputKeys = new Set(params.inputs.map((input) => `${input.user_id}:${input.module}`));
  const complete = params.activeParticipantUserIds.every((userId) =>
    params.requiredModules.every((module) => inputKeys.has(`${userId}:${module}`))
  );
  return complete ? "complete" : "missing";
}

function parseRpcReportRunId(value: unknown): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") {
    return null;
  }

  const typed = row as Partial<MatchingReportRpcRow>;
  return typeof typed.matching_report_run_id === "string" ? typed.matching_report_run_id : null;
}

async function buildSessionFounderAlignmentPayload(params: {
  matchingSessionId: string;
  userId: string;
  client: SupabaseLikeClient;
}): Promise<{
  payload: FounderAlignmentReportPayload;
  modules: MatchingSessionModule[];
  inputAssessmentIds: string[];
}> {
  const snapshot = await loadReportSessionSnapshot(params.matchingSessionId, params.client);
  const activeParticipants = snapshot.participants.filter(
    (participant) => participant.status === "active" && participant.role === "founder"
  );
  const currentUserIsParticipant = activeParticipants.some(
    (participant) => participant.user_id === params.userId
  );
  if (!currentUserIsParticipant) {
    throw new Error("matching_report_session_unavailable");
  }
  if (snapshot.session.status !== "ready_for_report") {
    throw new Error("matching_report_session_not_ready");
  }
  if (activeParticipants.length !== 2) {
    throw new Error("matching_report_participants_invalid");
  }

  const modules = snapshot.modules
    .map((row) => row.module)
    .filter((module): module is MatchingSessionModule => module === "base" || module === "values");
  const requiredModules = snapshot.modules
    .filter((row) => row.required)
    .map((row) => row.module)
    .filter((module): module is MatchingSessionModule => module === "base" || module === "values");
  if (!modules.includes("base") || requiredModules.length === 0) {
    throw new Error("matching_report_modules_invalid");
  }
  if (modules.includes("values")) {
    throw new Error("matching_report_values_not_supported");
  }
  if (
    requiredInputStatus({
      activeParticipantUserIds: activeParticipants.map((participant) => participant.user_id),
      requiredModules,
      inputs: snapshot.inputs,
    }) !== "complete"
  ) {
    throw new Error("matching_report_required_inputs_missing");
  }

  const inputAssessmentIds = snapshot.inputs.map((input) => input.assessment_id);
  const assessmentsById = await loadSubmittedAssessmentsById(inputAssessmentIds, params.client);
  const [participantA, participantB] = activeParticipants;
  const participantABaseInput = snapshot.inputs.find(
    (input) => input.user_id === participantA.user_id && input.module === "base"
  );
  const participantBBaseInput = snapshot.inputs.find(
    (input) => input.user_id === participantB.user_id && input.module === "base"
  );
  const participantABase = participantABaseInput
    ? assessmentsById.get(participantABaseInput.assessment_id)
    : null;
  const participantBBase = participantBBaseInput
    ? assessmentsById.get(participantBBaseInput.assessment_id)
    : null;

  if (
    !participantABase ||
    !participantBBase ||
    participantABase.user_id !== participantA.user_id ||
    participantBBase.user_id !== participantB.user_id ||
    participantABase.module !== "base" ||
    participantBBase.module !== "base" ||
    !participantABase.submitted_at ||
    !participantBBase.submitted_at
  ) {
    throw new Error("matching_report_required_inputs_missing");
  }

  const [baseAnswersA, baseAnswersB] = await Promise.all([
    loadAssessmentAnswers(params.client, participantABase.id),
    loadAssessmentAnswers(params.client, participantBBase.id),
  ]);
  const baseQuestionMetaById = await loadQuestionMetaMap(params.client, [
    ...baseAnswersA.map((row) => row.question_id),
    ...baseAnswersB.map((row) => row.question_id),
  ]);
  assertFounderBaseQuestionVersionContract(
    [...baseQuestionMetaById.keys()],
    "matching_session_report_answered_basis_questions",
    { allowMissing: true }
  );

  const displayNamesByUserId = await loadDiscoveryDisplayNames(
    params.client,
    activeParticipants.map((participant) => participant.user_id)
  );

  return buildFounderAlignmentReportPayload({
    sessionId: params.matchingSessionId,
    participantA: {
      userId: participantA.user_id,
      displayName: displayNamesByUserId.get(participantA.user_id) || "Person A",
      baseAssessment: {
        id: participantABase.id,
        submittedAt: participantABase.submitted_at,
        createdAt: participantABase.created_at,
      },
      baseAnswers: baseAnswersA,
    },
    participantB: {
      userId: participantB.user_id,
      displayName: displayNamesByUserId.get(participantB.user_id) || "Person B",
      baseAssessment: {
        id: participantBBase.id,
        submittedAt: participantBBase.submitted_at,
        createdAt: participantBBase.created_at,
      },
      baseAnswers: baseAnswersB,
    },
    baseQuestionMetaById,
    modules,
    teamContext: "pre_founder",
    personBInvitedAt: null,
    inviteConsentCaptured: true,
    source: "matching_session_report",
  });
}

export async function createMatchingReportRunFromSession(params: {
  matchingSessionId: string;
  userId: string;
}): Promise<MatchingReportRunSummary> {
  const normalizedSessionId = assertMatchingSessionId(params.matchingSessionId);
  const normalizedUserId = assertUserId(params.userId);
  const existing = await getMatchingReportRunForSession(normalizedSessionId, normalizedUserId);
  if (existing) {
    return existing;
  }

  const privileged = createPrivilegedClient();
  if (!privileged) {
    throw new Error("matching_report_missing_service_role");
  }

  const reportPayload = await buildSessionFounderAlignmentPayload({
    matchingSessionId: normalizedSessionId,
    userId: normalizedUserId,
    client: privileged,
  });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_matching_report_run_from_session", {
    p_matching_session_id: normalizedSessionId,
    p_payload: reportPayload.payload,
    p_modules: reportPayload.modules,
    p_input_assessment_ids: reportPayload.inputAssessmentIds,
  });

  if (error) {
    throw new Error(getErrorMessage(error, "matching_report_create_failed"));
  }

  const reportRunId = parseRpcReportRunId(data);
  if (!reportRunId) {
    throw new Error("matching_report_create_failed");
  }

  const summary = await getMatchingReportRunForSession(normalizedSessionId, normalizedUserId);
  if (!summary || summary.reportRun.id !== reportRunId) {
    throw new Error("matching_report_create_failed");
  }

  return summary;
}
