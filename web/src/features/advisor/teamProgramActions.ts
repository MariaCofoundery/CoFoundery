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
