import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { selectDiscoveryAssessmentConversationPrompts } from "@/features/discovery/discoveryAssessmentConversationPrompts";
import {
  buildDiscoveryAssessmentSignalAvailabilityMap,
  normalizeDiscoveryAssessmentSignalCandidateUserIds,
  resolveOwnDiscoveryAssessmentSignalReadiness,
  type DiscoveryAssessmentSignalAvailability,
  type OwnDiscoveryAssessmentSignalReadiness,
} from "@/features/discovery/discoveryAssessmentSignalsCore";
import type { AssessmentAnswerRow, QuestionMetaRow } from "@/features/reporting/base_scoring";
import { aggregateFounderBaseScoresFromAnswers } from "@/features/reporting/selfReportScoring";
import type { SelfRadarSeries } from "@/features/reporting/selfReportTypes";
import { createClient } from "@/lib/supabase/server";

export type {
  DiscoveryAssessmentSignalAvailability,
  OwnDiscoveryAssessmentSignalReadiness,
};

type DiscoveryServiceRoleClient = ReturnType<typeof createSupabaseClient>;

type CandidatePreferenceRow = {
  user_id: string;
  include_assessment_signals: boolean;
};

type OwnerPreferenceRow = {
  include_assessment_signals: boolean;
};

type CandidateAssessmentRow = {
  user_id: string;
  id: string;
  module: string;
  submitted_at: string | null;
};

type SubmittedBaseAssessmentRow = {
  id: string;
  user_id: string;
  module: string | null;
  submitted_at: string | null;
  created_at: string | null;
};

type AssessmentAnswerWithAssessmentIdRow = AssessmentAnswerRow & {
  assessment_id: string;
};

function createDiscoveryServiceRoleClient(): DiscoveryServiceRoleClient | null {
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
  });
}

function toFailClosedAvailabilityMap(params: {
  ownerReadiness?: OwnDiscoveryAssessmentSignalReadiness | null;
  candidateUserIds: string[];
}) {
  return buildDiscoveryAssessmentSignalAvailabilityMap({
    ownerReadiness: params.ownerReadiness ?? null,
    candidateUserIds: params.candidateUserIds,
    candidateReadiness: [],
  });
}

export async function getOwnDiscoveryAssessmentSignalReadiness(
  userId: string
): Promise<OwnDiscoveryAssessmentSignalReadiness> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    throw new Error("discovery_missing_user_id");
  }

  const supabase = await createClient();
  const { data: preference, error: preferenceError } = await supabase
    .from("founder_search_preferences")
    .select("include_assessment_signals")
    .eq("user_id", normalizedUserId)
    .maybeSingle();

  if (preferenceError) {
    throw new Error(preferenceError.message ?? "discovery_assessment_consent_load_failed");
  }

  const { data, error } = await supabase
    .from("assessments")
    .select("id")
    .eq("user_id", normalizedUserId)
    .eq("module", "base")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? "discovery_assessment_readiness_load_failed");
  }

  return resolveOwnDiscoveryAssessmentSignalReadiness({
    includeAssessmentSignals:
      (preference as OwnerPreferenceRow | null)?.include_assessment_signals === true,
    hasSubmittedBaseAssessment: Boolean(data?.id),
  });
}

