"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setResearchConsentAction(state: "accepted" | "declined") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "not_authenticated" as const };
  const { error } = await (supabase as unknown as SupabaseClient).rpc("set_my_research_consent", {
    p_state: state,
  });
  if (error) return { ok: false as const, error: "update_failed" as const };
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  return { ok: true as const, state };
}
