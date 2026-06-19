import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MatchingSessionModule } from "@/features/matchingCore/matchingCoreTypes";
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

type MatchingReportRunRow = {
  id: string;
  matching_session_id: string;
  modules: string[] | null;
  input_assessment_ids: string[] | null;
  payload: unknown;
  created_by_user_id: string;
  created_at: string;
};

function getErrorMessage(error: SupabaseError | null | undefined, fallback: string) {
  return error?.message ?? fallback;
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
