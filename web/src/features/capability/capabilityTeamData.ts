import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getCapabilityVocabulary, getOwnCapabilityEntries } from "./capabilityData";
import {
  buildCapabilityTeamReadout,
  type TeamMemberSides,
  type TeamReadout,
} from "./capabilityTeamReadout";

/**
 * Die Rollenlage eines Teams, aus echten Daten.
 *
 * JEDE SEITE KOMMT AUS DER FREIGEGEBENEN SICHT, nicht aus der Tabelle: Für
 * jedes andere Mitglied fragt `get_disclosed_capability(..., 'team')`, und die
 * Funktion entscheidet selbst, was sie herausgibt - Bereiche ab Freigabestufe
 * "areas", Stufe und Wunsch nur bei "areas_depth_on_contact". Es gibt hier
 * bewusst keinen Weg, der die Freigabeleiter umgeht; eine direkte Abfrage auf
 * `person_capability_entries` wäre genau dieser Weg.
 *
 * DIE EIGENEN EINTRÄGE KOMMEN VOLLSTÄNDIG. Sich selbst muss man nichts
 * freigeben.
 *
 * WIE VIELE IHRE TIEFE FREIGEGEBEN HABEN, WIRD MITGEZÄHLT und angezeigt. Ohne
 * diese Zahl liest sich eine dünne Auswertung wie ein Befund über das Team,
 * obwohl sie nur eine Auskunft über Einstellungen ist - und das wäre die
 * unehrlichste Art, diese Seite zu bauen.
 */

export type TeamCapabilityReadout = {
  readout: TeamReadout;
  /** Wie viele Mitglieder überhaupt Angaben beigetragen haben. */
  contributing: number;
  /** Wie viele davon Stufe und Wunsch freigegeben haben. */
  withDepth: number;
  memberCount: number;
};

type DisclosedRow = {
  area_id: string;
  family_id: string;
  application_level: number | null;
  ownership_wish: string | null;
};

export async function getTeamCapabilityReadout(
  client: SupabaseClient,
  teamId: string,
  currentUserId: string
): Promise<TeamCapabilityReadout | null> {
  const [memberResult, presentationResult, vocabulary] = await Promise.all([
    client.from("founder_team_members").select("user_id").eq("team_id", teamId),
    client.rpc("get_founder_team_member_presentations", { p_team_id: teamId }),
    getCapabilityVocabulary(client),
  ]);

  // Die Zeilensicherheit auf `founder_team_members` entscheidet, ob man dieses
  // Team überhaupt sehen darf. Kein Ergebnis heißt: nicht dabei.
  const memberIds = ((memberResult.data ?? []) as { user_id: string }[]).map(
    (row) => row.user_id
  );
  if (memberIds.length === 0) return null;

  const names = new Map(
    ((presentationResult.data ?? []) as { user_id: string; display_name: string | null }[]).map(
      (row) => [row.user_id, row.display_name]
    )
  );

  const sides: TeamMemberSides[] = await Promise.all(
    memberIds.map(async (userId) => {
      const entries =
        userId === currentUserId
          ? (await getOwnCapabilityEntries(client, userId)).map((entry) => ({
              areaId: entry.area_id,
              applicationLevel: entry.application_level,
              ownershipWish: entry.ownership_wish,
            }))
          : await disclosedEntries(client, userId);

      return {
        userId,
        // Ohne Namen ist jede Aussage unbrauchbar ("jemand will das
        // verantworten"). Der Rückfall ist bewusst kein Platzhaltername,
        // sondern ein Hinweis - ein erfundener Name wäre schlimmer.
        name: names.get(userId)?.trim() || "",
        entries,
      };
    })
  );

  const withDepth = sides.filter((side) =>
    side.entries.some((entry) => entry.applicationLevel !== null)
  ).length;

  return {
    readout: buildCapabilityTeamReadout(sides, vocabulary.areas, vocabulary.families),
    contributing: sides.filter((side) => side.entries.length > 0).length,
    withDepth,
    memberCount: memberIds.length,
  };
}

async function disclosedEntries(client: SupabaseClient, userId: string) {
  const { data, error } = await client.rpc("get_disclosed_capability", {
    p_user_id: userId,
    p_context: "team",
  });
  if (error) return [];

  return ((data ?? []) as DisclosedRow[]).map((row) => ({
    areaId: row.area_id,
    applicationLevel: row.application_level,
    ownershipWish: row.ownership_wish,
  }));
}
