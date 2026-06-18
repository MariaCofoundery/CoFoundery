import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  buildDiscoveryAssessmentSignalAvailabilityMap,
  normalizeDiscoveryAssessmentSignalCandidateUserIds,
  resolveOwnDiscoveryAssessmentSignalReadiness,
  type DiscoveryAssessmentSignalAvailability,
  type OwnDiscoveryAssessmentSignalReadiness,
} from "@/features/discovery/discoveryAssessmentSignalsCore";
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
