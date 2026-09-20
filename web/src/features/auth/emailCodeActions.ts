"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeNextPath } from "@/features/auth/authRedirects";
import { PENDING_EMAIL_COOKIE } from "@/features/auth/pendingEmailCookie";
import { resolvePostAuthRedirectPath } from "@/features/auth/postAuthRedirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Anmelden mit dem Zahlencode aus der Mail.
 *
 * WARUM ES DEN WEG BRAUCHT, obwohl der Link funktioniert:
 *   Eine Seite, die auf dem Startbildschirm eines iPhones liegt, hat einen
 *   EIGENEN Datenspeicher - getrennt von Safari. Ein Link aus der Mail oeffnet
 *   immer den Standardbrowser; auf iOS laesst sich ein Link nicht auf eine
 *   Homescreen-App richten. Wer sich also IN der App anmelden will, kommt mit
 *   dem Link nicht hinein: Er landet in Safari und ist dort angemeldet,
 *   waehrend die App weiter fragt.
 *
 *   Beim Hinzufuegen zum Startbildschirm uebernimmt die App den Anmeldestand,
 *   den Safari gerade hat - deshalb faellt das erst auf, wenn die Sitzung
 *   einmal ablaeuft. Dann steckt man fest, ohne zu verstehen, warum.
 *
 *   Der Code loest das, weil er den Browser nicht braucht: abtippen, fertig.
 *
 * DIESER WEG OEFFNET KEINE NEUE TUER.
 *   Einen Code gibt es nur, wenn vorher eine Mail verschickt wurde - und dafuer
 *   gelten dieselben Bedingungen wie bisher (Beta-Code auf /start, bestehendes
 *   Konto auf /login). Der Code ist dasselbe Geheimnis wie der Link, nur in
 *   einer Form, die man abtippen kann.
 *
 * GEGEN ERRATEN schuetzt GoTrue selbst: Die Zahl der Pruefversuche ist je
 * Adresse begrenzt (rate_limit_verify). Sechs Stellen sind eine Million
 * Moeglichkeiten - mit einer Handvoll Versuchen je Fuenf-Minuten-Fenster ist
 * das kein Weg. Hier wird deshalb NICHT zusaetzlich gezaehlt: Ein zweiter
 * Zaehler an anderer Stelle waere ein zweites Regelwerk mit eigenen Luecken.
 */

export type EmailCodeResult = { ok: false; reason: "invalid" | "expired" | "failed" };

/** Menschen tippen Leerzeichen und Bindestriche mit. */
function normalizeToken(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export async function verifyEmailCodeAction(input: {
  email: string;
  token: string;
  nextPath: string;
}): Promise<EmailCodeResult> {
  const email = input.email.trim().toLowerCase();
  const token = normalizeToken(input.token);
  const nextPath = normalizeNextPath(input.nextPath);

  if (!email.includes("@") || token.length < 6) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = await createClient();
  // Der Server-Client schreibt die Sitzungs-Cookies - genau deshalb laeuft das
  // hier und nicht im Browser. Mit einem Client ohne Cookie-Anbindung waere
  // die Anmeldung nach dem naechsten Seitenaufruf wieder weg.
  //
  // type "email" deckt beide Faelle ab: eine Anmeldung an ein bestehendes
  // Konto und die Bestaetigung eines neuen. (Die frueheren Werte "magiclink"
  // und "signup" gibt es noch, sie trennen dieselbe Sache in zwei.)
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

  if (error) {
    const message = (error.message ?? "").toLowerCase();
    // Abgelaufen ist etwas anderes als falsch: Beim einen hilft ein neuer
    // Code, beim anderen genaueres Hinsehen. Eine gemeinsame Meldung schickt
    // die Haelfte der Menschen auf den falschen Weg.
    const expired = message.includes("expired") || error.status === 410;
    return { ok: false, reason: expired ? "expired" : "invalid" };
  }

  const store = await cookies();
  store.delete(PENDING_EMAIL_COOKIE);

  redirect(await resolvePostAuthRedirectPath(supabase, nextPath));
}
