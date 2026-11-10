"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VALUES_MAX, isValueKey } from "@/features/values/valuesModel";

/** Werte schreiben (20270413120000). Wer darf, entscheidet die Datenbank; hier steht nur die Form der Eingabe. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const WERTE = "/me/profile/werte";

async function signedIn() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(WERTE)}`);
  return client;
}

export async function saveValuesAction(formData: FormData) {
  const client = await signedIn();
  const keys = formData.getAll("valueKey").map(String);
  const labels = formData.getAll("valueLabel").map(String);
  const meanings = formData.getAll("valueMeaning").map(String);
  const items = keys.flatMap((key, index): { key: string; label?: string; meaning: string }[] => {
    if (isValueKey(key)) return [{ key, meaning: meanings[index]?.trim().slice(0, 200) ?? "" }];
    const label = (labels[index] ?? "").trim().slice(0, 40);
    return key === "custom" && label ? [{ key, label, meaning: meanings[index]?.trim().slice(0, 200) ?? "" }] : [];
  }).slice(0, VALUES_MAX);
  const { error } = await client.rpc("save_person_values", { p_items: items, p_violated: String(formData.get("violated") ?? "").trim().slice(0, 300) || null });
  revalidatePath(WERTE);
  redirect(error ? `${WERTE}?fehler=1` : `${WERTE}?gespeichert=1`);
}

/** Mit einem Team teilen oder nicht - je Team einzeln. */
export async function setValuesTeamShareAction(formData: FormData) {
  const client = await signedIn();
  const teamId = String(formData.get("teamId") ?? "");
  if (!UUID.test(teamId)) redirect(WERTE);
  const { error } = await client.rpc("set_value_team_share", { p_team_id: teamId, p_on: formData.get("share") === "yes" });
  revalidatePath("/teams", "layout");
  redirect(`${WERTE}?${error ? "fehler=1" : "gespeichert=1"}#teilen`);
}

export async function setValuesConnectShowAction(formData: FormData) {
  const client = await signedIn();
  const { error } = await client.rpc("set_value_connect_show", { p_on: formData.get("show") === "yes" });
  revalidatePath("/connect", "layout");
  redirect(`${WERTE}?${error ? "fehler=1" : "gespeichert=1"}#teilen`);
}
