"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { getRequestLocale } from "@/i18n/getLocale";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { parseAnnouncementForm } from "@/features/announcements/announcementModel";

const PAGE = "/admin/announcements";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PendingAnnouncement = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
};

/* -------------------------------------------------------------------------
   Admin-Bereich
   ------------------------------------------------------------------------- */

export async function saveAnnouncementAction(formData: FormData) {
  const client = await requirePlatformAdmin();
  const parsed = parseAnnouncementForm(formData);
  if (!parsed.ok) redirect(`${PAGE}?result=invalid`);
  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" && UUID.test(idRaw) ? idRaw : null;
  const v = parsed.value;
  const { error } = await client.rpc("admin_save_announcement", {
    p_id: id,
    p_title_de: v.titleDe,
    p_body_de: v.bodyDe,
    p_title_en: v.titleEn,
    p_body_en: v.bodyEn,
    p_cta_label_de: v.ctaLabelDe,
    p_cta_label_en: v.ctaLabelEn,
    p_cta_href: v.ctaHref,
    p_show_once: v.showOnce,
    p_starts_at: v.startsAt,
    p_ends_at: v.endsAt,
  });
  if (error) redirect(`${PAGE}?result=${error.code === "P0002" ? "notfound" : error.code === "23514" ? "invalid" : "error"}`);
  revalidatePath(PAGE);
  redirect(`${PAGE}?result=saved`);
}

export async function setAnnouncementStatusAction(formData: FormData) {
  const client = await requirePlatformAdmin();
  const id = formData.get("id");
  const status = formData.get("status");
  if (typeof id !== "string" || !UUID.test(id) || !["draft", "active", "archived"].includes(String(status))) {
    redirect(`${PAGE}?result=invalid`);
  }
  const { error } = await client.rpc("admin_set_announcement_status", { p_id: id, p_status: status });
  if (error) redirect(`${PAGE}?result=${error.code === "P0002" ? "notfound" : "error"}`);
  revalidatePath(PAGE);
  redirect(`${PAGE}?result=status`);
}

/* -------------------------------------------------------------------------
   Fuer alle Angemeldeten
   ------------------------------------------------------------------------- */

/**
 * Die naechste Mitteilung, falls es eine gibt. Beim Abholen wird sie als
 * "gesehen" vermerkt - der Aufruf darf deshalb erst kommen, wenn sie auch
 * gezeigt wird (siehe AnnouncementPopup).
 */
export async function getPendingAnnouncementAction(): Promise<PendingAnnouncement | null> {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) return null;
  const client = await createClient();
  const locale = await getRequestLocale();
  const { data, error } = await client.rpc("get_pending_announcement", { p_locale: locale });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as { id: string; title: string; body: string; cta_label: string | null; cta_href: string | null };
  return { id: row.id, title: row.title, body: row.body, ctaLabel: row.cta_label, ctaHref: row.cta_href };
}

export async function dismissAnnouncementAction(id: string): Promise<{ ok: boolean }> {
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false };
  const client = await createClient();
  const { error } = await client.rpc("dismiss_announcement", { p_id: id });
  if (error) return { ok: false };
  revalidatePath("/messages");
  return { ok: true };
}
