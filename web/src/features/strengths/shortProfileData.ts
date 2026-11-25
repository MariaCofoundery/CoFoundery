import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ShortProfileStrength = { theme: string | null; label: string; quote: string | null };

export type ShortProfile = {
  userId: string;
  tagline: string | null;
  strengths: ShortProfileStrength[];
  seeks: string | null;
  offers: string | null;
  sharedInNetwork: boolean;
};

type Row = {
  user_id: string;
  tagline: string | null;
  strengths: unknown;
  seeks: string | null;
  offers: string | null;
  shared_in_network: boolean;
};

function strengthsOf(value: unknown): ShortProfileStrength[] {
  if (!Array.isArray(value)) return [];
  const list: ShortProfileStrength[] = [];
  for (const entry of value.slice(0, 5)) {
    if (!entry || typeof entry !== "object") continue;
    const { theme, label, quote } = entry as Record<string, unknown>;
    if (typeof label !== "string" || !label.trim()) continue;
    list.push({
      theme: typeof theme === "string" ? theme : null,
      label,
      quote: typeof quote === "string" && quote.trim() ? quote : null,
    });
  }
  return list;
}

const toProfile = (row: Row): ShortProfile => ({
  userId: row.user_id,
  tagline: row.tagline,
  strengths: strengthsOf(row.strengths),
  seeks: row.seeks,
  offers: row.offers,
  sharedInNetwork: row.shared_in_network,
});

/**
 * Das Kurzprofil einer Person. Wer es lesen darf, entscheidet die Zeilensicherheit der Tabelle (die Person selbst; aktive
 * Netzwerk-Mitglieder nur bei eingeschaltetem Teilen und aktivem Netzwerkprofil) - diese Funktion fragt nur und zeigt,
 * was zurückkommt. `null` heißt: gibt es nicht oder man darf es nicht sehen; das wird nicht unterschieden.
 */
export async function getShortProfile(client: SupabaseClient, userId: string): Promise<ShortProfile | null> {
  const { data } = await client
    .from("person_short_profiles")
    .select("user_id, tagline, strengths, seeks, offers, shared_in_network")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? toProfile(data as Row) : null;
}
