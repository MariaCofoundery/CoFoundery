"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { emptyIssue, issueToPayload, normalizeIssue } from "@/features/newsletter/newsletterModel";
import { renderNewsletterHtml, renderNewsletterText } from "@/features/newsletter/newsletterRender";
import { renderContextFor, runNewsletterSend } from "@/features/newsletter/newsletterSend";
import { sendNewsletterBatch } from "@/lib/email/sendNewsletterIssueEmail";
import { berlinLocalToIso } from "@/lib/berlinTime";
import { getRequestUser } from "@/lib/supabase/server";

const BASE = "/admin/newsletter";
export type ActionResult = { ok: true; id?: string; message?: string; path?: string } | { ok: false; error: string };

/** Eine neue Ausgabe: der Look der letzten wird uebernommen, damit er nicht jedes Mal neu gewaehlt werden muss. */
export async function createNewsletterIssueAction() {
  const client = await requirePlatformAdmin();
  const { data: last } = await client.rpc("admin_list_newsletter_issues");
  const lastId = ((last ?? []) as { id: string }[])[0]?.id;
  let base = {};
  if (lastId) {
    const { data } = await client.rpc("admin_get_newsletter_issue", { p_id: lastId });
    const row = (data as Record<string, unknown>[] | null)?.[0];
    if (row) base = { look: row.look, accent: row.accent, headerMode: row.header_mode, font: row.font, buttonStyle: row.button_style, headingCase: row.heading_case };
  }
  const { data: id, error } = await client.rpc("admin_save_newsletter_issue", { p_id: null, p: issueToPayload(emptyIssue(base)) });
  if (error || !id) redirect(`${BASE}?error=create`);
  redirect(`${BASE}/${id}`);
}

export async function saveNewsletterIssueAction(id: string, raw: unknown): Promise<ActionResult> {
  const client = await requirePlatformAdmin();
  const issue = normalizeIssue((raw ?? {}) as Record<string, unknown>);
  const { error } = await client.rpc("admin_save_newsletter_issue", { p_id: id, p: issueToPayload(issue) });
  if (error) return { ok: false, error: error.message.includes("newsletter_locked") ? "locked" : "save" };
  revalidatePath(BASE);
  return { ok: true };
}

const SIGNATURES: { type: string; ext: string; bytes: number[] }[] = [
  { type: "image/jpeg", ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/png", ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
];

/** Bild hochladen: JPG oder PNG bis 1 MB, geprueft am Dateikopf (nicht am Namen). Der Dienst schreibt, nach Admin-Pruefung. */
export async function uploadNewsletterImageAction(formData: FormData): Promise<ActionResult> {
  await requirePlatformAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "no_file" };
  if (file.size > 1_048_576) return { ok: false, error: "too_big" };
  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = SIGNATURES.find((entry) => entry.bytes.every((byte, index) => buffer[index] === byte));
  if (!kind) return { ok: false, error: "type" };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, error: "not_configured" };
  const service = createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const path = `${randomUUID()}.${kind.ext}`;
  const { error } = await service.storage.from("newsletter").upload(path, buffer, { contentType: kind.type, upsert: false });
  if (error) return { ok: false, error: "upload" };
  return { ok: true, path };
}

/** Testmail an die eigene Adresse, aus dem aktuellen Stand im Editor (auch ungespeichert). */
export async function sendNewsletterTestAction(raw: unknown): Promise<ActionResult> {
  await requirePlatformAdmin();
  const { data: { user } } = await getRequestUser();
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (!user?.email || !secret) return { ok: false, error: "not_configured" };
  const issue = normalizeIssue((raw ?? {}) as Record<string, unknown>);
  const context = renderContextFor(user.id, secret);
  const result = await sendNewsletterBatch([{ to: user.email, subject: `[Test] ${issue.subject || "Aus dem Netzwerk"}`, html: renderNewsletterHtml(issue, context), text: renderNewsletterText(issue, context), unsubscribeUrl: context.unsubscribeUrl }]);
  return result.ok ? { ok: true, message: "test_sent" } : { ok: false, error: "send" };
}

/** Einplanen: Zeitpunkt in Berliner Zeit. Davor wird der aktuelle Stand gespeichert. */
export async function scheduleNewsletterAction(id: string, raw: unknown, local: string): Promise<ActionResult> {
  const client = await requirePlatformAdmin();
  const when = berlinLocalToIso(local);
  if (!when) return { ok: false, error: "time" };
  const saved = await saveNewsletterIssueAction(id, raw);
  if (!saved.ok) return saved;
  const { error } = await client.rpc("admin_set_newsletter_status", { p_id: id, p_status: "scheduled", p_scheduled_for: when });
  if (error) return { ok: false, error: error.message.includes("newsletter_incomplete") ? "incomplete" : error.message.includes("newsletter_time") ? "time" : "schedule" };
  revalidatePath(BASE);
  return { ok: true };
}

export async function unscheduleNewsletterAction(id: string): Promise<ActionResult> {
  const client = await requirePlatformAdmin();
  const { error } = await client.rpc("admin_set_newsletter_status", { p_id: id, p_status: "draft", p_scheduled_for: null });
  if (error) return { ok: false, error: "unschedule" };
  revalidatePath(BASE);
  return { ok: true };
}

/** "Jetzt senden": plant fuer jetzt ein und schickt das erste Paket. Weitere Pakete gehen im taeglichen Lauf oder mit "Naechstes Paket senden". */
export async function sendNewsletterNowAction(id: string, raw: unknown): Promise<ActionResult> {
  const client = await requirePlatformAdmin();
  const { data } = await client.rpc("admin_get_newsletter_issue", { p_id: id });
  const status = (data as { status?: string }[] | null)?.[0]?.status;
  if (status === "scheduled") await client.rpc("admin_set_newsletter_status", { p_id: id, p_status: "draft", p_scheduled_for: null });
  if (status === "draft" || status === "scheduled") {
    const saved = await saveNewsletterIssueAction(id, raw);
    if (!saved.ok) return saved;
    const { error } = await client.rpc("admin_set_newsletter_status", { p_id: id, p_status: "scheduled", p_scheduled_for: new Date().toISOString() });
    if (error) return { ok: false, error: error.message.includes("newsletter_incomplete") ? "incomplete" : "schedule" };
  }
  const run = await runNewsletterSend();
  revalidatePath(BASE);
  return run.ok ? { ok: true, message: `sent:${run.sent}` } : { ok: false, error: "send" };
}
