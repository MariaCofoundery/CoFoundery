"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cleanHttps, isContactKind, isContactStatus } from "@/features/advisor/partners/partnersModel";

/** Partnerliste schreiben (20270415120000). Wer darf, entscheidet die Datenbank (Recht "Personen"); hier steht nur die Form. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuidOrNull = (value: unknown) => (UUID.test(String(value ?? "").trim()) ? String(value).trim() : null);

const back = (orgId: string | null, extra: Record<string, string> = {}) =>
  `/advisor/organisation?${new URLSearchParams({ ...(orgId ? { org: orgId } : {}), tab: "partners", ...extra }).toString()}`;

async function signedIn(next: string) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(next)}`);
  return client;
}

export async function saveContactAction(formData: FormData) {
  const orgId = uuidOrNull(formData.get("orgId"));
  const client = await signedIn(back(orgId));
  const contactId = uuidOrNull(formData.get("contactId"));
  const kinds = [...new Set(formData.getAll("kind").map(String).filter(isContactKind))].slice(0, 3);
  const status = String(formData.get("status") ?? "");
  const rawUrl = String(formData.get("url") ?? "").trim();
  const url = rawUrl ? cleanHttps(rawUrl) : null;
  if (rawUrl && !url) redirect(back(orgId, { eintrag: contactId ?? "neu", fehler: "url" }));
  const { data, error } = await client.rpc("save_org_contact", {
    p_contact_id: contactId, p_org_id: orgId, p_name: String(formData.get("name") ?? "").trim().slice(0, 120), p_kinds: kinds,
    p_company: String(formData.get("company") ?? "").trim().slice(0, 120) || null, p_email: String(formData.get("email") ?? "").trim().slice(0, 200) || null,
    p_phone: String(formData.get("phone") ?? "").trim().slice(0, 60) || null, p_url: url, p_notes: String(formData.get("notes") ?? "").trim().slice(0, 2000) || null,
    p_status: isContactStatus(status) ? status : "asked", p_owner_user_id: uuidOrNull(formData.get("owner")),
  });
  revalidatePath("/advisor/organisation");
  if (error || typeof data !== "string") redirect(back(orgId, { eintrag: contactId ?? "neu", fehler: "invalid" }));
  redirect(back(orgId, { eintrag: data as string, gespeichert: "1" }));
}

export async function deleteContactAction(formData: FormData) {
  const orgId = uuidOrNull(formData.get("orgId"));
  const client = await signedIn(back(orgId));
  const contactId = uuidOrNull(formData.get("contactId"));
  if (contactId) await client.rpc("delete_org_contact", { p_contact_id: contactId });
  revalidatePath("/advisor/organisation");
  redirect(back(orgId, { geloescht: "1" }));
}

export async function setContactEventAction(formData: FormData) {
  const orgId = uuidOrNull(formData.get("orgId"));
  const client = await signedIn(back(orgId));
  const contactId = uuidOrNull(formData.get("contactId"));
  const eventId = uuidOrNull(formData.get("eventId"));
  if (contactId && eventId) {
    await client.rpc("set_org_contact_event", { p_contact_id: contactId, p_event_id: eventId, p_role: String(formData.get("role") ?? "").trim().slice(0, 60) || null, p_on: formData.get("remove") !== "yes" });
  }
  revalidatePath("/advisor/organisation");
  redirect(back(orgId, { eintrag: contactId ?? "", gespeichert: "1" }));
}
