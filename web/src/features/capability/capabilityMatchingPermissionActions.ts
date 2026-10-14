"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/**
 * Setzt die Capability-Matching-Freigabe der angemeldeten Person.
 *
 * Nimmt keine user_id an: Es gilt immer die angemeldete Person, und RLS auf
 * person_core erlaubt ohnehin nur die eigene Zeile. Geändert wird ausschließlich
 * `capability_matching_allowed` - weder Capability-Einträge noch
 * `capability_disclosure`.
 */
export async function setCapabilityMatchingPermissionAction(allowed: boolean) {
  if (typeof allowed !== "boolean") return { ok: false as const, error: "invalid" as const };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "not_authenticated" as const };

  const { data, error } = await supabase
    .from("person_core")
    .update({ capability_matching_allowed: allowed })
    .eq("user_id", user.id)
    .select("capability_matching_allowed")
    .maybeSingle();
  if (error || !data) return { ok: false as const, error: "update_failed" as const };

  revalidatePath("/profile");
  revalidatePath("/discovery/profile");
  return { ok: true as const, allowed: data.capability_matching_allowed === true };
}
