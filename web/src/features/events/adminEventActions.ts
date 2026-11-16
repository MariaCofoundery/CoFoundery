"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { berlinLocalToIso } from "@/lib/berlinTime";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { EVENT_STATUSES, isValidEventSlug, slugifyEventName, type EventStatus } from "@/features/events/adminEventModel";

const BASE = "/admin/veranstaltungen";

function errorKey(message: string): string {
  for (const key of ["event_slug_invalid", "event_slug_taken", "event_name_invalid", "event_end_required", "event_time_invalid", "event_has_participants"]) if (message.includes(key)) return key;
  return "save";
}

/** Anlegen oder aendern. Ohne Adressname wird er aus dem Namen gemacht. Alles Weitere prueft die Datenbank. */
export async function saveAdminEventAction(formData: FormData) {
  const client = await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim().toLowerCase();
  const slug = slugRaw || slugifyEventName(name);
  const statusRaw = String(formData.get("status") ?? "draft");
  const status: EventStatus = (EVENT_STATUSES as readonly string[]).includes(statusRaw) ? (statusRaw as EventStatus) : "draft";
  const starts = berlinLocalToIso(String(formData.get("starts_at") ?? ""));
  const ends = berlinLocalToIso(String(formData.get("ends_at") ?? ""));
  if (!isValidEventSlug(slug)) redirect(`${BASE}?error=event_slug_invalid`);
  const { error } = await client.rpc("admin_save_event", { p_id: id, p_slug: slug, p_name: name, p_status: status, p_starts_at: starts, p_ends_at: ends });
  if (error) redirect(`${BASE}?error=${errorKey(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?saved=${id ? "updated" : "created"}`);
}

export async function deleteAdminEventAction(formData: FormData) {
  const client = await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect(`${BASE}?error=save`);
  const { error } = await client.rpc("admin_delete_event", { p_id: id });
  if (error) redirect(`${BASE}?error=${errorKey(error.message)}`);
  revalidatePath(BASE);
  redirect(`${BASE}?saved=deleted`);
}
