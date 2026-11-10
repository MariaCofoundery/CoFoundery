"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAiItemKey, isAiToolMode, isHttpsUrl } from "@/features/aiStart/aiStartModel";

/**
 * KI-Checkliste schreiben (20270412120000). Wer darf, entscheidet die Datenbank; hier steht nur die Form der Eingabe. Der
 * Rueckweg wird zusammengesetzt, nie uebernommen.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuidOrNull = (value: unknown) => {
  const text = String(value ?? "").trim();
  return UUID.test(text) ? text : null;
};
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

async function signedIn() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect("/login");
  return client;
}

const teamPath = (teamId: string, extra = "") => `/teams/${teamId}/ki-start${extra}`;

function done(path: string): never {
  revalidatePath("/teams", "layout");
  redirect(path);
}

export async function saveAiItemAction(formData: FormData) {
  const client = await signedIn();
  const teamId = uuidOrNull(formData.get("teamId"));
  if (!teamId) redirect("/dashboard");
  const key = String(formData.get("itemKey") ?? "");
  const state = String(formData.get("state") ?? "");
  if (!isAiItemKey(key)) done(teamPath(teamId as string, "?fehler=1"));
  const { error } = await client.rpc("save_team_ai_item", { p_team_id: teamId, p_item_key: key, p_state: state === "done" || state === "skip" ? state : null, p_note: text(formData.get("note"), 500) || null });
  done(teamPath(teamId as string, error ? "?fehler=1" : `?gespeichert=1#frage-${key}`));
}

export async function saveAiToolAction(formData: FormData) {
  const client = await signedIn();
  const teamId = uuidOrNull(formData.get("teamId"));
  if (!teamId) redirect("/dashboard");
  const mode = String(formData.get("mode") ?? "hand");
  const { error } = await client.rpc("save_team_ai_tool", {
    p_team_id: teamId,
    p_id: uuidOrNull(formData.get("id")),
    p_name: text(formData.get("name"), 80),
    p_purpose: text(formData.get("purpose"), 200) || null,
    p_access_user_ids: formData.getAll("access").map(uuidOrNull).filter((value): value is string => value !== null),
    p_mode: isAiToolMode(mode) ? mode : "hand",
    p_connected_to: text(formData.get("connectedTo"), 200) || null,
  });
  done(teamPath(teamId as string, error ? "?fehler=1#werkzeuge" : "?gespeichert=1#werkzeuge"));
}

export async function deleteAiToolAction(formData: FormData) {
  const client = await signedIn();
  const teamId = uuidOrNull(formData.get("teamId"));
  const id = uuidOrNull(formData.get("id"));
  if (id) await client.rpc("delete_team_ai_tool", { p_id: id });
  done(teamId ? teamPath(teamId, "#werkzeuge") : "/dashboard");
}

export async function saveAiFlowAction(formData: FormData) {
  const client = await signedIn();
  const teamId = uuidOrNull(formData.get("teamId"));
  if (!teamId) redirect("/dashboard");
  const texts = formData.getAll("stepText").map((value) => text(value, 120));
  const whos = formData.getAll("stepWho").map((value) => String(value ?? ""));
  const modes = formData.getAll("stepMode").map((value) => String(value ?? ""));
  const steps = texts.flatMap((step, index) => (step ? [{ text: step, who: whos[index] === "system" ? "system" : uuidOrNull(whos[index]), mode: modes[index] === "auto" ? "auto" : "hand" }] : [])).slice(0, 12);
  const { error } = await client.rpc("save_team_ai_flow", { p_team_id: teamId, p_id: uuidOrNull(formData.get("id")), p_name: text(formData.get("name"), 120), p_steps: steps });
  done(teamPath(teamId as string, error ? "?fehler=1#ablaeufe" : "?gespeichert=1#ablaeufe"));
}

export async function deleteAiFlowAction(formData: FormData) {
  const client = await signedIn();
  const teamId = uuidOrNull(formData.get("teamId"));
  const id = uuidOrNull(formData.get("id"));
  if (id) await client.rpc("delete_team_ai_flow", { p_id: id });
  done(teamId ? teamPath(teamId, "#ablaeufe") : "/dashboard");
}

/** Programmtipp der Organisation: Schalter, Hinweis und bis zu acht https-Links. */
export async function saveOrgAiTipAction(formData: FormData) {
  const client = await signedIn();
  const orgId = uuidOrNull(formData.get("orgId"));
  if (!orgId) redirect("/advisor/organisation");
  const labels = formData.getAll("linkLabel").map((value) => text(value, 80));
  const urls = formData.getAll("linkUrl").map((value) => text(value, 400));
  const links = labels.flatMap((label, index) => (label && isHttpsUrl(urls[index] ?? "") ? [{ label, url: urls[index] }] : [])).slice(0, 8);
  const { error } = await client.rpc("save_org_ai_tip", { p_org_id: orgId, p_enabled: formData.get("enabled") === "yes", p_note: text(formData.get("note"), 500) || null, p_links: links });
  revalidatePath("/advisor/organisation");
  redirect(`/advisor/organisation?org=${orgId}&tab=page&${error ? "pageError=failed" : "pageSaved=1"}#ki-tipp`);
}
