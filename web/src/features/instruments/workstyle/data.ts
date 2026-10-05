import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { WorkstyleForm } from "@/features/instruments/workstyle/registry";
import { checkWorkstyleTeamReadiness, type WorkstyleTeamInputs } from "@/features/instruments/workstyle/teamReadiness";

export type ResearchAnswer = { item_key: string; item_version: string; response_value: number | null; response_option?: string | null; rendered_order?: string[] | null; answered_at?: string; missing_reason: "cannot_assess" | null };
export type ResearchContext = { founder_experience: "none" | "first_venture" | "multiple_ventures" | "0" | "1" | "2-3" | "4-5" | "6_plus" | "prefer_not_to_say"; team_size: "solo" | "two" | "larger" | "no_venture"; venture_phase?: string };
export type ResearchFeedback = { clear_realistic_items?: string[]; clarity?: number; unclear_items?: string[]; unclear_text?: string; unsuitable_items?: string[]; unsuitable_text?: string; desirable?: boolean; desirable_items?: string[]; other?: string };
export type ResearchRow = {
  session_id: string; form: WorkstyleForm | null; manifest_version?: string | null; resume_position?: number | null; assessment_version: string; consent_version: string;
  started_at: string; completed_at: string | null; context: ResearchContext;
  feedback: ResearchFeedback | null; timings: Record<string, number>; answers: ResearchAnswer[];
};
/**
 * Phase 11.6 (nur 8.5a-v3): `submitted_at` = Arbeitsprofil fertig (29 Core),
 * `completed_at` = Forschungsteil fertig. `consent_version`/`consent_given_at`
 * sind leer, solange jemand nicht in die Forschung eingewilligt hat.
 */
export type PretestSession = Omit<ResearchRow, "consent_version"> & {
  assessment_id: string; consent_version: string | null; consent_given_at: string | null; withdrawn_at: string | null; submitted_at?: string | null;
  /** Phase 11.6C: Welle 1 - zugeteiltes Set, Set-Version, gespeicherte Reihenfolge (Item-Schluessel). */
  research_set?: "A" | "B" | null; research_set_version?: string | null; item_order?: string[] | null;
};

export async function getMyWorkstylePretest(version = "8.5a-v1"): Promise<PretestSession | null> {
  const client = await createClient();
  const { data, error } = await client.rpc("get_my_workstyle_pretest_version", { p_assessment_version: version });
  if (error) throw new Error("workstyle_load_failed");
  return data as PretestSession | null;
}

/** Authenticated adapter; the RPC performs all membership, version and sharing checks. */
export async function getWorkstyleTeamInputs(teamId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) throw new Error("invalid_team_id");
  const client = await createClient();
  const { data, error } = await client.rpc("get_workstyle_team_inputs", { p_team_id: teamId });
  if (error) throw new Error("workstyle_team_inputs_unavailable");
  return checkWorkstyleTeamReadiness(data as WorkstyleTeamInputs);
}
