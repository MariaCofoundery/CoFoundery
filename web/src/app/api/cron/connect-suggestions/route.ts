import { NextRequest, NextResponse } from "next/server";

import { runSuggestionNotifications } from "@/features/connect/suggestionNotifications";

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

  const result = await runSuggestionNotifications(BATCH);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.reason === "missing_service_role" ? 503 : 500 });
  }

  return NextResponse.json(result, { status: 200 });
}
