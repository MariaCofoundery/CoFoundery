import "server-only";
import { createClient } from "@supabase/supabase-js";
import { newsletterToken } from "@/features/newsletter/newsletterToken";
import { issueFromRow } from "@/features/newsletter/newsletterModel";
import { renderNewsletterHtml, renderNewsletterText, type RenderContext } from "@/features/newsletter/newsletterRender";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";
import { sendNewsletterBatch, type NewsletterMail } from "@/lib/email/sendNewsletterIssueEmail";
import { getPublicAppOrigin, toPublicAppUrl } from "@/lib/publicAppOrigin";

/**
 * Wie viele Mails ein Lauf hoechstens verschickt (ein Paket). Das Tageslimit des Mail-Tarifs (Resend Free: 100 am Tag, geteilt mit Login-
 * und Systemmails) gilt zusaetzlich - darum bleibt der Standard bei 50 und laesst Platz fuer alles andere. Mit einem Tarif ohne Tageslimit
 * hebt man ihn ueber NEWSLETTER_DAILY_LIMIT an.
 */
const configured = Number(process.env.NEWSLETTER_DAILY_LIMIT);
export const NEWSLETTER_RUN_LIMIT = Number.isFinite(configured) && configured >= 1 ? Math.min(Math.floor(configured), 100) : 50;

export function newsletterImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  return `${base}/storage/v1/object/public/newsletter/${encodeURIComponent(path)}`;
}

export function renderContextFor(userId: string | null, secret: string): RenderContext {
  const origin = getPublicAppOrigin();
  return {
    appOrigin: origin,
    imageUrl: newsletterImageUrl,
    unsubscribeUrl: userId ? `${origin}/abmelden/newsletter?u=${encodeURIComponent(userId)}&t=${newsletterToken(userId, "unsubscribe", secret)}` : `${origin}/abmelden/newsletter`,
    privacyUrl: toPublicAppUrl("/datenschutz"),
    imprintUrl: toPublicAppUrl("/impressum"),
  };
}

/** Der Abmelde-Link der Nur-Newsletter-Liste: gehoert zu einer Anmeldung ohne Konto (eigene Seite, eigene Unterschrift). */
export function publicUnsubscribeUrl(subscriberId: string, secret: string, language: "de" | "en"): string {
  return `${getPublicAppOrigin()}/abmelden/newsletter/extern?i=${encodeURIComponent(subscriberId)}&t=${newsletterToken(subscriberId, "unsubscribe", secret)}&l=${language}`;
}

export function renderContextForPublic(subscriberId: string, secret: string, language: "de" | "en"): RenderContext {
  return { ...renderContextFor(null, secret), unsubscribeUrl: publicUnsubscribeUrl(subscriberId, secret, language) };
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Der Versandlauf (taeglich im Zeitplan und auf Knopfdruck im Admin): nimmt faellige Ausgaben, holt das naechste Paket
 * (eingetragen, BEVOR gesendet wird), schickt es und schliesst die Ausgabe, wenn niemand mehr offen ist.
 * Scheitert ein Paket, werden seine Eintraege zurueckgenommen - der naechste Lauf versucht es noch einmal.
 */
export async function runNewsletterSend(limit = NEWSLETTER_RUN_LIMIT): Promise<{ ok: true; sent: number; issues: number } | { ok: false; reason: string }> {
  const client = serviceClient();
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (!client || !secret) return { ok: false, reason: "not_configured" };
  const { data: due, error } = await client.rpc("due_newsletter_issues");
  if (error) return { ok: false, reason: "due_failed" };
  let sent = 0;
  const ids = ((due ?? []) as { id: string }[]).map((row) => row.id);
  for (const issueId of ids) {
    if (sent >= limit) break;
    const { data: row } = await client.from("newsletter_issues").select("*").eq("id", issueId).maybeSingle();
    if (!row) continue;
    const issue = issueFromRow(row as Record<string, unknown>);
    // Erst die Mitglieder, dann (je nach Zielgruppe) die Nur-Newsletter-Liste. Jede Gruppe traegt ein, BEVOR gesendet wird.
    const { data: batch, error: claimError } = await client.rpc("claim_newsletter_batch", { p_issue_id: issueId, p_limit: limit - sent });
    if (claimError) return { ok: false, reason: "claim_failed" };
    const userIds = ((batch ?? []) as { user_id: string }[]).map((entry) => entry.user_id);
    const mails: NewsletterMail[] = [];
    const delivered: string[] = [];
    for (const userId of userIds) {
      const recipient = await getNotificationRecipient(userId);
      if (!recipient) continue;
      const context = renderContextFor(userId, secret);
      mails.push({ to: recipient.email, subject: issue.subject, html: renderNewsletterHtml(issue, context), text: renderNewsletterText(issue, context), unsubscribeUrl: context.unsubscribeUrl });
      delivered.push(userId);
    }
    const publicMails: NewsletterMail[] = [];
    const publicDelivered: string[] = [];
    const room = limit - sent - mails.length;
    if (room > 0) {
      const { data: publicBatch, error: publicError } = await client.rpc("claim_newsletter_public_batch", { p_issue_id: issueId, p_limit: room });
      if (publicError) return { ok: false, reason: "claim_failed" };
      for (const entry of (publicBatch ?? []) as { subscriber_id: string; email: string; language: "de" | "en" }[]) {
        const context = renderContextForPublic(entry.subscriber_id, secret, entry.language);
        publicMails.push({ to: entry.email, subject: issue.subject, html: renderNewsletterHtml(issue, context), text: renderNewsletterText(issue, context), unsubscribeUrl: context.unsubscribeUrl });
        publicDelivered.push(entry.subscriber_id);
      }
    }
    const all = [...mails, ...publicMails];
    const result = await sendNewsletterBatch(all);
    if (!result.ok) {
      // Das Paket ist nicht rausgegangen: Eintraege zurueck, damit niemand durchrutscht.
      if (delivered.length) await client.from("newsletter_deliveries").delete().eq("issue_id", issueId).in("user_id", delivered);
      if (publicDelivered.length) await client.from("newsletter_public_deliveries").delete().eq("issue_id", issueId).in("subscriber_id", publicDelivered);
      return { ok: false, reason: result.error };
    }
    sent += all.length;
    await client.rpc("finish_newsletter_if_done", { p_issue_id: issueId });
  }
  return { ok: true, sent, issues: ids.length };
}
