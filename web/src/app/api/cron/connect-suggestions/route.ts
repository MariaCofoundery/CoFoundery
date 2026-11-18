import { NextRequest, NextResponse } from "next/server";

import { runProgramUpdateReminders } from "@/features/advisor/programUpdateReminders";
import { runCheckInReminders } from "@/features/checkIn/checkInReminders";
import { runOrgTaskDueNotices } from "@/features/advisor/teamraumNotifications";
import { runThanksNotifications } from "@/features/connect/thanks/thanksNotifications";
import { runNotificationDigests } from "@/features/notifications/notificationDigest";
import { runNewsletterSend } from "@/features/newsletter/newsletterSend";
import { runOnboardingReminders } from "@/features/onboarding/onboardingReminders";
import { runSuggestionNotifications } from "@/features/connect/suggestionNotifications";
import { runEcosystemEventImport } from "@/features/events/eventsImport";
import { closeStaleIntroductions } from "@/features/connect/introductions/closeStaleIntroductions";
import { recordCronHeartbeat } from "@/features/admin/cronHeartbeat";
import { sendCronFailureAlert } from "@/features/privacy/sendCronFailureAlert";

/**
 * Der taegliche Lauf: Vorschlaege suchen und darueber Bescheid geben.
 *
 * AUFGERUFEN VON VERCEL CRON (siehe `vercel.json`), das dabei
 * `Authorization: Bearer $CRON_SECRET` mitschickt. Ohne gesetztes
 * `CRON_SECRET` antwortet diese Route 503 statt zu arbeiten: Eine offene
 * Route, die fuer alle Menschen im Netzwerk Vorschlaege erzeugt und Mails
 * ausloest, waere aus dem Netz heraus anstossbar.
 *
 * WARUM GET: Vercel Cron ruft per GET auf. Das ist hier kein Verstoss gegen
 * "GET veraendert nichts" aus Bequemlichkeit, sondern eine Vorgabe von
 * aussen - und die Route ist durch das Geheimnis und die Wochengrenze von
 * drei Vorschlaegen gegen Wiederholung geschuetzt. Ein zweiter Aufruf in
 * derselben Minute findet nichts mehr zu stempeln.
 *
 * DIE ANTWORT NENNT NUR ZAHLEN. Wer benachrichtigt wurde, steht nicht darin:
 * Das Antwortprotokoll einer Zeitplanroute landet in Protokollen, die andere
 * Zwecke haben als diese Namen.
 */

// Der Lauf liest, erzeugt und sendet - da darf nichts zwischengespeichert
// werden.
export const dynamic = "force-dynamic";

/**
 * Wie viele Menschen ein Lauf hoechstens bedenkt.
 *
 * Die Zeitgrenze einer Funktion bei Vercel liegt bei Sekunden, und jeder
 * Mensch kostet eine Handvoll Abfragen plus die Zustellung. Wer nicht
 * drankommt, ist beim naechsten Lauf der aelteste und kommt dann zuerst -
 * `suggestions_checked_at` sorgt dafuer.
 */
const BATCH = 25;

function isAuthorized(request: NextRequest, secret: string) {
  const header = request.headers.get("authorization")?.trim() ?? "";
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (!secret) {
    // Nicht eingerichtet ist nicht kaputt: Der Lauf bleibt aus, bis das
    // Geheimnis gesetzt ist. Dasselbe Muster wie bei den VAPID-Schluesseln.
    return NextResponse.json({ ok: false, reason: "cron_secret_not_configured" }, { status: 503 });
  }

  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  // Check-in-Erinnerungen laufen im selben Lauf mit: Vercel Hobby erlaubt nur
  // zwei Zeitplaene, und beide sind belegt. Ein Fehler hier darf die
  // Vorschlaege nicht verhindern - und umgekehrt.
  const reminders = await runCheckInReminders().catch(() => ({ ok: false as const, reason: "prepare_failed" as const }));
  const programUpdates = await runProgramUpdateReminders().catch(() => ({ ok: false as const, reason: "prepare_failed" as const }));
  // Teamraum: heute faellige Aufgaben (20270316120000) - im selben Lauf, aus demselben Grund.
  const orgTasks = await runOrgTaskDueNotices().catch(() => ({ ok: false as const, reason: "prepare_failed" as const }));
  // Event-Kalender (20270323120000): eingeschaltete Quellen abrufen. Ein Fehler bei einer Quelle steht an der
  // Quelle (Admin), nicht hier - nur wenn der Lauf gar nicht starten kann, gilt er als fehlgeschlagen.
  const events = await runEcosystemEventImport().catch(() => ({ ok: false as const, reason: "list_failed" as const }));
  // Vorstellungen (20270418120000): was seit 14 Tagen unbeantwortet ist, schliesst sich still. Ein Fehler hier haelt den Lauf nicht auf.
  const introductions = await closeStaleIntroductions().catch(() => ({ ok: false as const }));
  // Erinnerungen nach dem Einstieg (20270421120000): nur mit ausdruecklicher Zustimmung, hoechstens zwei Mails je Person.
  const onboarding = await runOnboardingReminders().catch(() => ({ ok: false as const, reason: "prepare_failed" as const }));
  // Newsletter (20270428120000): faellige Ausgaben, ein Paket je Lauf. Ohne geplante Ausgabe passiert nichts.
  const newsletter = await runNewsletterSend().catch(() => ({ ok: false as const, reason: "send_failed" }));
  // Danks, deren Mail beim Danke nicht rausging (Mail-Dienst kurz weg): hier nachgeholt, hoechstens 7 Tage zurueck.
  await runThanksNotifications(50).catch(() => null);
  // Morgenuebersicht (20270510120000): eine Mail statt vieler fuer alle mit "gebuendelt" oder "ruhig". Zuletzt,
  // damit die Hinweise dieses Laufs (Aufgaben, Erinnerungen) schon drin stehen.
  const digests = await runNotificationDigests().catch(() => ({ ok: false as const, reason: "prepare_failed" as const }));
  const newsletterOk = newsletter.ok || ("reason" in newsletter && newsletter.reason === "not_configured");
  const result = await runSuggestionNotifications(BATCH);
  await recordCronHeartbeat("connect-suggestions", result.ok && reminders.ok && programUpdates.ok && orgTasks.ok && events.ok && onboarding.ok && newsletterOk && digests.ok);
  if (!result.ok || !reminders.ok || !programUpdates.ok || !orgTasks.ok || !events.ok || !onboarding.ok || !newsletterOk || !digests.ok) {
    const status = !result.ok && result.reason === "missing_service_role" ? 503 : 500;
    const body = { ...result, ok: false, checkInReminders: reminders, programUpdates, orgTasks, events, onboarding, newsletter, digests };
    await sendCronFailureAlert("connect-suggestions", status, body);
    return NextResponse.json(body, { status });
  }

  return NextResponse.json({ ...result, checkInReminders: reminders, programUpdates, orgTasks, events, introductions, onboarding, newsletter, digests }, { status: 200 });
}
