import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConnectVenture, PublicConnectVenture } from "./connectTypes";

type Client = SupabaseClient;

/**
 * Die Unternehmen am Profil.
 *
 * Wie ueberall hier verlaesst sich das auf die Zugriffsregeln der Datenbank
 * statt sie nachzubauen: Verborgene sieht nur die eigene Person, und fremde
 * nur, solange das Profil dahinter aktiv ist.
 */
export async function getConnectVentures(client: Client, ownerUserId: string) {
  const { data } = await client
    .from("network_ventures")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: true });
  return (data ?? []) as ConnectVenture[];
}

export async function getConnectVenture(client: Client, id: string) {
  const { data } = await client
    .from("network_ventures")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as ConnectVenture | null) ?? null;
}

/** Die Unternehmen eines oeffentlich gestellten Profils. */
export async function getPublicConnectVentures(client: Client, profileSlug: string) {
  const { data, error } = await client.rpc("list_public_network_profile_ventures", {
    p_profile_slug: profileSlug,
  });
  if (error) return [];
  return (data ?? []) as PublicConnectVenture[];
}

/** Die Adresse des Logos - eine Route, weil der Bucket privat ist. */
export function ventureLogoUrl(venture: Pick<ConnectVenture, "id" | "logo_path" | "updated_at">) {
  if (!venture.logo_path) return null;
  return `/api/connect/venture-logos/${venture.id}?v=${encodeURIComponent(venture.updated_at)}`;
}

/**
 * Die Unternehmen im Netzwerk - zum Durchsehen.
 *
 * GEBAUT AM 21.09.2026: Es gab nur die EIGENEN. Auf einer Personenkarte stand
 * "2 Unternehmen", aber es fuehrte kein Weg dorthin.
 *
 * Wie bei den Menschen sortiert nach Aktualitaet und nie nach Passung: Sobald
 * Unternehmen sortiert werden, ist es eine Rangliste.
 */
export async function getActiveConnectVentures(client: Client, term?: string) {
  let query = client
    .from("network_ventures")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60);

  const trimmed = (term ?? "").trim();
  if (trimmed) {
    // search_text haelt der Trigger aus 20260929120000 aktuell; ilike findet
    // dabei auch Teile von Komposita.
    const escaped = trimmed.replace(/[\\%_]/g, (match) => `\\${match}`);
    query = query.ilike("search_text", `%${escaped}%`);
  }

  const { data } = await query;
  return (data ?? []) as ConnectVenture[];
}
