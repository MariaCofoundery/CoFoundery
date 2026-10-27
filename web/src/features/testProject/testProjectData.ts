import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getFounderTeamHomebase } from "@/features/teams/founderTeamHomebaseData";
import {
  isTestProjectOutcome,
  isTestProjectPhase,
  isTestProjectStatus,
  isTestProjectTemplateKey,
  normalizeTestProjectAnswers,
  normalizeTestProjectItems,
  type TestProject,
  type TestProjectAgreement,
  type TestProjectResponse,
} from "@/features/testProject/testProjectModel";

type Client = Awaited<ReturnType<typeof createClient>>;

const PROJECT_COLUMNS =
  "id, relationship_id, created_by_user_id, template_key, title, task, weeks, roles, note, done_items, rights_items, closing_items, draft_version, status, started_at, ends_at, closed_at";

function toProject(row: Record<string, unknown>): TestProject | null {
  const status = isTestProjectStatus(row.status);
  if (!status) return null;
  return {
    id: String(row.id),
    relationshipId: String(row.relationship_id),
    createdBy: typeof row.created_by_user_id === "string" ? row.created_by_user_id : null,
    templateKey: isTestProjectTemplateKey(row.template_key),
    title: typeof row.title === "string" ? row.title : "",
    task: typeof row.task === "string" ? row.task : "",
    weeks: typeof row.weeks === "number" ? row.weeks : 2,
    roles: typeof row.roles === "string" ? row.roles : "",
    note: typeof row.note === "string" ? row.note : "",
    doneItems: normalizeTestProjectItems(row.done_items),
    rightsItems: normalizeTestProjectItems(row.rights_items),
    closingItems: normalizeTestProjectItems(row.closing_items),
    draftVersion: typeof row.draft_version === "number" ? row.draft_version : 1,
    status,
    startedAt: typeof row.started_at === "string" ? row.started_at : null,
    endsAt: typeof row.ends_at === "string" ? row.ends_at : null,
    closedAt: typeof row.closed_at === "string" ? row.closed_at : null,
  };
}

/**
 * Das Testprojekt eines Paares innerhalb eines Teams.
 *
 * `current` ist das laufende oder entworfene Projekt, `previous` das zuletzt
 * beendete oder abgebrochene. Antworten der anderen Person liefert die
 * Datenbank erst, wenn beide die Phase abgegeben haben (Zeilenzugriff), nicht
 * erst diese Funktion.
 */
export async function getTestProject(
  teamId: string,
  relationshipId: string,
  currentUserId: string,
  client?: Client
) {
  const supabase = client ?? (await createClient());
  const team = await getFounderTeamHomebase(teamId, currentUserId, supabase);
  const pair = team?.alignment.find((entry) => entry.relationshipId === relationshipId);
  if (!team || !pair) return null;

  const projectsResult = await supabase
    .from("relationship_test_projects")
    .select(PROJECT_COLUMNS)
    .eq("relationship_id", relationshipId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (projectsResult.error) throw new Error("test_project_unavailable");
  const projects = ((projectsResult.data ?? []) as Array<Record<string, unknown>>)
    .map(toProject)
    .filter((project): project is TestProject => project !== null);
  const current = projects.find((project) => project.status === "draft" || project.status === "active") ?? null;
  const previous = projects.find((project) => project.status === "closed" || project.status === "cancelled") ?? null;

  const shownIds = [current?.id, previous?.id].filter((id): id is string => Boolean(id));
  const [agreementResult, responseResult] = shownIds.length === 0
    ? [{ data: [], error: null }, { data: [], error: null }]
    : await Promise.all([
        supabase.from("relationship_test_project_agreements").select("project_id, user_id, draft_version").in("project_id", shownIds),
        supabase.from("relationship_test_project_responses").select("project_id, user_id, phase, answers, outcome").in("project_id", shownIds),
      ]);
  if (agreementResult.error || responseResult.error) throw new Error("test_project_unavailable");

  const agreementsByProject = new Map<string, TestProjectAgreement[]>();
  for (const row of (agreementResult.data ?? []) as Array<Record<string, unknown>>) {
    const list = agreementsByProject.get(String(row.project_id)) ?? [];
    list.push({ userId: String(row.user_id), draftVersion: typeof row.draft_version === "number" ? row.draft_version : 0 });
    agreementsByProject.set(String(row.project_id), list);
  }
  const responsesByProject = new Map<string, TestProjectResponse[]>();
  for (const row of (responseResult.data ?? []) as Array<Record<string, unknown>>) {
    const phase = isTestProjectPhase(row.phase);
    if (!phase) continue;
    const list = responsesByProject.get(String(row.project_id)) ?? [];
    list.push({
      userId: String(row.user_id),
      phase,
      answers: normalizeTestProjectAnswers(row.answers),
      outcome: isTestProjectOutcome(row.outcome),
    });
    responsesByProject.set(String(row.project_id), list);
  }

  const names = new Map(team.members.map((member, index) => [member.userId, member.displayName ?? `Founder ${index + 1}`]));
  return {
    teamId,
    relationshipId,
    participantUserIds: pair.participantUserIds,
    participantNames: pair.participantUserIds.map((id) => names.get(id) ?? "Founder"),
    current,
    currentAgreements: current ? agreementsByProject.get(current.id) ?? [] : [],
    currentResponses: current ? responsesByProject.get(current.id) ?? [] : [],
    previous,
    previousResponses: previous ? responsesByProject.get(previous.id) ?? [] : [],
  };
}

export type TestProjectView = NonNullable<Awaited<ReturnType<typeof getTestProject>>>;
