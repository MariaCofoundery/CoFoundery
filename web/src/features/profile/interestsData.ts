import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseInterests, type InterestArea } from "@/features/profile/interests";

/**
 * Wofuer die Person hier ist. Faellt leise auf „nichts gesagt" zurueck, wenn die
 * Spalte nicht lesbar ist: Die Absicht ist ein Vorschlag, kein Pfeiler - ein
 * Fehler hier darf keine Seite stoerren.
 */
export async function getInterests(client: SupabaseClient, userId: string): Promise<InterestArea[]> {
  try {
    const { data, error } = await client.from("person_core").select("interests").eq("user_id", userId).maybeSingle();
    if (error || !data) return [];
    return parseInterests((data as { interests?: unknown[] }).interests ?? []);
  } catch {
    return [];
  }
}

/** Schreibt die Absichten. Gibt false zurueck, statt zu werfen. */
export async function writeInterests(client: SupabaseClient, userId: string, interests: InterestArea[]): Promise<boolean> {
  try {
    const { error } = await client.from("person_core").update({ interests }).eq("user_id", userId);
    return !error;
  } catch {
    return false;
  }
}
