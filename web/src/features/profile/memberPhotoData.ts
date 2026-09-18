import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type MemberPhoto = { avatarId: string | null; avatarUrl: string | null };

/**
 * Die Bilder der Menschen, die ihres fuer Mitglieder freigegeben haben.
 *
 * Bis zum 18.09.2026 fragten Teams und Verbindungen `profiles` direkt ab - die
 * Tabelle ist aber selbst-only, die Abfrage lief also ins Leere und es standen
 * stillschweigend Initialen da. In Find gab es ueberhaupt kein Bild.
 *
 * Die Funktion dahinter gibt ausschliesslich Bildangaben zurueck, und nur von
 * Menschen, die zugestimmt haben. Das eigene Bild ist immer dabei.
 */
export async function getMemberPhotos(client: SupabaseClient, userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map<string, MemberPhoto>();

  const { data, error } = await client.rpc("list_member_photos", { p_user_ids: unique });
  if (error || !data) return new Map<string, MemberPhoto>();

  return new Map(
    (data as { user_id: string; avatar_id: string | null; avatar_url: string | null }[]).map(
      (row) => [row.user_id, { avatarId: row.avatar_id, avatarUrl: row.avatar_url }]
    )
  );
}
