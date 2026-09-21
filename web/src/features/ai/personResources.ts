import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { RESOURCE_KINDS, type ResourceKind } from "@/features/ai/resourceExtraction";

/**
 * Zugaenge einer Person - eigene Eintraege und Vorschlaege aus Texten.
 *
 * Nur die eigenen: Die Zeilensicherheit laesst in dieser Phase nichts anderes
 * zu. Was davon spaeter im Profil oder in der Suche sichtbar wird, entscheidet
 * eine eigene Freigabestufe und nicht das Anlegen.
 */

export type PersonResource = {
  id: string;
  kind: ResourceKind;
  label: string;
  origin: "self" | "model";
  status: "pending" | "confirmed" | "rejected";
  evidenceQuote: string | null;
};

type Row = {
  id: string;
  kind: string;
  label: string;
  origin: string;
  status: string;
  evidence_quote: string | null;
};

export async function getOwnPersonResources(client: SupabaseClient): Promise<PersonResource[]> {
  const { data, error } = await client
    .from("person_resources")
    .select("id, kind, label, origin, status, evidence_quote")
    // Verworfene bleiben in der Datenbank, damit derselbe Vorschlag nicht
    // wiederkommt - gezeigt werden sie nicht.
    .in("status", ["pending", "confirmed"])
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as Row[])
    .filter((row) => (RESOURCE_KINDS as readonly string[]).includes(row.kind))
    .map((row) => ({
      id: row.id,
      kind: row.kind as ResourceKind,
      label: row.label,
      origin: row.origin === "model" ? "model" : "self",
      status: row.status === "pending" ? "pending" : row.status === "rejected" ? "rejected" : "confirmed",
      evidenceQuote: row.evidence_quote,
    }));
}
