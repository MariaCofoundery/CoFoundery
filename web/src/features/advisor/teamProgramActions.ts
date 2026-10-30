"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Team <-> Programm. Die Regeln stehen in der Datenbank (Migration
 * 20270117120000): wer einladen darf, wer zustimmen muss, wann ein Programm
 * aktiv ist. Hier steht nur, was aufgerufen wird.
 */

const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");

async function requireUser(next: string) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(next)}`);
  return client;
}

const orgSettings = (orgId: string, extra = "") =>
  `/advisor/organisation?org=${encodeURIComponent(orgId)}&tab=settings${extra}`;

/** Der Link steht NUR in der Antwort dieses Aufrufs - gespeichert wird nur der Hash. */
export async function createTeamProgramInviteAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgSettings(orgId));
  const token = randomBytes(24).toString("hex");
  const { error } = await client.rpc("create_team_program_invite", {
    p_org_id: orgId,
    p_token_hash: hashOf(token),
    p_label: String(formData.get("label") ?? "").trim().slice(0, 120) || null,
  });
  revalidatePath("/advisor/organisation");
  if (error) redirect(orgSettings(orgId, "&orgError=org_forbidden"));
  redirect(orgSettings(orgId, `&programInvite=${token}`));
}

export async function revokeTeamProgramInviteAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgSettings(orgId));
  await client.rpc("revoke_team_program_invite", { p_invite_id: String(formData.get("inviteId") ?? "") });
  revalidatePath("/advisor/organisation");
  redirect(orgSettings(orgId));
}

export async function setTeamProgramContactsAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const client = await requireUser(orgSettings(orgId));
  const { error } = await client.rpc("set_team_program_contacts", {
    p_program_id: String(formData.get("programId") ?? ""),
    p_advisor_user_ids: formData.getAll("contact").map(String),
  });
  revalidatePath("/advisor/organisation");
  redirect(orgSettings(orgId, error ? "&orgError=org_failed" : ""));
}

/** Das Team tritt bei: Wer einloest, stimmt fuer sich zu; die anderen folgen unter /programm. */
export async function startTeamProgramAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const client = await requireUser(`/programm/einladung/${token}`);
  const { error } = await client.rpc("start_team_program", {
    p_token_hash: hashOf(token),
    p_team_id: String(formData.get("teamId") ?? ""),
  });
  if (error) redirect(`/programm/einladung/${encodeURIComponent(token)}?fehler=1`);
  revalidatePath("/programm");
  redirect("/programm?neu=1");
}

export async function consentTeamProgramAction(formData: FormData) {
  const client = await requireUser("/programm");
  await client.rpc("consent_team_program", { p_program_id: String(formData.get("programId") ?? "") });
  revalidatePath("/programm");
  redirect("/programm");
}

export async function endTeamProgramAction(formData: FormData) {
  const client = await requireUser("/programm");
  await client.rpc("end_team_program", { p_program_id: String(formData.get("programId") ?? "") });
  revalidatePath("/programm");
  redirect("/programm");
}

/** Zurueck nur auf die eigenen Programmseiten - kein freies Ziel aus dem Formular. */
const safeReturn = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "");
  return text === "/programm" || /^\/advisor\/programm\/[0-9a-f-]{36}(\?tab=meilensteine)?$/.test(text) ? text : "/programm";
};
const toInt = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return /^\d{1,4}$/.test(text) ? Number(text) : null;
};

export async function saveProgramMilestoneAction(formData: FormData) {
  const back = safeReturn(formData.get("returnTo"));
  const client = await requireUser(back);
  const due = String(formData.get("dueOn") ?? "").trim();
  const target = toInt(formData.get("target"));
  await client.rpc("save_team_program_milestone", {
    p_program_id: String(formData.get("programId") ?? ""),
    p_milestone_id: String(formData.get("milestoneId") ?? "") || null,
    p_title: String(formData.get("title") ?? "").slice(0, 160),
    p_due_on: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
    p_target_count: target && target > 0 ? target : null,
    p_done_count: toInt(formData.get("done")) ?? 0,
  });
  revalidatePath("/programm");
  revalidatePath("/advisor/programm");
  redirect(back);
}

export async function deleteProgramMilestoneAction(formData: FormData) {
  const back = safeReturn(formData.get("returnTo"));
  const client = await requireUser(back);
  await client.rpc("delete_team_program_milestone", {
    p_program_id: String(formData.get("programId") ?? ""),
    p_milestone_id: String(formData.get("milestoneId") ?? ""),
  });
  revalidatePath("/programm");
  revalidatePath("/advisor/programm");
  redirect(back);
}
