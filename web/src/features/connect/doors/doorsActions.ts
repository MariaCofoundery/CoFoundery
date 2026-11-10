"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cleanRegion, isDoorCloseness, isDoorSector, isDoorType } from "@/features/connect/doors/doorCatalog";

/** Tueren schreiben (20270417120000). Wer darf, entscheidet die Datenbank (nur Mitglieder, nur die eigenen, hoechstens fuenf). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BACK = "/connect/profile";

async function signedIn() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(BACK)}`);
  return client;
}

export async function saveDoorAction(formData: FormData) {
  const client = await signedIn();
  const type = String(formData.get("type") ?? "");
  const closeness = String(formData.get("closeness") ?? "");
  const sector = String(formData.get("sector") ?? "");
  const id = String(formData.get("doorId") ?? "");
  const isOther = type === "other";
  if ((!isDoorType(type) && !isOther) || !isDoorCloseness(closeness) || (sector && !isDoorSector(sector))) redirect(`${BACK}?tuer=error#tueren`);
  const { error } = await client.rpc("save_network_door", {
    p_id: UUID.test(id) ? id : null, p_type: type, p_other_label: isOther ? String(formData.get("otherLabel") ?? "").trim().slice(0, 60) : null,
    p_sector: sector || null, p_region: cleanRegion(String(formData.get("region") ?? "")), p_closeness: closeness, p_note: String(formData.get("note") ?? "").trim().slice(0, 140) || null,
  });
  revalidatePath("/connect", "layout");
  redirect(`${BACK}?tuer=${error ? (/door_limit/.test(error.message) ? "limit" : /door_duplicate/.test(error.message) ? "duplicate" : "error") : "saved"}#tueren`);
}

export async function deleteDoorAction(formData: FormData) {
  const client = await signedIn();
  const id = String(formData.get("doorId") ?? "");
  if (UUID.test(id)) await client.rpc("delete_network_door", { p_id: id });
  revalidatePath("/connect", "layout");
  redirect(`${BACK}?tuer=saved#tueren`);
}

export async function setDoorsOpenAction(formData: FormData) {
  const client = await signedIn();
  await client.rpc("set_network_doors_open", { p_open: formData.get("open") === "yes" });
  revalidatePath("/connect", "layout");
  redirect(`${BACK}?tuer=saved#tueren`);
}
