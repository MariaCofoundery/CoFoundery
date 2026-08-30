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
  if (error || (data?.state !== "accepted" && data?.state !== "declined")) return "undecided";
  return data.state;
}
