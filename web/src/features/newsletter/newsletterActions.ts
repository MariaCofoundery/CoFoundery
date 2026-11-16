"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeSafeInternalPath } from "@/features/auth/safeInternalPath";
import { newsletterToken } from "@/features/newsletter/newsletterToken";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";
import { sendNewsletterConfirmEmail } from "@/lib/email/sendNewsletterConfirmEmail";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { createClient } from "@/lib/supabase/server";

const SOURCES = ["welcome", "settings", "dashboard"] as const;

function backTo(formData: FormData, key: string) {
  const path = normalizeSafeInternalPath(String(formData.get("return_to") ?? ""), "/dashboard");
  return `${path}${path.includes("?") ? "&" : "?"}newsletter=${key}`;
}

/**
 * "Ja, ich moechte den Newsletter": legt die Anfrage an und schickt die Bestaetigungs-Mail. Erst der Klick darin macht daraus eine Zustimmung.
 */
export async function requestNewsletterAction(formData: FormData) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login");
  const sourceRaw = String(formData.get("source") ?? "settings");
  const source = (SOURCES as readonly string[]).includes(sourceRaw) ? sourceRaw : "settings";
  const { data: shouldSend, error } = await client.rpc("request_newsletter", { p_source: source });
  if (error) redirect(backTo(formData, "error"));
  if (shouldSend === true) {
    const secret = process.env.CRON_SECRET?.trim() ?? "";
    const recipient = await getNotificationRecipient(user.id);
    if (!secret || !recipient) redirect(backTo(formData, "error"));
    const { data: core } = await client.from("person_core").select("display_name").eq("user_id", user.id).maybeSingle();
    const name = ((core?.display_name as string | null) ?? "").trim().split(/\s+/)[0] || null;
    const confirmUrl = `${getPublicAppOrigin()}/newsletter/bestaetigen?u=${encodeURIComponent(user.id)}&t=${newsletterToken(user.id, "confirm", secret)}`;
    const sent = await sendNewsletterConfirmEmail({ recipientEmail: recipient.email, name, confirmUrl, locale: recipient.locale });
    if (!sent.ok) redirect(backTo(formData, "error"));
  }
  revalidatePath("/account");
  redirect(backTo(formData, "asked"));
}

/** Aus den Einstellungen abmelden: sofort, ohne Rueckfrage. */
export async function stopMyNewsletterAction(formData: FormData) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login");
  await client.rpc("stop_my_newsletter");
  revalidatePath("/account");
  redirect(backTo(formData, "stopped"));
}
