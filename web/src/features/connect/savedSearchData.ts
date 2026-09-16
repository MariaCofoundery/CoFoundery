import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SavedSearchCriteria } from "./savedSearchMatching";

type Client = SupabaseClient;

export type SavedSearch = SavedSearchCriteria & {
  context: "connect" | "discovery";
  label: string;
  notify: boolean;
  alignmentDimensions: string[];
  createdAt: string;
};

type Row = {
  id: string;
  user_id: string;
  context: "connect" | "discovery";
  label: string;
  query: string;
  topics: string[];
  industries: string[];
  locations: string[];
  geographic_scope: string | null;
  remote_mode: string | null;
  capability_area_ids: string[];
  connect_direction: string | null;
  connect_category: string | null;
  include_listings: boolean;
  include_problems: boolean;
  alignment_dimensions: string[];
  notify: boolean;
  created_at: string;
};

function toSavedSearch(row: Row): SavedSearch {
  return {
    id: row.id,
    userId: row.user_id,
    context: row.context,
    label: row.label,
    query: row.query,
    topics: row.topics,
    industries: row.industries,
    locations: row.locations,
    geographicScope: row.geographic_scope,
    remoteMode: row.remote_mode,
    capabilityAreaIds: row.capability_area_ids,
    connectDirection: row.connect_direction,
    connectCategory: row.connect_category,
    includeListings: row.include_listings,
    includeProblems: row.include_problems,
    alignmentDimensions: row.alignment_dimensions,
    notify: row.notify,
    createdAt: row.created_at,
  };
}

export async function getOwnSavedSearches(client: Client, context: "connect" | "discovery") {
  const { data } = await client
    .from("saved_searches")
    .select("*")
    .eq("context", context)
    .order("created_at", { ascending: false });
  return ((data ?? []) as Row[]).map(toSavedSearch);
}

/**
 * Die Suchen, gegen die ein neuer Eintrag zu pruefen ist.
 *
 * Laeuft ueber eine security-definer-Funktion, weil die einstellende Person
 * fremde Suchen nicht sehen darf. Zurueck kommen nur die Kriterien, nie die
 * Bezeichnung - wonach jemand sucht, ist seine Sache.
 */
export async function getSavedSearchesForMatching(
  client: Client,
  context: "connect" | "discovery",
  authorUserId: string
): Promise<SavedSearchCriteria[]> {
  const { data, error } = await client.rpc("list_saved_searches_for_matching", {
    p_context: context,
    p_author_user_id: authorUserId,
  });
  if (error) return [];

  return ((data ?? []) as Omit<Row, "context" | "label" | "notify" | "created_at">[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    query: row.query,
    topics: row.topics,
    industries: row.industries,
    locations: row.locations,
    geographicScope: row.geographic_scope,
    remoteMode: row.remote_mode,
    capabilityAreaIds: row.capability_area_ids,
    connectDirection: row.connect_direction,
    connectCategory: row.connect_category,
    includeListings: row.include_listings,
    includeProblems: row.include_problems,
  }));
}

/**
 * Die Faehigkeiten der einstellenden Person - aber nur, wenn sie sie
 * freigegeben hat.
 *
 * Das ist der heikle Punkt an der Verbindung zwischen Capability und Connect.
 * Beim Veroeffentlichen laeuft der Vergleich im Namen dieser Person, sie kaeme
 * also an ihre eigenen Eintraege heran - auch an die, die sie auf 'private'
 * gestellt hat. Genau das darf nicht passieren: Ein Treffer auf eine
 * zurueckgehaltene Angabe waere eine Weitergabe durch die Hintertuer.
 *
 * Deshalb wird die Freigabestufe zuerst gelesen. 'private' ergibt eine leere
 * Liste, und ein Faehigkeiten-Kriterium trifft dann nie zu.
 */
export async function getDisclosedOwnCapabilityAreas(client: Client, userId: string) {
  const { data: core } = await client
    .from("person_core")
    .select("capability_disclosure")
    .eq("user_id", userId)
    .maybeSingle();

  const disclosure = (core?.capability_disclosure as string | undefined) ?? "private";
  if (disclosure === "private") return [];

  const { data } = await client
    .from("person_capability_entries")
    .select("area_id")
    .eq("user_id", userId);

  return ((data ?? []) as { area_id: string }[]).map((row) => row.area_id);
}
