import "server-only";

import { getOwnSearchPreferences } from "@/features/discovery/discoveryData";
import {
  resolveOwnDiscoveryAssessmentSignalReadiness,
  type OwnDiscoveryAssessmentSignalReadiness,
} from "@/features/discovery/discoveryAssessmentSignalsCore";
import { createClient } from "@/lib/supabase/server";

export type { OwnDiscoveryAssessmentSignalReadiness };

export async function getOwnDiscoveryAssessmentSignalReadiness(
  userId: string
): Promise<OwnDiscoveryAssessmentSignalReadiness> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    throw new Error("discovery_missing_user_id");
  }

  const supabase = await createClient();
  const preferences = await getOwnSearchPreferences(normalizedUserId, supabase);
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
    includeAssessmentSignals: preferences?.includeAssessmentSignals === true,
    hasSubmittedBaseAssessment: Boolean(data?.id),
  });
}
