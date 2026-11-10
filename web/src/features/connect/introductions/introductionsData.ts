import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Introduction = {
  requestId: string; role: "sender" | "recipient"; typeKey: string; otherLabel: string | null; sectorKey: string | null; region: string | null;
  snoozedAt: string | null; status: string; createdAt: string; respondedAt: string | null; answered: boolean;
};

/** Meine Vorstellungen (als Absenderin oder Kennerin) fuer die Kontakte-Seite. */
export async function listIntroductions(client: SupabaseClient): Promise<Introduction[]> {
  const { data } = await client.rpc("list_network_introductions");
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    requestId: row.request_id as string, role: row.role === "sender" ? "sender" : "recipient", typeKey: row.type_key as string, otherLabel: (row.other_label as string | null) ?? null,
    sectorKey: (row.sector_key as string | null) ?? null, region: (row.region as string | null) ?? null, snoozedAt: (row.snoozed_at as string | null) ?? null,
    status: row.status as string, createdAt: row.created_at as string, respondedAt: (row.responded_at as string | null) ?? null, answered: row.answered === true,
  }));
}

/** Nach 14 Tagen fragt Connect einmal: Hat es geklappt? Nur bei angenommenen Vorstellungen, nur wer noch nicht geantwortet hat. */
export const OUTCOME_AFTER_DAYS = 14;
export function outcomeDue(intro: Introduction, now = Date.now()): boolean {
  return intro.status === "accepted" && !intro.answered && intro.respondedAt !== null && now - Date.parse(intro.respondedAt) >= OUTCOME_AFTER_DAYS * 86_400_000;
}
