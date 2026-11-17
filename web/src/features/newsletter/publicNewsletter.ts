import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { newsletterToken } from "@/features/newsletter/newsletterToken";
import { publicUnsubscribeUrl } from "@/features/newsletter/newsletterSend";
import { sendPublicNewsletterConfirmEmail } from "@/lib/email/sendPublicNewsletterConfirmEmail";
import { sendNewsletterWelcomeEmail } from "@/lib/email/sendNewsletterWelcomeEmail";
import { getPublicAppOrigin, toPublicAppUrl } from "@/lib/publicAppOrigin";
import type { PublicNewsletterLanguage } from "@/features/newsletter/publicNewsletterCopy";

/**
 * Newsletter-Anmeldung OHNE Konto (aus dem Blog): eine eigene Liste, Double-Opt-in, keine Verbindung zu Konten. Alles laeuft ueber den Dienst-Schluessel;
 * der Browser kommt nie direkt an die Daten. Der Aufrufer bekommt nur ein grobes Ergebnis - ob eine Adresse schon eingetragen ist, wird nie verraten.
 */
export type PublicSubscribeOutcome = "sent" | "invalid" | "rate" | "error";

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function publicConfirmUrl(subscriberId: string, secret: string, language: PublicNewsletterLanguage): string {
  return `${getPublicAppOrigin()}/newsletter/bestaetigen/extern?i=${encodeURIComponent(subscriberId)}&t=${newsletterToken(subscriberId, "confirm", secret)}&l=${language}`;
}

export async function requestPublicNewsletter(email: string, language: PublicNewsletterLanguage): Promise<PublicSubscribeOutcome> {
  const client = serviceClient();
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (!client || !secret) return "error";
  const { data, error } = await client.rpc("request_public_newsletter", { p_email: email, p_language: language });
  const row = ((data ?? []) as { result: string; subscriber_id: string | null }[])[0];
  if (error || !row) return "error";
  if (row.result === "invalid") return "invalid";
  if (row.result === "rate") return "rate";
  // "already" und "wait" sehen von aussen wie "sent" aus: nichts verraten, nichts doppelt schicken.
  if (row.result !== "sent" || !row.subscriber_id) return "sent";
  const mail = await sendPublicNewsletterConfirmEmail({ recipientEmail: email.trim().toLowerCase(), confirmUrl: publicConfirmUrl(row.subscriber_id, secret, language), language });
  return mail.ok ? "sent" : "error";
}

/** Bestaetigen (aus der Mail); bei NEUER Zusage genau eine Willkommensmail, mit Hinweis auf die App. Ein Fehler beim Senden kippt die Zusage nicht. */
export async function confirmPublicNewsletter(subscriberId: string, secret: string): Promise<boolean> {
  const client = serviceClient();
  if (!client) return false;
  const { data: confirmed } = await client.rpc("confirm_public_newsletter", { p_id: subscriberId });
  if (confirmed !== true) return false;
  try {
    const { data: claimed } = await client.rpc("claim_public_newsletter_welcome", { p_id: subscriberId });
    if (claimed !== true) return true;
    const { data } = await client.rpc("get_public_newsletter_subscriber", { p_id: subscriberId });
    const row = ((data ?? []) as { email: string; language: PublicNewsletterLanguage }[])[0];
    const sent = row
      ? await sendNewsletterWelcomeEmail({
          recipientEmail: row.email, locale: row.language,
          photoUrl: toPublicAppUrl("/brand/maria.jpg"), miaUrl: toPublicAppUrl("/brand/mia.png"), logoUrl: toPublicAppUrl("/brand/made2found-symbol.png"),
          ctaUrl: toPublicAppUrl("/me/profile"), unsubscribeUrl: publicUnsubscribeUrl(subscriberId, secret, row.language),
          privacyUrl: toPublicAppUrl("/datenschutz"), imprintUrl: toPublicAppUrl("/impressum"),
        })
      : { ok: false as const };
    if (!sent.ok) await client.rpc("release_public_newsletter_welcome", { p_id: subscriberId });
  } catch {
    await client.rpc("release_public_newsletter_welcome", { p_id: subscriberId }).then(() => undefined, () => undefined);
  }
  return true;
}

export async function unsubscribePublicNewsletter(subscriberId: string): Promise<boolean> {
  const client = serviceClient();
  if (!client) return false;
  const { data } = await client.rpc("unsubscribe_public_newsletter", { p_id: subscriberId });
  return data === true;
}