export async function getDiscoveryAssessmentSignalAvailabilityForCandidates({
  ownerUserId,
  candidateUserIds,
}: {
  ownerUserId: string;
  candidateUserIds: string[];
}): Promise<Map<string, DiscoveryAssessmentSignalAvailability>> {
  const normalizedCandidateUserIds = normalizeDiscoveryAssessmentSignalCandidateUserIds({
    ownerUserId,
    candidateUserIds,
  });
  if (normalizedCandidateUserIds.length === 0) {
    return new Map();
  }

  let ownerReadiness: OwnDiscoveryAssessmentSignalReadiness | null = null;
  try {
    ownerReadiness = await getOwnDiscoveryAssessmentSignalReadiness(ownerUserId);
  } catch (error) {
    console.warn("discovery assessment owner readiness failed", {
      reason: error instanceof Error ? error.message : "unknown_error",
    });
    return toFailClosedAvailabilityMap({
      candidateUserIds: normalizedCandidateUserIds,
    });
  }

  const serviceClient = createDiscoveryServiceRoleClient();
  if (!serviceClient) {
    return toFailClosedAvailabilityMap({
      ownerReadiness,
      candidateUserIds: normalizedCandidateUserIds,
    });
  }

  const { data: preferenceRows, error: preferenceError } = await serviceClient
    .from("founder_search_preferences")
    .select("user_id, include_assessment_signals")
    .in("user_id", normalizedCandidateUserIds);

  if (preferenceError) {
    console.warn("discovery assessment candidate consent load failed", {
      reason: preferenceError.message,
    });
    return toFailClosedAvailabilityMap({
      ownerReadiness,
      candidateUserIds: normalizedCandidateUserIds,
    });
  }

  const { data: assessmentRows, error: assessmentError } = await serviceClient
    .from("assessments")
    .select("user_id, id, module, submitted_at")
    .in("user_id", normalizedCandidateUserIds)
    .eq("module", "base")
    .not("submitted_at", "is", null);

  if (assessmentError) {
    console.warn("discovery assessment candidate base availability load failed", {
      reason: assessmentError.message,
    });
    return toFailClosedAvailabilityMap({
      ownerReadiness,
      candidateUserIds: normalizedCandidateUserIds,
    });
  }

  const consentedCandidateUserIds = new Set(
    ((preferenceRows ?? []) as CandidatePreferenceRow[])
      .filter((row) => row.include_assessment_signals === true)
      .map((row) => row.user_id)
  );
  const candidatesWithSubmittedBase = new Set(
    ((assessmentRows ?? []) as CandidateAssessmentRow[])
      .filter((row) => row.module === "base" && row.submitted_at != null && row.id)
      .map((row) => row.user_id)
  );

  return buildDiscoveryAssessmentSignalAvailabilityMap({
    ownerReadiness,
    candidateUserIds: normalizedCandidateUserIds,
    candidateReadiness: normalizedCandidateUserIds.map((userId) => ({
      userId,
      includeAssessmentSignals: consentedCandidateUserIds.has(userId),
      hasSubmittedBaseAssessment: candidatesWithSubmittedBase.has(userId),
    })),
  });
}

function pickLatestAssessmentByUserId(rows: SubmittedBaseAssessmentRow[]) {
  const latestByUserId = new Map<string, SubmittedBaseAssessmentRow>();

  for (const row of rows) {
    if (row.module !== "base" || row.submitted_at == null || !row.id) {
      continue;
    }

    if (!latestByUserId.has(row.user_id)) {
      latestByUserId.set(row.user_id, row);
    }
  }

  return latestByUserId;
}

function groupAnswersByAssessmentId(rows: AssessmentAnswerWithAssessmentIdRow[]) {
  const answersByAssessmentId = new Map<string, AssessmentAnswerRow[]>();

  for (const row of rows) {
    const answers = answersByAssessmentId.get(row.assessment_id) ?? [];
    answers.push({
      question_id: row.question_id,
      choice_value: row.choice_value,
    });
    answersByAssessmentId.set(row.assessment_id, answers);
  }

  return answersByAssessmentId;
}

function aggregateScoresForAssessment(params: {
  assessmentId: string;
  answersByAssessmentId: Map<string, AssessmentAnswerRow[]>;
  questionById: Map<string, QuestionMetaRow>;
}): SelfRadarSeries | null {
  const answers = params.answersByAssessmentId.get(params.assessmentId) ?? [];
  if (answers.length === 0) {
    return null;
  }

  return aggregateFounderBaseScoresFromAnswers(answers, params.questionById).scores;
}

