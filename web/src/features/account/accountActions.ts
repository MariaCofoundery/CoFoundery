"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { createClient } from "@/lib/supabase/server";

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase().slice(0, 254);
}

/**
 * Sehr bewusst keine strenge Pruefung: Was eine gueltige Adresse ist,
 * entscheidet der Mailserver, nicht ein regulaerer Ausdruck. Hier faellt nur
 * durch, was offensichtlich keine ist - alles andere klaert der
 * Bestaetigungslink, der ankommen muss oder eben nicht.
 */
function looksLikeEmail(value: string) {
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value);
}

/**
 * Die Mailadresse wechseln.
 *
 * WARUM DAS EINE SICHERHEITSHANDLUNG IST:
 *   Angemeldet wird ausschliesslich per Magic Link. Die Adresse ist damit
 *   nicht ein Kontaktweg neben anderen, sondern DER Schluessel zum Konto. Wer
 *   sie aendern kann, kann das Konto uebernehmen.
 *
 *   Deshalb wird hier nichts sofort umgestellt. Supabase verschickt bei
 *   aktivierter Einstellung "Secure email change" einen Link an BEIDE
 *   Adressen, und erst wenn beide bestaetigt sind, gilt die neue. Ein kurz
 *   unbeaufsichtigter Bildschirm reicht dann nicht.
 *
 *   Die Bestaetigungslinks landen auf /auth/confirm, das verifyOtp mit dem
 *   mitgelieferten Typ aufruft - `email_change` ist einer davon. Es braucht
 *   dafuer keine eigene Route.
 */
export async function requestEmailChangeAction(formData: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect("/login?next=/account");

  const nextEmail = normalizeEmail(formData.get("email"));
  const back = (status: string) => `/account?status=${status}#anmeldung`;

  if (!looksLikeEmail(nextEmail)) {
    redirect(back("email_invalid"));
  }
  if (nextEmail === (user.email ?? "").trim().toLowerCase()) {
    redirect(back("email_unchanged"));
  }

  const { error } = await client.auth.updateUser(
    { email: nextEmail },
    { emailRedirectTo: `${getPublicAppOrigin()}/auth/confirm?next=%2Faccount` }
  );

  if (error) {
    // Die Meldung von Supabase wird NICHT durchgereicht. "Email address
    // already registered" waere sonst eine Auskunft darueber, wer hier ein
    // Konto hat - an jede Person, die Adressen durchprobiert.
    redirect(back("email_failed"));
  }

  revalidatePath("/account");
  redirect(back("email_sent"));
}

/**
 * Auf allen Geraeten abmelden.
 *
 * Bei Magic-Link-Anmeldung liegt der Schluessel im Postfach. Kommt ein Geraet
 * weg oder ist ein Postfach kompromittiert, gab es bisher keinen Weg, laufende
 * Sitzungen zu beenden - man konnte sich nur hier abmelden, waehrend die
 * Sitzung auf dem verlorenen Geraet weiterlief.
 *
 * `scope: "global"` zieht alle Refresh-Tokens der Person ein, auch das eigene.
 * Deshalb geht es danach zum Login - alles andere waere eine Seite, die beim
 * naechsten Klick auseinanderfaellt.
 */
export async function signOutEverywhereAction() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect("/login");

  await client.auth.signOut({ scope: "global" });
  redirect("/login?status=signed_out_everywhere");
}
