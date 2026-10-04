import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  validProductProfile,
  validProductTeam,
  REPORT_SCHEMA,
  type ProductProfile,
  type ProductTeam,
  type ProductSnapshot,
} from "@/features/reporting/workstyle/model";
export async function getProductWorkstyle(
  client: SupabaseClient,
  personId: string,
): Promise<ProductProfile | null> {
  const { data, error } = await client.rpc("get_workstyle_product_profile", {
    p_person_id: personId,
  });
  return !error && data && validProductProfile(data) ? data : null;
}
export async function getProductTeam(
  client: SupabaseClient,
  teamId: string,
): Promise<ProductTeam | "not_ready" | null> {
  const { data, error } = await client.rpc("get_workstyle_product_team", {
    p_team_id: teamId,
  });
  if (error || !data) return null;
  return validProductTeam(data) ? data : "not_ready";
}
export async function getProductSnapshot<
  T extends ProductProfile | ProductTeam,
>(client: SupabaseClient, id: string): Promise<ProductSnapshot<T> | null> {
  const { data, error } = await client.rpc("get_workstyle_product_snapshot", {
    p_snapshot_id: id,
  });
  if (error || !data || data.schema_version !== REPORT_SCHEMA) return null;
  return data;
}
