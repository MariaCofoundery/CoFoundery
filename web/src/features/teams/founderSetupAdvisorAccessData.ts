import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  buildAdvisorConfirmedFounderSetup,
  buildAdvisorFounderSetupAccessState,
  buildFounderSetupAdvisorAccess,
  type AdvisorConfirmedFounderSetupItem,
  type AdvisorConfirmedFounderSetupRow,
  type AdvisorFounderSetupAccessState,
  type AdvisorFounderSetupAccessStatusRow,
  type FounderSetupAdvisorAccess,
  type FounderSetupAdvisorAccessRow,
} from "@/features/teams/founderSetupAdvisorAccessModel";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseLikeClient = Pick<SupabaseServerClient, "rpc">;

export async function getFounderSetupAdvisorAccess(
  teamId: string,
  client?: SupabaseLikeClient
): Promise<FounderSetupAdvisorAccess[]> {
  const normalizedTeamId = teamId.trim();
  if (!normalizedTeamId) return [];
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase.rpc("get_founder_team_advisor_setup_access", {
    p_team_id: normalizedTeamId,
  });
  // Additive rollout fallback: the Founder Setup remains usable before the DB migration lands.
  if (error || !data) return [];
  return buildFounderSetupAdvisorAccess(data as FounderSetupAdvisorAccessRow[]);
}

export async function getAdvisorFounderSetupAccessState(
  relationshipId: string,
  client?: SupabaseLikeClient
): Promise<AdvisorFounderSetupAccessState> {
  const normalizedRelationshipId = relationshipId.trim();
  if (!normalizedRelationshipId) return buildAdvisorFounderSetupAccessState(null);
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase.rpc("get_advisor_founder_setup_access_status", {
    p_relationship_id: normalizedRelationshipId,
  });
  // Additive rollout fallback is fail-closed and does not infer access from content.
  if (error || !Array.isArray(data) || data.length === 0) {
    return buildAdvisorFounderSetupAccessState(null);
  }
  return buildAdvisorFounderSetupAccessState(data[0] as AdvisorFounderSetupAccessStatusRow);
}

export async function getAdvisorConfirmedFounderSetup(
  relationshipId: string,
  client?: SupabaseLikeClient
): Promise<AdvisorConfirmedFounderSetupItem[]> {
  const normalizedRelationshipId = relationshipId.trim();
  if (!normalizedRelationshipId) return [];
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase.rpc("get_advisor_confirmed_founder_setup", {
    p_relationship_id: normalizedRelationshipId,
  });
  // Fail closed on unavailable/older DBs: never substitute a broader Setup query.
  if (error || !data) return [];
  return buildAdvisorConfirmedFounderSetup(data as AdvisorConfirmedFounderSetupRow[]);
}
