"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NOTIFICATION_KINDS, isNotificationKind } from "@/features/account/notificationKinds";
import { LOCALE_COOKIE_NAME, SUPPORTED_LOCALES, normalizeLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Welche Mailarten jemand bekommen moechte.
 *
 * Gespeichert werden ABBESTELLUNGEN, nicht Zustimmungen - deshalb wird hier
 * aus "was ist angehakt" das Gegenteil gebildet. Der Grund steht an der
 * Tabelle: Eine spaeter dazukommende Mailart ist damit automatisch an, statt
 * fuer alle Bestandsleute stumm zu bleiben.
 *
 * Erst loeschen, dann einfuegen. Andersherum blieben Abbestellungen stehen,
 * die gerade abgewaehlt wurden.
 */
export async function saveNotificationSettingsAction(formData: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect("/login?next=/account");

  const wanted = new Set(
    formData.getAll("notification").filter((value) => isNotificationKind(String(value))).map(String)
  );
  const optOuts = NOTIFICATION_KINDS.filter((entry) => !wanted.has(entry.kind)).map((entry) => ({
    user_id: user.id,
    kind: entry.kind,
  }));

  const { error: deleteError } = await client
    .from("notification_opt_outs")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) redirect("/account?status=notifications_failed#post");

  if (optOuts.length > 0) {
    const { error } = await client.from("notification_opt_outs").insert(optOuts);
    if (error) redirect("/account?status=notifications_failed#post");
  }

  revalidatePath("/account");
  redirect("/account?status=notifications_saved#post");
}

/**
 * Die Sprache.
 *
 * Geschrieben wird an ZWEI Stellen, und beide braucht es:
 *
 *   Das Cookie entscheidet, was die Oberflaeche beim naechsten Aufbau zeigt.
 *   Es bei jeder Anfrage aus der Datenbank zu holen waere eine Abfrage pro
 *   Seitenaufruf fuer eine Angabe, die sich fast nie aendert.
 *
 *   person_core.locale entscheidet, in welcher Sprache MAILS an diese Person
 *   gehen. Dort gibt es keine Anfrage, aus der sich etwas ableiten liesse -
 *   genau daher kam der Fehler, dass Benachrichtigungen in der Sprache der
 *   ausloesenden Person ankamen.
 */
export async function saveAccountLocaleAction(formData: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect("/login?next=/account");

  const raw = String(formData.get("locale") ?? "");
  if (!SUPPORTED_LOCALES.includes(raw as (typeof SUPPORTED_LOCALES)[number])) {
    redirect("/account?status=locale_failed#sprache");
  }
  const locale = normalizeLocale(raw);

  const { error } = await client.from("person_core").update({ locale }).eq("user_id", user.id);
  if (error) redirect("/account?status=locale_failed#sprache");

  (await cookies()).set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/account", "layout");
  redirect("/account?status=locale_saved#sprache");
}
