import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fremde LinkedIn-Adressen lesen - der einzige Weg dorthin.
 *
 * `person_core` ist owner-only und bleibt es. Die Entscheidung, wer die
 * Adresse sehen darf, faellt in `list_member_linkedin_urls`; hier wird sie
 * nicht noch einmal nachgebaut. Eine zweite Kopie derselben Regel in
 * TypeScript wuerde frueher oder spaeter von der in SQL abweichen, und dann
 * waere unklar, welche gilt.
 *
 * Bewusst eine Sammelabfrage: Die Aufrufer sind Listen. Ein Aufruf je Zeile
 * waere dieselbe Pruefung n-mal.
 */
export async function getMemberLinkedInUrls(
  client: SupabaseClient,
  userIds: readonly string[]
): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter((id) => typeof id === "string" && id.length > 0))];
  if (ids.length === 0) return new Map();

  const { data, error } = await client.rpc("list_member_linkedin_urls", { p_user_ids: ids });
  // Ein Fehler darf die Seite nicht mitreissen: Der Link ist eine Zugabe, die
  // Kontaktliste ist es nicht.
  if (error || !Array.isArray(data)) return new Map();

  const rows = data as { user_id: string; linkedin_url: string | null }[];
  return new Map(
    rows
      .filter((row) => typeof row.linkedin_url === "string" && row.linkedin_url.length > 0)
      .map((row) => [row.user_id, row.linkedin_url as string])
  );
}

/**
 * Fuer die oeffentlichen Netzwerkseiten - nur bei Stufe "public".
 *
 * Ueber den Slug und nicht ueber die user_id: Die oeffentliche Projektion
 * enthaelt bewusst keine user_id, und sie soll auch keine bekommen.
 */
export async function getPublicProfileLinkedInUrl(
  client: SupabaseClient,
  publicSlug: string
): Promise<string | null> {
  const { data, error } = await client.rpc("get_public_network_profile_linkedin", {
    p_public_slug: publicSlug,
  });
  if (error || typeof data !== "string" || data.length === 0) return null;
  return data;
}
