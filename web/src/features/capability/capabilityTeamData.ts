import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getCapabilityVocabulary, getOwnCapabilityEntries } from "./capabilityData";
import type { TeamReadout } from "./capabilityTeamReadout";
import type { CapabilityArea, OwnershipWish } from "./capabilityTypes";
import type { CapabilityPerson } from "@/features/reporting/workstyle/componentsModel";

/**
 * Die Faehigkeiten eines Teams fuer /teams/[id]/roles, aus echten Daten.
 *
 * PHASE 11.7B.1 - TEAMGENAU. Fuer jedes andere Mitglied fragt
 * `get_team_capability(team, person)`: Bereich, Erfahrungsstufe und
 * Verantwortungswunsch gibt es nur, wenn diese Person fuer GENAU dieses Team
 * geteilt hat; sonst entscheidet weiter die Freigabeleiter
 * (`capability_disclosure`). Eine Teamfreigabe in einem anderen gemeinsamen
 * Team zaehlt hier nicht. Es gibt bewusst keinen Weg, der das umgeht; eine
 * direkte Abfrage auf `person_capability_entries` waere genau dieser Weg.
 *
 * DIE EIGENEN EINTRAEGE KOMMEN VOLLSTAENDIG. Sich selbst muss man nichts
 * freigeben.
 *
 * WIE VIELE TIEFE ZEIGEN, WIRD MITGEZAEHLT und angezeigt. Ohne diese Zahl
 * liest sich eine duenne Auswertung wie ein Befund ueber das Team, obwohl sie
 * nur eine Auskunft ueber Freigaben ist.
 */

/** Die Advisor-Gruppenansicht (CapabilityTeamReadoutView) - unveraendert. */
export type TeamCapabilityReadout = {
  readout: TeamReadout;
  /** Wie viele Mitglieder ueberhaupt Angaben beigetragen haben. */
  contributing: number;
  /** Wie viele davon Stufe und Wunsch freigegeben haben. */
  withDepth: number;
  memberCount: number;
};

export type TeamCapabilityForTeam = {
  /** Fuer ComponentMatrix - dieselbe Darstellung wie im Teambericht. */
  people: CapabilityPerson[];
  areas: CapabilityArea[];
  contributing: number;
  withDepth: number;
  memberCount: number;
};

type TeamCapabilityRow = {
  area_id: string;
  family_id: string;
  application_level: number | null;
  ownership_wish: string | null;
};

export async function getTeamCapabilityForTeam(
  client: SupabaseClient,
  teamId: string,
  currentUserId: string,
  unnamed: string
): Promise<TeamCapabilityForTeam | null> {
  const [memberResult, presentationResult, vocabulary] = await Promise.all([
    client.from("founder_team_members").select("user_id").eq("team_id", teamId),
    client.rpc("get_founder_team_member_presentations", { p_team_id: teamId }),
    getCapabilityVocabulary(client),
  ]);

  // Die Zeilensicherheit auf `founder_team_members` entscheidet, ob man dieses
  // Team ueberhaupt sehen darf. Kein Ergebnis heisst: nicht dabei.
  const memberIds = ((memberResult.data ?? []) as { user_id: string }[]).map(
    (row) => row.user_id
  );
  if (memberIds.length === 0) return null;

  const names = new Map(
    ((presentationResult.data ?? []) as { user_id: string; display_name: string | null }[]).map(
      (row) => [row.user_id, row.display_name]
    )
  );

  const sides = await Promise.all(
    memberIds.map(async (userId) => {
      const entries =
        userId === currentUserId
          ? (await getOwnCapabilityEntries(client, userId)).map((entry) => ({
              areaId: entry.area_id,
              applicationLevel: entry.application_level,
              ownershipWish: entry.ownership_wish,
            }))
          : await teamEntries(client, teamId, userId);
      // Ohne Namen ist jede Aussage unbrauchbar; der Rueckfall ist ein
      // Hinweis, kein erfundener Name.
      return { userId, name: names.get(userId)?.trim() || "", entries };
    })
  );

  const withDepth = sides.filter((side) =>
    side.entries.some((entry) => entry.applicationLevel !== null)
  ).length;

  return {
    people: sides.map((side) => ({
      person_id: side.userId,
      name: side.name || unnamed,
      capabilities: side.entries.map((entry) => ({
        area_id: entry.areaId,
        application_level: entry.applicationLevel,
        ownership_wish: entry.ownershipWish as OwnershipWish | null,
      })),
    })),
    areas: vocabulary.areas,
    contributing: sides.filter((side) => side.entries.length > 0).length,
    withDepth,
    memberCount: memberIds.length,
  };
}

async function teamEntries(client: SupabaseClient, teamId: string, userId: string) {
  const { data, error } = await client.rpc("get_team_capability", {
    p_team_id: teamId,
    p_user_id: userId,
  });
  if (error) return [];

  return ((data ?? []) as TeamCapabilityRow[]).map((row) => ({
    areaId: row.area_id,
    applicationLevel: row.application_level,
    ownershipWish: row.ownership_wish,
  }));
}
