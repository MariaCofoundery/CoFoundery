import "server-only";

/**
 * Anzeigenamen der Gegenseite in BESTEHENDEN Beziehungen (Paar, Team, Intro,
 * Discovery-Matching-Start, alte Matching-Sitzung).
 *
 * Bis 20261130120000 lasen diese Ansichten den Namen aus
 * founder_discovery_profiles. Seitdem verbirgt die Select-Policy fremde
 * FIND-Profile bei einer Blockierung - eine Verbindung soll dadurch aber nicht
 * still anonymisiert werden. get_relationship_display_names liefert deshalb nur
 * Name und `discovery_active`, nur für Personen mit einer Beziehung zur
 * angemeldeten Person, unabhängig von einer Blockierung, und keine weiteren
 * Discovery-Daten.
 *
 * `discoveryActiveOnly` behält die bisherige Regel der jeweiligen Ansicht bei
 * („Name nur, solange das FIND-Profil aktiv ist“).
 */

export type RelationshipNameRow = { user_id: string; display_name: string | null };

type RpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

export async function loadRelationshipDisplayNames(
  client: unknown,
  userIds: readonly string[],
  options: Readonly<{ discoveryActiveOnly: boolean }>
): Promise<{ data: RelationshipNameRow[] | null; error: unknown }> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return { data: [], error: null };
  const { data, error } = await (client as RpcClient).rpc("get_relationship_display_names", { p_user_ids: ids });
  if (error || !Array.isArray(data)) return { data: null, error: error ?? new Error("relationship_display_names_unavailable") };
  const rows = data as Array<{ user_id: string; display_name: string | null; discovery_active: boolean }>;
  return {
    data: rows
      .filter((row) => !options.discoveryActiveOnly || row.discovery_active === true)
      .map((row) => ({ user_id: row.user_id, display_name: row.display_name })),
    error: null,
  };
}
