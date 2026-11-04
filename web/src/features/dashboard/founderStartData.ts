import "server-only";

import { getCheckInCardState } from "@/features/checkIn/checkInData";
import { getProductTeam } from "@/features/reporting/workstyle/data";
import { teamAreaFinding, teamCard } from "@/features/reporting/workstyle/narrative";
import { AREAS, validProductTeam } from "@/features/reporting/workstyle/model";
import { getFounderSetup } from "@/features/teams/founderSetupData";
import type { StartTeamInput } from "@/features/dashboard/founderStart";
import type { AppLocale } from "@/i18n/config";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Was die Startseite ueber das gewaehlte Team wissen muss - und nur das.
 *
 * Jede Abfrage laeuft mit dem Client der Person; was sie nicht lesen darf,
 * kommt als "nicht da" zurueck, nie als Fehler der Seite. Es wird nichts
 * angelegt: Ein Blick auf die Startseite darf kein Team, kein Setup und kein
 * Testprojekt erzeugen.
 */
export async function getStartTeamState(params: {
  client: Client;
  userId: string;
  teamId: string;
  venture: StartTeamInput["venture"];
}): Promise<StartTeamInput> {
  const { client, userId, teamId } = params;
  const [setup, testProject] = await Promise.all([
    getFounderSetup(teamId, userId, client).catch(() => null),
    testProjectState(client, userId, teamId),
  ]);
  const checkIn = setup ? await getCheckInCardState(teamId, setup.items, client).catch(() => null) : null;
  return {
    id: teamId,
    venture: params.venture,
    setup: setup
      ? {
          total: setup.items.length,
          // Eine fruehere Absprache, die die aktuellen Mitglieder noch nicht
          // bestaetigt haben, steht nicht (siehe `founderSetupModel`).
          settled: setup.items.filter((item) => item.stage === "settled" && !item.rosterConfirmationMissing).length,
          awaitingConfirmation: setup.items.filter((item) => item.stage === "awaiting_confirmation").length,
          started: setup.started,
        }
      : null,
    testProject,
    rhythmSet: checkIn?.rhythmSet ?? false,
    checkIn: checkIn ? { state: checkIn.state, due: checkIn.due?.toISOString() ?? null } : null,
  };
}

/** Das Testprojekt zaehlt fuer die Person, wenn eines ihrer Paare im Team eines hat. */
async function testProjectState(client: Client, userId: string, teamId: string): Promise<StartTeamInput["testProject"]> {
  try {
    const { data: pairs, error } = await client
      .from("relationships")
      .select("id")
      .eq("founder_team_id", teamId)
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
    if (error || !pairs?.length) return "none";
    const { data: projects, error: projectError } = await client
      .from("relationship_test_projects")
      .select("status")
      .in("relationship_id", pairs.map((pair) => pair.id as string));
    if (projectError) return "none";
    const statuses = new Set((projects ?? []).map((project) => project.status as string));
    if (statuses.has("closed")) return "closed";
    if (statuses.has("active")) return "active";
    if (statuses.has("draft")) return "draft";
    return "none";
  } catch {
    return "none";
  }
}

/**
 * "Fuer euer naechstes Gespraech": eine Frage aus dem eigenen Teambericht.
 *
 * Dieselben Gespraechskarten wie im Bericht (`teamCard`), zuerst die Bereiche,
 * in denen ihr gegensaetzlich antwortet. Welche davon heute dasteht, wechselt
 * mit dem Tag - eine Abwechslung, keine Rangfolge. Gibt es keinen gemeinsam
 * lesbaren Bericht (nicht alle haben geteilt), gibt es keine Frage.
 */
export async function getStartConversationPrompt(params: {
  client: Client;
  teamId: string;
  locale: AppLocale;
  dayIndex: number;
}): Promise<{ label: string; question: string } | null> {
  try {
    const team = await getProductTeam(params.client, params.teamId);
    if (!team || team === "not_ready" || !validProductTeam(team)) return null;
    const members = team.people.map((person) => ({ person_id: person.person_id, name: person.name, profile: person.workstyle }));
    const opposite = AREAS.filter((area) => teamAreaFinding(members, area.key, params.locale).kind === "opposite");
    const candidates = opposite.length > 0 ? opposite : AREAS;
    const area = candidates[params.dayIndex % candidates.length];
    return teamCard(area.key, params.locale);
  } catch {
    return null;
  }
}
