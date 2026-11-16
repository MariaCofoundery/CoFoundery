import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { newsletterToken } from "@/features/newsletter/newsletterToken";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";
import { sendNewsletterWelcomeEmail } from "@/lib/email/sendNewsletterWelcomeEmail";
import { getPublicAppOrigin, toPublicAppUrl } from "@/lib/publicAppOrigin";

/**
 * Die Willkommensmail direkt nach der Bestaetigung: genau einmal (das Vormerken in der Datenbank entscheidet), in der Sprache des Kontos.
 * Scheitert der Versand, wird das Vormerken zurueckgenommen. Die Zusage selbst bleibt davon unberuehrt; ein Fehler hier darf sie nie kippen.
 */
export async function sendWelcomeAfterConfirm(client: SupabaseClient, userId: string, secret: string): Promise<boolean> {
  try {
    const { data: claimed } = await client.rpc("claim_newsletter_welcome", { p_user_id: userId });
    if (claimed !== true) return false;
    const recipient = await getNotificationRecipient(userId);
    const origin = getPublicAppOrigin();
    const sent = recipient
      ? await sendNewsletterWelcomeEmail({
          recipientEmail: recipient.email,
          locale: recipient.locale,
          photoUrl: toPublicAppUrl("/brand/maria.jpg"),
          miaUrl: toPublicAppUrl("/brand/mia.png"),
          ctaUrl: toPublicAppUrl("/me/profile"),
          unsubscribeUrl: `${origin}/abmelden/newsletter?u=${encodeURIComponent(userId)}&t=${newsletterToken(userId, "unsubscribe", secret)}`,
          privacyUrl: toPublicAppUrl("/datenschutz"),
          imprintUrl: toPublicAppUrl("/impressum"),
        })
      : { ok: false as const };
    if (!sent.ok) {
      await client.rpc("release_newsletter_welcome", { p_user_id: userId });
      return false;
    }
    return true;
  } catch {
    await client.rpc("release_newsletter_welcome", { p_user_id: userId }).then(() => undefined, () => undefined);
    return false;
  }
}
