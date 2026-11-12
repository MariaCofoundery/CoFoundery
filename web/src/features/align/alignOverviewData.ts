import "server-only";

import {
  ALIGN_PART_KEYS,
  stateFromCount,
  stateFromWorkProfile,
  teamMapTiles,
  type AlignPartKey,
  type AlignPartState,
  type TeamMapTile,
} from "@/features/align/alignModel";
import { buildCapabilityTeamReadout } from "@/features/capability/capabilityTeamReadout";
import { getCapabilityVocabulary } from "@/features/capability/capabilityData";
import { getTeamCapabilityForTeam } from "@/features/capability/capabilityTeamData";
import { getStartTeamState } from "@/features/dashboard/founderStartData";
import { alignWorkProfileState } from "@/features/instruments/align/AlignCard";
import { getAlignDashboardState } from "@/features/instruments/align/dashboardData";
import { getProductTeam } from "@/features/reporting/workstyle/data";
import { getFounderTeamDashboardSummaries } from "@/features/teams/founderTeamHomebaseData";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Was die Align-Uebersicht wissen muss - und nur das.
 *
 * NICHTS WIRD ANGELEGT. Ein Blick auf die Uebersicht erzeugt kein Team, kein Setup und kein Profil.
 * Jede Abfrage laeuft mit dem Client der Person; was sie nicht lesen darf, kommt als "nicht da"
 * zurueck. Die Seite zeigt nie etwas ueber Menschen, das nicht ueber die vorhandenen Freigaben
 * (`get_workstyle_product_team`, `get_team_capability`) gelesen wurde.
 */
export type AlignTeamChoice = { id: string; name: string };

export type AlignTeamView = {
  id: string;
  name: string;
  /** Anzeigenamen der Mitglieder, in der Reihenfolge des Beitritts. */
  members: { userId: string; name: string }[];
  /** "ready": der gemeinsame Bericht ist lesbar. "waiting": es fehlen Freigaben oder Antworten. */
  workstyleReport: "ready" | "waiting";
  setup: { settled: number; awaitingConfirmation: number; started: boolean } | null;
  teamMap: { tiles: TeamMapTile[]; memberNames: Record<string, string> } | null;
};

export type AlignOverview = {
  own: Record<AlignPartKey, AlignPartState>;
  team: AlignTeamView | null;
  otherTeams: AlignTeamChoice[];
};

async function countOwn(client: Client, table: string, userId: string) {
  const { count, error } = await client.from(table).select("user_id", { count: "exact", head: true }).eq("user_id", userId);
  return error ? 0 : count ?? 0;
}

export async function getAlignOverview(params: {
  client: Client;
  userId: string;
  /** Aus der Adresse (`?team=`) oder dem zuletzt benutzten Team. */
  preferredTeamId: string | null;
  unnamed: string;
}): Promise<AlignOverview> {
  const { client, userId } = params;

  const [alignState, capabilityCount, strengthCount, directionCount, summaries] = await Promise.all([
    getAlignDashboardState(userId),
    countOwn(client, "person_capability_entries", userId),
    countOwn(client, "person_strengths", userId),
    countOwn(client, "direction_statements", userId),
    getFounderTeamDashboardSummaries(userId, client).catch(() => []),
  ]);

  const own: Record<AlignPartKey, AlignPartState> = {
    // Ist das Arbeitsprofil nicht lesbar, gilt es als fertig - lieber kein Schritt als einer auf falscher Annahme.
    work: alignState.show ? stateFromWorkProfile(alignWorkProfileState(alignState)) : "done",
    can: stateFromCount(capabilityCount),
    strengths: stateFromCount(strengthCount),
    direction: stateFromCount(directionCount),
  };
  for (const key of ALIGN_PART_KEYS) own[key] = own[key] ?? "open";

  // Ein Team sind zwei bis vier Founder; ein Vorhaben mit einer Person ist hier noch keines.
  const realTeams = summaries.filter((team) => team.members.length >= 2);
  const teamName = (team: (typeof summaries)[number]) =>
    team.name?.trim() || team.members.map((member) => member.displayName ?? params.unnamed).join(" + ");
  const selected = realTeams.find((team) => team.id === params.preferredTeamId) ?? realTeams[0] ?? null;
  const otherTeams = realTeams.filter((team) => team.id !== selected?.id).map((team) => ({ id: team.id, name: teamName(team) }));
  if (!selected) return { own, team: null, otherTeams };

  const [teamState, product, capability, vocabulary] = await Promise.all([
    getStartTeamState({ client, userId, teamId: selected.id, venture: "open" }).catch(() => null),
    getProductTeam(client, selected.id).catch(() => null),
    getTeamCapabilityForTeam(client, selected.id, userId, params.unnamed).catch(() => null),
    getCapabilityVocabulary(client).catch(() => null),
  ]);

  let teamMap: AlignTeamView["teamMap"] = null;
  if (capability && vocabulary) {
    const readout = buildCapabilityTeamReadout(
      capability.people.map((person) => ({
        userId: person.person_id,
        name: person.name,
        entries: person.capabilities.map((entry) => ({
          areaId: entry.area_id,
          applicationLevel: entry.application_level,
          ownershipWish: entry.ownership_wish,
        })),
      })),
      vocabulary.areas,
      vocabulary.families,
    );
    teamMap = {
      tiles: teamMapTiles(readout.families),
      memberNames: Object.fromEntries(readout.members.map((member) => [member.userId, member.name])),
    };
  }

  return {
    own,
    otherTeams,
    team: {
      id: selected.id,
      name: teamName(selected),
      members: selected.members.map((member) => ({ userId: member.userId, name: member.displayName?.trim() || params.unnamed })),
      workstyleReport: product && product !== "not_ready" ? "ready" : "waiting",
      setup: teamState?.setup
        ? {
            settled: teamState.setup.settled,
            awaitingConfirmation: teamState.setup.awaitingConfirmation,
            started: teamState.setup.started,
          }
        : null,
      teamMap,
    },
  };
}
