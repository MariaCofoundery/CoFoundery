import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EventContacts = {
  assigned: { contactId: string; name: string; role: string | null }[];
  choices: { contactId: string; name: string; topic: string | null; paused: boolean }[];
};

/** Wer aus der Liste bei diesem Termin dabei ist - und wen man noch zuordnen kann. Liest nur, wer das Recht "Personen" hat (Zeilensicherheit). */
export async function listEventContacts(client: SupabaseClient, orgId: string, eventId: string): Promise<EventContacts> {
  const [assigned, { data: all }] = await Promise.all([
    listEventPartners(client, orgId, eventId),
    client.from("advisor_org_contacts").select("id, name, topic, status").eq("org_id", orgId).order("name").limit(500),
  ]);
  const rows = ((all ?? []) as { id: string; name: string; topic: string | null; status: string }[]);
  const assignedIds = new Set(assigned.map((entry) => entry.contactId));
  return {
    assigned,
    choices: rows.filter((row) => row.status !== "paused" || assignedIds.has(row.id)).map((row) => ({ contactId: row.id, name: row.name, topic: row.topic, paused: row.status === "paused" })),
  };
}

/** Wer aus der Partnerliste bei diesem Termin dabei ist (Name und Rolle). */
export async function listEventPartners(client: SupabaseClient, orgId: string, eventId: string): Promise<{ contactId: string; name: string; role: string | null }[]> {
  const { data: links } = await client.from("advisor_org_contact_events").select("contact_id, role").eq("org_id", orgId).eq("event_id", eventId).limit(50);
  const rows = Array.isArray(links) ? (links as { contact_id: string; role: string | null }[]) : [];
  if (rows.length === 0) return [];
  const { data: contacts } = await client.from("advisor_org_contacts").select("id, name").in("id", rows.map((row) => row.contact_id));
  const names = new Map(((contacts ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]));
  return rows.flatMap((row) => (names.has(row.contact_id) ? [{ contactId: row.contact_id, name: names.get(row.contact_id) as string, role: row.role }] : []));
}