export async function getDiscoveryAssessmentConversationPromptsForCandidates({
  ownerUserId,
  candidateUserIds,
  availabilityByUserId,
  locale,
}: {
  ownerUserId: string;
  candidateUserIds: string[];
  availabilityByUserId: Map<string, DiscoveryAssessmentSignalAvailability>;
  locale?: string | null;
}): Promise<Map<string, string[]>> {
  const normalizedCandidateUserIds = normalizeDiscoveryAssessmentSignalCandidateUserIds({
    ownerUserId,
    candidateUserIds,
  }).filter((userId) => availabilityByUserId.get(userId)?.bothReady === true);

  if (normalizedCandidateUserIds.length === 0) {
    return new Map();
  }

  const serviceClient = createDiscoveryServiceRoleClient();
  if (!serviceClient) {
    return new Map();
  }

  try {
    const userIdsToLoad = [ownerUserId.trim(), ...normalizedCandidateUserIds];
    const { data: assessmentRows, error: assessmentError } = await serviceClient
      .from("assessments")
      .select("id, user_id, module, submitted_at, created_at")
      .in("user_id", userIdsToLoad)
      .eq("module", "base")
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (assessmentError) {
      console.warn("discovery assessment prompt assessment load failed", {
        reason: assessmentError.message,
      });
      return new Map();
    }

    const latestAssessmentByUserId = pickLatestAssessmentByUserId(
      (assessmentRows ?? []) as SubmittedBaseAssessmentRow[]
    );
    const ownerAssessment = latestAssessmentByUserId.get(ownerUserId.trim());
    if (!ownerAssessment) {
      return new Map();
    }

    const candidateAssessments = normalizedCandidateUserIds
      .map((userId) => latestAssessmentByUserId.get(userId) ?? null)
      .filter((row): row is SubmittedBaseAssessmentRow => row != null);
    if (candidateAssessments.length === 0) {
      return new Map();
    }

    const assessmentIds = [ownerAssessment.id, ...candidateAssessments.map((row) => row.id)];
    const { data: answerRows, error: answerError } = await serviceClient
      .from("assessment_answers")
      .select("assessment_id, question_id, choice_value")
      .in("assessment_id", assessmentIds);

    if (answerError) {
      console.warn("discovery assessment prompt answer load failed", {
        reason: answerError.message,
      });
      return new Map();
    }

    const answers = (answerRows ?? []) as AssessmentAnswerWithAssessmentIdRow[];
    const questionIds = Array.from(new Set(answers.map((entry) => entry.question_id)));
    if (questionIds.length === 0) {
      return new Map();
    }

    const { data: questionRows, error: questionError } = await serviceClient
      .from("questions")
      .select("id, dimension, category, prompt")
      .in("id", questionIds);

    if (questionError) {
      console.warn("discovery assessment prompt question load failed", {
        reason: questionError.message,
      });
      return new Map();
    }

    const answersByAssessmentId = groupAnswersByAssessmentId(answers);
    const questionById = new Map(
      ((questionRows ?? []) as QuestionMetaRow[]).map((row) => [row.id, row])
    );
    const ownerScores = aggregateScoresForAssessment({
      assessmentId: ownerAssessment.id,
      answersByAssessmentId,
      questionById,
    });
    if (!ownerScores) {
      return new Map();
    }

    return new Map(
      candidateAssessments
        .map((assessment) => {
          const candidateScores = aggregateScoresForAssessment({
            assessmentId: assessment.id,
            answersByAssessmentId,
            questionById,
          });
          const prompts = selectDiscoveryAssessmentConversationPrompts({
            availability: availabilityByUserId.get(assessment.user_id) ?? null,
            ownerScores,
            candidateScores,
            locale,
          });

          return [assessment.user_id, prompts] as const;
        })
        .filter(([, prompts]) => prompts.length > 0)
    );
  } catch (error) {
    console.warn("discovery assessment prompt preparation failed", {
      reason: error instanceof Error ? error.message : "unknown_error",
    });
    return new Map();
  }
}
