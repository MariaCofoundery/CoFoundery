"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  TEST_PROJECT_LIMITS,
  isTestProjectOutcome,
  isTestProjectPhase,
  isTestProjectTemplateKey,
  sanitizeTestProjectItems,
  testProjectHref,
  type TestProjectItem,
} from "@/features/testProject/testProjectModel";

export type TestProjectActionResult = { ok: true; projectId?: string; status?: string } | { ok: false; error: string };

export type TestProjectDraftInput = {
  projectId: string | null;
  templateKey: string | null;
  title: string;
  task: string;
  weeks: number;
  roles: string;
  note: string;
  done: TestProjectItem[];
  rights: TestProjectItem[];
  closing: TestProjectItem[];
};

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

async function authenticated() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

function refresh(teamId: string, relationshipId: string) {
  revalidatePath(`/teams/${teamId}`);
  revalidatePath(testProjectHref(teamId, relationshipId));
}

/** Die Datenbank liefert benannte Fehler; die Oberflaeche braucht nur einen Schluessel. */
function errorKey(message: string | undefined) {
  const known = [
    "test_project_version_changed", "test_project_incomplete", "test_project_not_editable",
    "test_project_already_open", "test_project_phase_locked", "test_project_input_invalid",
  ];
  return known.find((key) => message?.includes(key)) ?? "test_project_unavailable";
}

export async function saveTestProjectDraftAction(
  teamId: string,
  relationshipId: string,
  input: TestProjectDraftInput
): Promise<TestProjectActionResult> {
  const auth = await authenticated();
  if (!auth) return { ok: false, error: "test_project_unavailable" };
  const weeks = Number.isInteger(input.weeks) ? input.weeks : 2;
  const { data, error } = await auth.supabase.rpc("save_test_project_draft", {
    p_relationship_id: relationshipId,
    p_project_id: input.projectId,
    p_template_key: isTestProjectTemplateKey(input.templateKey),
    p_title: text(input.title, TEST_PROJECT_LIMITS.title),
    p_task: text(input.task, TEST_PROJECT_LIMITS.task),
    p_weeks: Math.min(TEST_PROJECT_LIMITS.weeksMax, Math.max(TEST_PROJECT_LIMITS.weeksMin, weeks)),
    p_roles: text(input.roles, TEST_PROJECT_LIMITS.roles),
    p_note: text(input.note, TEST_PROJECT_LIMITS.note),
    p_done: sanitizeTestProjectItems(input.done),
    p_rights: sanitizeTestProjectItems(input.rights),
    p_closing: sanitizeTestProjectItems(input.closing),
  });
  if (error) return { ok: false, error: errorKey(error.message) };
  refresh(teamId, relationshipId);
  return { ok: true, projectId: typeof data === "string" ? data : undefined };
}

export async function agreeTestProjectAction(
  teamId: string,
  relationshipId: string,
  projectId: string,
  version: number
): Promise<TestProjectActionResult> {
  const auth = await authenticated();
  if (!auth) return { ok: false, error: "test_project_unavailable" };
  const { data, error } = await auth.supabase.rpc("agree_test_project", { p_project_id: projectId, p_version: version });
  if (error) return { ok: false, error: errorKey(error.message) };
  refresh(teamId, relationshipId);
  return { ok: true, status: typeof data === "string" ? data : undefined };
}

export async function withdrawTestProjectAgreementAction(
  teamId: string,
  relationshipId: string,
  projectId: string
): Promise<TestProjectActionResult> {
  const auth = await authenticated();
  if (!auth) return { ok: false, error: "test_project_unavailable" };
  const { error } = await auth.supabase.rpc("withdraw_test_project_agreement", { p_project_id: projectId });
  if (error) return { ok: false, error: errorKey(error.message) };
  refresh(teamId, relationshipId);
  return { ok: true };
}

export async function cancelTestProjectAction(
  teamId: string,
  relationshipId: string,
  projectId: string
): Promise<TestProjectActionResult> {
  const auth = await authenticated();
  if (!auth) return { ok: false, error: "test_project_unavailable" };
  const { error } = await auth.supabase.rpc("cancel_test_project", { p_project_id: projectId });
  if (error) return { ok: false, error: errorKey(error.message) };
  refresh(teamId, relationshipId);
  return { ok: true };
}

export async function submitTestProjectResponseAction(
  teamId: string,
  relationshipId: string,
  projectId: string,
  phase: string,
  answers: Array<{ q: string; a: string }>,
  outcome: string | null
): Promise<TestProjectActionResult> {
  const auth = await authenticated();
  if (!auth) return { ok: false, error: "test_project_unavailable" };
  const checkedPhase = isTestProjectPhase(phase);
  if (!checkedPhase) return { ok: false, error: "test_project_input_invalid" };
  const { data, error } = await auth.supabase.rpc("submit_test_project_response", {
    p_project_id: projectId,
    p_phase: checkedPhase,
    p_answers: (Array.isArray(answers) ? answers : []).slice(0, TEST_PROJECT_LIMITS.items).map((entry) => ({
      q: text(entry?.q, TEST_PROJECT_LIMITS.question),
      a: text(entry?.a, TEST_PROJECT_LIMITS.answer),
    })),
    p_outcome: checkedPhase === "closing" ? isTestProjectOutcome(outcome) : null,
  });
  if (error) return { ok: false, error: errorKey(error.message) };
  refresh(teamId, relationshipId);
  return { ok: true, status: typeof data === "string" ? data : undefined };
}
