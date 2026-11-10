import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Wer aus der Partnerliste bei diesem Termin dabei ist (Name und Rolle). Liest nur, wer das Recht "Personen" hat (Zeilensicherheit). */
export async function listEventPartners(client: SupabaseClient, orgId: string, eventId: string): Promise<{ name: string; role: string | null }[]> {
  const { data: links } = await client.from("advisor_org_contact_events").select("contact_id, role").eq("org_id", orgId).eq("event_id", eventId).limit(50);
  const rows = Array.isArray(links) ? (links as { contact_id: string; role: string | null }[]) : [];
  if (rows.length === 0) return [];
  const { data: contacts } = await client.from("advisor_org_contacts").select("id, name").in("id", rows.map((row) => row.contact_id));
  const names = new Map(((contacts ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]));
  return rows.flatMap((row) => (names.has(row.contact_id) ? [{ name: names.get(row.contact_id) as string, role: row.role }] : []));
}
