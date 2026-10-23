import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResearchConsentState } from "@/features/research/client";

export async function getResearchConsentState(
  client: SupabaseClient,
  userId: string
): Promise<ResearchConsentState> {
  const { data, error } = await client
    .from("research_consent_preferences")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();
  // Ein Lesefehler ist keine offene Frage. supabase-js wirft ihn nicht, es
  // liefert ihn zurueck - der .catch im Layout griff deshalb nie, und wer
  // einmal geantwortet hatte, wurde bei jedem Lesefehler erneut gefragt.
  if (error) return "unknown";
  if (data?.state !== "accepted" && data?.state !== "declined") return "undecided";
  return data.state;
}
