import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isValueKey, type PersonValue, type TeamSharing, type TeamValueRow } from "@/features/values/valuesModel";

const personValue = (row: { value_key: string; label: string | null; meaning?: string | null }): PersonValue | null =>
  row.value_key === "custom" ? { key: "custom", label: row.label, meaning: row.meaning ?? null } : isValueKey(row.value_key) ? { key: row.value_key, label: null, meaning: row.meaning ?? null } : null;

/** Die eigenen Werte, in der eigenen Reihenfolge - und die Freigaben (Zeilensicherheit: nur die eigenen Zeilen). */
export async function getOwnValues(client: SupabaseClient): Promise<{ values: PersonValue[]; violatedNote: string | null; connectShow: boolean; sharedTeamIds: string[] }> {
  const [values, settings, shares] = await Promise.all([
    client.from("person_values").select("slot, value_key, label, meaning").order("slot").limit(5),
    client.from("person_value_settings").select("violated_note, connect_show").maybeSingle(),
    client.from("person_value_team_shares").select("team_id").limit(20),
  ]);
  const row = settings.data as { violated_note: string | null; connect_show: boolean } | null;
  return {
    values: ((values.data ?? []) as { value_key: string; label: string | null; meaning: string | null }[]).flatMap((entry) => {
      const value = personValue(entry);
      return value ? [value] : [];
    }),
    violatedNote: row?.violated_note ?? null,
    connectShow: row?.connect_show === true,
    sharedTeamIds: ((shares.data ?? []) as { team_id: string }[]).map((entry) => entry.team_id),
  };
}

export async function getTeamValues(client: SupabaseClient, teamId: string): Promise<{ rows: TeamValueRow[]; sharing: TeamSharing[] }> {
  const [rows, sharing] = await Promise.all([client.rpc("get_team_values", { p_team_id: teamId }), client.rpc("get_team_values_sharing", { p_team_id: teamId })]);
  return {
    rows: ((rows.data ?? []) as { user_id: string; slot: number; value_key: string; label: string | null; meaning: string | null }[]).flatMap((entry) => {
      const value = personValue(entry);
      return value ? [{ ...value, userId: entry.user_id, slot: entry.slot }] : [];
    }),
    sharing: ((sharing.data ?? []) as { user_id: string; display_name: string; shared: boolean; is_self: boolean }[]).map((entry) => ({ userId: entry.user_id, name: entry.display_name, shared: entry.shared, isSelf: entry.is_self })),
  };
}

/** Die Begriffe fuer das Connect-Profil - leer, solange die Person sie dort nicht zeigt. */
export async function getConnectValues(client: SupabaseClient, userId: string): Promise<PersonValue[]> {
  const { data } = await client.rpc("get_connect_values", { p_user_id: userId });
  return ((data ?? []) as { value_key: string; label: string | null }[]).flatMap((entry) => {
    const value = personValue(entry);
    return value ? [value] : [];
  });
}
