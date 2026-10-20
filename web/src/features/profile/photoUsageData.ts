import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { connectPhotoUrl } from "@/features/connect/ConnectAvatar";
import { getOwnConnectProfile } from "@/features/connect/connectData";

/**
 * Wo das Foto zu sehen ist - zwei getrennte, ausdrueckliche Entscheidungen:
 *
 *   FIND und andere Mitglieder: `person_core.photo_visible_to_members`
 *   Connect:                   die Wahl in `network_profiles` (eigene Kopie oder eigenes Bild)
 *
 * Das eine schliesst das andere nie ein. Das Connect-Feld gibt es nur, wenn schon ein
 * Connect-Profil existiert - dafuer wird hier keine Zeile angelegt.
 */
export type PhotoUsage = {
  visibleToMembers: boolean;
  connect: null | {
    currentAvatarId: string | null;
    currentPhotoUrl: string | null;
    /** `public`: Das Profil hat eine oeffentliche Seite. */
    isPublicProfile: boolean;
  };
};

export async function getPhotoUsage(client: SupabaseClient, userId: string, visibleToMembers: boolean): Promise<PhotoUsage> {
  const profile = await getOwnConnectProfile(client, userId).catch(() => null);
  return {
    visibleToMembers,
    connect: profile
      ? {
          currentAvatarId: profile.photo_avatar_id ?? null,
          currentPhotoUrl: connectPhotoUrl(profile),
          isPublicProfile: profile.visibility === "public",
        }
      : null,
  };
}
